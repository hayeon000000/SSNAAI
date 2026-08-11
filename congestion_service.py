from datetime import datetime, timedelta

from app.config import settings
from app.models.domain import (
    CongestionLevel,
    LEVEL_COLORS,
    LEVEL_LABELS,
    RouteMode,
    ScheduleEntry,
    level_from_score,
)
from app.models.schemas import (
    BuildingCongestionResponse,
    BuildingDetailResponse,
    CampusMapResponse,
    DataSummaryResponse,
    RouteBuildingCongestionResponse,
    RouteRecommendationResponse,
    RouteOptionResponse,
    ElevatorMenuResponse,
    ElevatorResponse,
    FloorStatusResponse,
    ScheduleResponse,
)
from app.services.data_store import data_store


class CongestionService:
    # 발표용 목업 설정: 센서가 실제로는 수정관(SOOJUNG) 한 곳뿐이지만, 아래 건물들도
    # 같은 센서 값을 그대로 써서 "같은 시간엔 다 같은 혼잡도"로 보이게 한다.
    # (원래는 SOOJUNG만 SENSOR_CSV, 나머지는 시간표 기반 SCHEDULE_ESTIMATE였음)
    SENSOR_MIRRORED_BUILDINGS = {"SOOJUNG", "STUDENT_HALL", "NANHYANG", "SUNGSHIN"}

    _campus_graph = {
        "STUDENT_HALL": ["NANHYANG"],
        "NANHYANG": ["STUDENT_HALL", "SUNGSHIN", "SOOJUNG"],
        "SUNGSHIN": ["NANHYANG", "SOOJUNG"],
        "SOOJUNG": ["NANHYANG", "SUNGSHIN"],
    }

    def resolve_base_time(self, at: datetime | None) -> datetime:
        return at or data_store.latest_sensor_time() or datetime.now()

    def campus_map(self, at: datetime | None = None) -> CampusMapResponse:
        base_time = self.resolve_base_time(at)
        buildings = [
            self.building_congestion(building_id, base_time)
            for building_id in data_store.buildings
            if building_id != "UNKNOWN"
        ]
        return CampusMapResponse(base_time=base_time, buildings=buildings)

    def building_detail(self, building_id: str, at: datetime | None = None) -> BuildingDetailResponse:
        base_time = self.resolve_base_time(at)
        congestion = self.building_congestion(building_id, base_time)
        nearby = [self._schedule_response(item) for item in data_store.nearby_classes(building_id, base_time)]
        message = (
            "혼잡도가 높거나 10분 후 혼잡이 예상됩니다. 가까운 층은 계단 이용을 추천합니다."
            if congestion.recommend_stairs
            else "현재는 엘리베이터 이용이 비교적 원활합니다."
        )
        return BuildingDetailResponse(congestion=congestion, nearby_classes=nearby, recommendation_message=message)


    def elevators(self, building_id: str, at: datetime | None = None) -> ElevatorMenuResponse:
        base_time = self.resolve_base_time(at)
        building = data_store.get_building(building_id)
        congestion = self.building_congestion(building_id, base_time)
        elevators = [
            self._elevator_response(building_id, index, base_time, congestion)
            for index in range(1, 3 if building.max_floor >= 8 else 2)
        ]
        return ElevatorMenuResponse(
            building_id=building.id,
            building_name=building.name,
            base_time=base_time,
            elevators=elevators,
        )

    def building_congestion(self, building_id: str, base_time: datetime) -> BuildingCongestionResponse:
        building = data_store.get_building(building_id)
        sensor = data_store.latest_sensor_at(base_time)
        sensor_score = sensor.score if sensor else 55.0
        default_sensor_building = building.id in self.SENSOR_MIRRORED_BUILDINGS

        current_pressure = data_store.schedule_pressure(building.id, base_time, window_minutes=10)
        predicted_pressure = data_store.schedule_pressure(building.id, base_time + timedelta(minutes=10), window_minutes=10)
        default_sensor_building = building_id == settings.default_building_id

        current_pressure = data_store.schedule_pressure(building_id, base_time, window_minutes=10)
        predicted_pressure = data_store.schedule_pressure(building_id, base_time + timedelta(minutes=10), window_minutes=10)

        if default_sensor_building:
            current_score = sensor_score
            source = "SENSOR_CSV"
        else:
            current_score = self._clamp(sensor_score * 0.35 + self._pressure_score(current_pressure))
            source = "SCHEDULE_ESTIMATE"

        predicted_score = self._clamp(
            current_score
            + self._sensor_trend(base_time)
            + (predicted_pressure - current_pressure) * 5.0
            + predicted_pressure * 1.5
        )

        current_level = level_from_score(current_score)
        predicted_level = level_from_score(predicted_score)
        wait_seconds = self._expected_wait_seconds(max(current_score, predicted_score), max(current_pressure, predicted_pressure))
        recommend_stairs = predicted_score >= 70 or wait_seconds >= 240

        return BuildingCongestionResponse(
            building_id=building.id,
            building_name=building.name,
            latitude=building.latitude,
            longitude=building.longitude,
            current_level=current_level.value,
            current_label=LEVEL_LABELS[current_level],
            current_score=round(current_score, 1),
            predicted_level_after_10_min=predicted_level.value,
            predicted_label_after_10_min=LEVEL_LABELS[predicted_level],
            predicted_score_after_10_min=round(predicted_score, 1),
            expected_wait_seconds=wait_seconds,
            schedule_pressure=current_pressure,
            color=LEVEL_COLORS[predicted_level],
            data_imputed=bool(sensor.imputed) if sensor else True,
            source=source,
            recommend_stairs=recommend_stairs,
        )

    def route_recommendation(
        self,
        from_building_id: str,
        from_floor: int,
        to_building_id: str,
        to_floor: int,
        mode: RouteMode | None,
        at: datetime | None = None,
    ) -> RouteRecommendationResponse:
        source_building = data_store.get_building(from_building_id)
        target_building = data_store.get_building(to_building_id)
        base_time = self.resolve_base_time(at)
        target = self.building_congestion(target_building.id, base_time)
        route_options = self._campus_route_options(source_building.id, target_building.id, base_time)
        selected_route = route_options[0] if route_options else None
        data_store.get_building(from_building_id)
        target = self.building_congestion(to_building_id, self.resolve_base_time(at))
        requested = mode or RouteMode.STAIRS_AND_ELEVATOR
        floor_gap = abs(to_floor - from_floor)
        high = target.current_score >= 70 or target.predicted_score_after_10_min >= 70

        if requested in {RouteMode.ELEVATOR_ONLY, RouteMode.STAIRS_ONLY}:
            recommended = requested
        elif high and floor_gap <= 5:
            recommended = RouteMode.STAIRS_ONLY
        elif high:
            recommended = RouteMode.STAIRS_AND_ELEVATOR
        else:
            recommended = RouteMode.ELEVATOR_ONLY

        stair_floors = {
            RouteMode.STAIRS_ONLY: floor_gap,
            RouteMode.STAIRS_AND_ELEVATOR: min(3, floor_gap),
            RouteMode.ELEVATOR_ONLY: 0,
        }[recommended]
        wait_seconds = 0 if recommended == RouteMode.STAIRS_ONLY else target.expected_wait_seconds
        inter_building = source_building.id != target_building.id
        campus_walk_minutes = selected_route.walk_minutes if selected_route else (8 if inter_building else 0)
        estimated_minutes = self._estimate_minutes(recommended, floor_gap, wait_seconds, campus_walk_minutes)
        reward_points = stair_floors * 10
        steps = []
        if selected_route and inter_building:
            steps.extend(selected_route.steps)
        elif inter_building:
            steps.append(self._movement_step(source_building.name, target_building.name))
        estimated_minutes = self._estimate_minutes(recommended, floor_gap, wait_seconds, from_building_id != to_building_id)
        reward_points = stair_floors * 10
        steps = []
        if from_building_id != to_building_id:
            steps.append(f"{from_building_id}에서 {to_building_id}로 이동")
        if recommended == RouteMode.ELEVATOR_ONLY:
            steps.append(f"엘리베이터를 이용해 {to_floor}층으로 이동")
        elif recommended == RouteMode.STAIRS_ONLY:
            steps.append(f"{from_floor}층에서 {to_floor}층까지 계단 이용")
        else:
            steps.append(f"처음 {stair_floors}개 층은 계단 이용")
            steps.append("남은 구간은 엘리베이터 이용")

        return RouteRecommendationResponse(
            requested_mode=requested,
            recommended_mode=recommended,
            estimated_minutes=estimated_minutes,
            expected_wait_seconds=wait_seconds,
            reward_points=reward_points,
            stairs_recommended=recommended != RouteMode.ELEVATOR_ONLY,
            message=(
                f"혼잡도가 높아 계단 이용을 추천합니다. 예상 보상 {reward_points}점을 받을 수 있습니다."
                if reward_points > 0
                else "현재는 엘리베이터 이용이 적절합니다."
            ),
            steps=steps,
            route_buildings=selected_route.building_ids if selected_route else [source_building.id, target_building.id],
            route_building_names=selected_route.building_names if selected_route else [source_building.name, target_building.name],
            route_options=route_options,
        )

    def search_schedules(self, keyword: str | None, building_id: str | None, limit: int) -> list[ScheduleResponse]:
        return [self._schedule_response(item) for item in data_store.search_schedules(keyword, building_id, limit)]

    def data_summary(self) -> DataSummaryResponse:
        sensors = data_store.sensors
        return DataSummaryResponse(
            sensor_rows=len(sensors),
            imputed_rows=sum(1 for item in sensors if item.imputed),
            schedule_rows=len(data_store.schedules),
            first_sensor_time=data_store.first_sensor_time(),
            latest_sensor_time=data_store.latest_sensor_time(),
        )

    def _elevator_response(
        self,
        building_id: str,
        index: int,
        base_time: datetime,
        congestion: BuildingCongestionResponse,
    ) -> ElevatorResponse:
        building = data_store.get_building(building_id)
        floors = [
            self._floor_status(building_id, floor, base_time, congestion)
            for floor in range(building.min_floor, building.max_floor + 1)
        ]
        return ElevatorResponse(
            elevator_id=f"{building_id}-E{index}",
            elevator_name=f"{building.name} {index}호기",
            current_label=congestion.current_label,
            current_score=congestion.current_score,
            predicted_score_after_10_min=congestion.predicted_score_after_10_min,
            expected_wait_seconds=congestion.expected_wait_seconds,
            floors=floors,
        )

    def _floor_status(
        self,
        building_id: str,
        floor: int,
        base_time: datetime,
        congestion: BuildingCongestionResponse,
    ) -> FloorStatusResponse:
        pressure = data_store.schedule_pressure(building_id, base_time, window_minutes=10, floor=floor)
        current_score = self._clamp(congestion.current_score + pressure * 8.0 + max(0, floor - 1) * 1.2)
        predicted_score = self._clamp(congestion.predicted_score_after_10_min + pressure * 4.0)
        wait_seconds = self._expected_wait_seconds(max(current_score, predicted_score), pressure)
        level = level_from_score(current_score)
        return FloorStatusResponse(
            floor=floor,
            waiting_count=max(0, round(current_score / 15.0) + pressure),
            current_label=LEVEL_LABELS[level],
            current_score=round(current_score, 1),
            predicted_score_after_10_min=round(predicted_score, 1),
            expected_wait_seconds=wait_seconds,
            schedule_pressure=pressure,
            data_imputed=congestion.data_imputed,
            recommend_stairs=predicted_score >= 70 or wait_seconds >= 240,
        )

    def _schedule_response(self, item: ScheduleEntry) -> ScheduleResponse:
        return ScheduleResponse(
            semester=item.semester,
            category=item.category,
            subject=item.subject,
            day=item.day,
            day_of_week=item.day_of_week,
            start_time=item.start_time,
            end_time=item.end_time,
            room=item.room,
            building_id=item.building_id,
            building_name=item.building_name,
            floor=item.floor,
        )

    def _sensor_trend(self, base_time: datetime) -> float:
        recent = data_store.recent_sensors(base_time, minutes=20)
        if len(recent) < 2:
            return 0.0
        return max(-12.0, min(12.0, (recent[-1].score - recent[0].score) * 0.4))

    def _pressure_score(self, pressure: int) -> float:
        return min(80.0, 12.0 + pressure * 7.0)

    def _expected_wait_seconds(self, score: float, pressure: int) -> int:
        return max(20, round(30 + score * 3.2 + pressure * 18.0))

    def _estimate_minutes(self, mode: RouteMode, floor_gap: int, wait_seconds: int, campus_walk_minutes: int) -> int:
        stair_minutes = round(max(1, floor_gap) * 0.8)
        elevator_minutes = round(wait_seconds / 60.0 + max(1, floor_gap) * 0.25 + 1)
        if mode == RouteMode.STAIRS_ONLY:
            return campus_walk_minutes + stair_minutes
        if mode == RouteMode.STAIRS_AND_ELEVATOR:
            return campus_walk_minutes + min(3, stair_minutes) + elevator_minutes
        return campus_walk_minutes + elevator_minutes

    def _campus_route_options(self, source_id: str, target_id: str, base_time: datetime) -> list[RouteOptionResponse]:
        if source_id == target_id:
            building = data_store.get_building(source_id)
            return [
                RouteOptionResponse(
                    building_ids=[building.id],
                    building_names=[building.name],
                    walk_minutes=0,
                    expected_wait_seconds=0,
                    congestion_score=0.0,
                    recommended=True,
                    steps=[],
                    congestions=[],
                )
            ]

        paths = self._find_building_paths(source_id, target_id)
        if not paths:
            paths = [[source_id, target_id]]

        options: list[RouteOptionResponse] = []
        for path in paths:
            buildings = [data_store.get_building(building_id) for building_id in path]
            congestions = [
                self._route_building_congestion(self.building_congestion(building.id, base_time))
                for building in buildings[1:]
            ]
            walk_minutes = self._campus_walk_minutes(path)
            expected_wait_seconds = max((item.expected_wait_seconds for item in congestions), default=0)
            congestion_score = max((item.predicted_score_after_10_min for item in congestions), default=0.0)
            options.append(
                RouteOptionResponse(
                    building_ids=[building.id for building in buildings],
                    building_names=[building.name for building in buildings],
                    walk_minutes=walk_minutes,
                    expected_wait_seconds=expected_wait_seconds,
                    congestion_score=round(congestion_score, 1),
                    recommended=False,
                    steps=[self._movement_step(buildings[index].name, buildings[index + 1].name) for index in range(len(buildings) - 1)],
                    congestions=congestions,
                )
            )

        options.sort(key=lambda item: (item.walk_minutes + item.expected_wait_seconds / 60.0 + item.congestion_score / 20.0, len(item.building_ids)))
        if options:
            options[0].recommended = True
        return options

    def _find_building_paths(self, source_id: str, target_id: str) -> list[list[str]]:
        paths: list[list[str]] = []

        def walk(current_id: str, path: list[str]) -> None:
            if current_id == target_id:
                paths.append(path)
                return
            if len(path) >= 5:
                return
            for next_id in self._campus_graph.get(current_id, []):
                if next_id in path:
                    continue
                walk(next_id, path + [next_id])

        walk(source_id, [source_id])
        return paths

    def _campus_walk_minutes(self, building_ids: list[str]) -> int:
        if len(building_ids) <= 1:
            return 0
        return sum(
            self._campus_segment_minutes(building_ids[index], building_ids[index + 1])
            for index in range(len(building_ids) - 1)
        )

    def _campus_segment_minutes(self, source_id: str, target_id: str) -> int:
        segment = frozenset({source_id, target_id})
        minutes_by_segment = {
            frozenset({"STUDENT_HALL", "NANHYANG"}): 4,
            frozenset({"NANHYANG", "SUNGSHIN"}): 4,
            frozenset({"NANHYANG", "SOOJUNG"}): 4,
            frozenset({"SUNGSHIN", "SOOJUNG"}): 3,
        }
        return minutes_by_segment.get(segment, 8)

    def _route_building_congestion(self, congestion: BuildingCongestionResponse) -> RouteBuildingCongestionResponse:
        return RouteBuildingCongestionResponse(
            building_id=congestion.building_id,
            building_name=congestion.building_name,
            current_label=congestion.current_label,
            current_score=congestion.current_score,
            predicted_score_after_10_min=congestion.predicted_score_after_10_min,
            expected_wait_seconds=congestion.expected_wait_seconds,
            recommend_stairs=congestion.recommend_stairs,
        )

    def _movement_step(self, source_name: str, target_name: str) -> str:
        return f"{source_name}에서 {target_name}{self._direction_particle(target_name)} 이동"

    def _direction_particle(self, value: str) -> str:
        if not value:
            return "로"
        code = ord(value[-1])
        if not 0xAC00 <= code <= 0xD7A3:
            return "로"
        final_consonant = (code - 0xAC00) % 28
        return "로" if final_consonant in {0, 8} else "으로"
    def _estimate_minutes(self, mode: RouteMode, floor_gap: int, wait_seconds: int, inter_building: bool) -> int:
        move_minutes = 8 if inter_building else 0
        stair_minutes = round(max(1, floor_gap) * 0.8)
        elevator_minutes = round(wait_seconds / 60.0 + max(1, floor_gap) * 0.25 + 1)
        if mode == RouteMode.STAIRS_ONLY:
            return move_minutes + stair_minutes
        if mode == RouteMode.STAIRS_AND_ELEVATOR:
            return move_minutes + min(3, stair_minutes) + elevator_minutes
        return move_minutes + elevator_minutes

    def _clamp(self, value: float) -> float:
        return max(0.0, min(100.0, value))


congestion_service = CongestionService()
