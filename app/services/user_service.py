from datetime import datetime, time

from app.config import settings
from app.models.domain import RouteMode, UserProfile, UserTimetableEntry
from app.models.schemas import (
    FavoritePlaceRequest,
    LoginRequest,
    LoginResponse,
    RewardResponse,
    RouteRecommendationResponse,
    StairUseRequest,
    TimetableRequest,
    TimetableResponse,
    UserProfileResponse,
)
from app.services.congestion_service import congestion_service
from app.services.data_store import data_store
from app.services.db_service import database


class UserService:
    def login(self, request: LoginRequest) -> LoginResponse:
        student_id = self._normalize_student_id(request.student_id)
        with database.connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO users (student_id)
                VALUES (?)
                """,
                (student_id,),
            )
        user = self.require_user(student_id)
        return LoginResponse(student_id=user.student_id, rewards=self._reward_response(user))

    def profile(self, student_id: str) -> UserProfileResponse:
        return self._profile_response(self.require_user(student_id))

    def require_user(self, student_id: str) -> UserProfile:
        normalized = self._normalize_student_id(student_id)
        user = self._load_user(normalized)
        if not user:
            raise ValueError(f"로그인되지 않은 학번입니다: {normalized}")
        return user

    def add_timetable(self, student_id: str, request: TimetableRequest) -> UserProfileResponse:
        user = self.require_user(student_id)
        building = data_store.get_building(request.building_id) if request.building_id else data_store.building_from_room(request.room)
        building_id = building.id
        floor = request.floor if request.floor is not None else data_store.floor_from_room(request.room)

        with database.connect() as connection:
            connection.execute(
                """
                INSERT INTO user_timetable (
                    student_id, subject, day_of_week, start_time, end_time,
                    building_id, room, floor, preferred_route_mode
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user.student_id,
                    request.subject,
                    data_store.day_to_weekday(request.day),
                    request.start_time.isoformat(),
                    request.end_time.isoformat(),
                    building_id,
                    request.room,
                    floor,
                    request.preferred_route_mode.value,
                ),
            )
        return self.profile(user.student_id)

    def add_favorite(self, student_id: str, request: FavoritePlaceRequest) -> UserProfileResponse:
        user = self.require_user(student_id)
        with database.connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO favorite_places (student_id, place_id)
                VALUES (?, ?)
                """,
                (user.student_id, request.place_id),
            )
        return self.profile(user.student_id)

    def record_stair_use(self, student_id: str, request: StairUseRequest) -> RewardResponse:
        user = self.require_user(student_id)
        floors = max(1, request.floors)
        stair_use_floors = user.stair_use_floors + floors
        reward_points = user.reward_points + floors * 10
        suyong_health = min(100, user.suyong_health + floors * 2)

        with database.connect() as connection:
            connection.execute(
                """
                INSERT INTO stair_uses (student_id, floors)
                VALUES (?, ?)
                """,
                (user.student_id, floors),
            )
            connection.execute(
                """
                UPDATE users
                SET stair_use_floors = ?,
                    reward_points = ?,
                    suyong_health = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE student_id = ?
                """,
                (stair_use_floors, reward_points, suyong_health, user.student_id),
            )
        return self.rewards(user.student_id)

    def rewards(self, student_id: str) -> RewardResponse:
        return self._reward_response(self.require_user(student_id))

    def next_route(self, student_id: str, at: datetime | None) -> RouteRecommendationResponse:
        user = self.require_user(student_id)
        base_time = congestion_service.resolve_base_time(at)
        candidates = [
            item
            for item in user.timetable
            if item.day_of_week == base_time.weekday() and item.start_time >= base_time.time()
        ]
        if not candidates:
            raise ValueError("오늘 남은 시간표가 없습니다.")
        next_class = sorted(candidates, key=lambda item: item.start_time)[0]
        return congestion_service.route_recommendation(
            from_building_id=settings.default_building_id,
            from_floor=settings.default_floor,
            to_building_id=next_class.building_id,
            to_floor=next_class.floor or 1,
            mode=next_class.preferred_route_mode or RouteMode.STAIRS_AND_ELEVATOR,
            at=base_time,
        )

    def _load_user(self, student_id: str) -> UserProfile | None:
        with database.connect() as connection:
            user_row = connection.execute(
                """
                SELECT student_id, stair_use_floors, reward_points, suyong_health
                FROM users
                WHERE student_id = ?
                """,
                (student_id,),
            ).fetchone()
            if not user_row:
                return None

            timetable_rows = connection.execute(
                """
                SELECT subject, day_of_week, start_time, end_time, building_id,
                       room, floor, preferred_route_mode
                FROM user_timetable
                WHERE student_id = ?
                ORDER BY day_of_week, start_time
                """,
                (student_id,),
            ).fetchall()
            favorite_rows = connection.execute(
                """
                SELECT place_id
                FROM favorite_places
                WHERE student_id = ?
                ORDER BY place_id
                """,
                (student_id,),
            ).fetchall()

        return UserProfile(
            student_id=user_row["student_id"],
            timetable=[
                UserTimetableEntry(
                    subject=row["subject"],
                    day_of_week=int(row["day_of_week"]),
                    start_time=self._parse_time(row["start_time"]),
                    end_time=self._parse_time(row["end_time"]),
                    building_id=row["building_id"],
                    room=row["room"],
                    floor=row["floor"],
                    preferred_route_mode=RouteMode(row["preferred_route_mode"]),
                )
                for row in timetable_rows
            ],
            favorite_places={row["place_id"] for row in favorite_rows},
            stair_use_floors=int(user_row["stair_use_floors"]),
            reward_points=int(user_row["reward_points"]),
            suyong_health=int(user_row["suyong_health"]),
        )

    def _profile_response(self, user: UserProfile) -> UserProfileResponse:
        return UserProfileResponse(
            student_id=user.student_id,
            timetable=[
                TimetableResponse(
                    subject=item.subject,
                    day_of_week=item.day_of_week,
                    start_time=item.start_time,
                    end_time=item.end_time,
                    building_id=item.building_id,
                    room=item.room,
                    floor=item.floor,
                    preferred_route_mode=item.preferred_route_mode,
                )
                for item in user.timetable
            ],
            favorite_places=user.favorite_places,
            rewards=self._reward_response(user),
        )

    def _reward_response(self, user: UserProfile) -> RewardResponse:
        return RewardResponse(
            stair_use_floors=user.stair_use_floors,
            reward_points=user.reward_points,
            suyong_health=user.suyong_health,
            badges=user.badges(),
        )

    def _normalize_student_id(self, student_id: str) -> str:
        normalized = student_id.strip()
        if not normalized:
            raise ValueError("학번이 비어 있습니다.")
        return normalized

    def _parse_time(self, value: str) -> time:
        return time.fromisoformat(value)


user_service = UserService()
