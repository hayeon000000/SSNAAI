from datetime import datetime

from fastapi import APIRouter, Query

from app.models.schemas import (
    FavoritePlaceRequest,
    LoginRequest,
    LoginResponse,
    RewardResponse,
    RouteRecommendationResponse,
    StairUseRequest,
    TimetableRequest,
    UserProfileResponse,
)
from app.services.user_service import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    return user_service.login(request)


@router.get("/{student_id}", response_model=UserProfileResponse)
def profile(student_id: str):
    return user_service.profile(student_id)


@router.post("/{student_id}/timetable", response_model=UserProfileResponse)
def add_timetable(student_id: str, request: TimetableRequest):
    return user_service.add_timetable(student_id, request)


@router.post("/{student_id}/favorites", response_model=UserProfileResponse)
def add_favorite(student_id: str, request: FavoritePlaceRequest):
    return user_service.add_favorite(student_id, request)


@router.post("/{student_id}/stair-uses", response_model=RewardResponse)
def record_stair_use(student_id: str, request: StairUseRequest):
    return user_service.record_stair_use(student_id, request)


@router.get("/{student_id}/rewards", response_model=RewardResponse)
def rewards(student_id: str):
    return user_service.rewards(student_id)


@router.get("/{student_id}/next-route", response_model=RouteRecommendationResponse)
def next_route(student_id: str, at: datetime | None = Query(default=None)):
    return user_service.next_route(student_id, at)
