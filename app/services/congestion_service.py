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
    ElevatorMenuResponse,
    ElevatorResponse,
    FloorStatusResponse,
    RouteRecommendationResponse,
    ScheduleResponse,
)
from app.services.data_store import data_store


class CongestionService:
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
