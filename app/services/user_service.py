from datetime import datetime

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


class UserService:
    def __init__(self) -> None:
        self._users: dict[str, UserProfile] = {}

    def login(self, request: LoginRequest) -> LoginResponse:
        student_id = self._normalize_student_id(request.student_id)
        user = self._users.setdefault(
            student_id,
            UserProfile(student_id=student_id, timetable=[], favorite_places=set()),
        )
        return LoginResponse(student_id=user.student_id, rewards=self._reward_response(user))

    def profile(self, student_id: str) -> UserProfileResponse:
        return self._profile_response(self.require_user(student_id))

    def require_user(self, student_id: str) -> UserProfile:
        normalized = self._normalize_student_id(student_id)
        user = self._users.get(normalized)
        if not user:
            raise ValueError(f"로그인되지 않은 학번입니다: {normalized}")
        return user

    def add_timetable(self, student_id: str, request: TimetableRequest) -> UserProfileResponse:
        user = self.require_user(student_id)
        building_id = request.building_id or data_store.building_from_room(request.room).id
        floor = request.floor if request.floor is not None else data_store.floor_from_room(request.room)
        entry = UserTimetableEntry(
            subject=request.subject,
            day_of_week=data_store.day_to_weekday(request.day),
            start_time=request.start_time,
            end_time=request.end_time,
            building_id=building_id,
            room=request.room,
            floor=floor,
            preferred_route_mode=request.preferred_route_mode,
        )
        user.timetable.append(entry)
        return self._profile_response(user)

    def add_favorite(self, student_id: str, request: FavoritePlaceRequest) -> UserProfileResponse:
        user = self.require_user(student_id)
        user.favorite_places.add(request.place_id)
        return self._profile_response(user)

    def record_stair_use(self, student_id: str, request: StairUseRequest) -> RewardResponse:
        user = self.require_user(student_id)
        user.record_stair_use(request.floors)
        return self._reward_response(user)

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


user_service = UserService()
