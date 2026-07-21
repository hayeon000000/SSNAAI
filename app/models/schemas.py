from datetime import datetime, time

from pydantic import BaseModel, Field

from app.models.domain import RouteMode


class BuildingCongestionResponse(BaseModel):
    building_id: str
    building_name: str
    latitude: float
    longitude: float
    current_level: str
    current_label: str
    current_score: float
    predicted_level_after_10_min: str
    predicted_label_after_10_min: str
    predicted_score_after_10_min: float
    expected_wait_seconds: int
    schedule_pressure: int
    color: str
    data_imputed: bool
    source: str
    recommend_stairs: bool


class CampusMapResponse(BaseModel):
    base_time: datetime
    buildings: list[BuildingCongestionResponse]


class ScheduleResponse(BaseModel):
    semester: int
    category: str
    subject: str
    day: str
    day_of_week: int
    start_time: time
    end_time: time
    room: str
    building_id: str
    building_name: str
    floor: int | None


class BuildingDetailResponse(BaseModel):
    congestion: BuildingCongestionResponse
    nearby_classes: list[ScheduleResponse]
    recommendation_message: str


class RouteRecommendationResponse(BaseModel):
    requested_mode: RouteMode
    recommended_mode: RouteMode
    estimated_minutes: int
    expected_wait_seconds: int
    reward_points: int
    stairs_recommended: bool
    message: str
    steps: list[str]


class LoginRequest(BaseModel):
    student_id: str = Field(..., min_length=1)


class RewardResponse(BaseModel):
    stair_use_floors: int
    reward_points: int
    suyong_health: int
    badges: set[str]


class LoginResponse(BaseModel):
    student_id: str
    rewards: RewardResponse


class TimetableRequest(BaseModel):
    subject: str
    day: str
    start_time: time
    end_time: time
    building_id: str | None = None
    room: str
    floor: int | None = None
    preferred_route_mode: RouteMode = RouteMode.STAIRS_AND_ELEVATOR


class TimetableResponse(BaseModel):
    subject: str
    day_of_week: int
    start_time: time
    end_time: time
    building_id: str
    room: str
    floor: int | None
    preferred_route_mode: RouteMode


class FavoritePlaceRequest(BaseModel):
    place_id: str = Field(..., min_length=1)


class StairUseRequest(BaseModel):
    floors: int = Field(..., ge=1, le=50)


class UserProfileResponse(BaseModel):
    student_id: str
    timetable: list[TimetableResponse]
    favorite_places: set[str]
    rewards: RewardResponse


class AlertCreateRequest(BaseModel):
    student_id: str
    building_id: str
    floor: int | None = None
    starts_at: time | None = None
    ends_at: time | None = None
    threshold_score: int = Field(70, ge=0, le=100)


class AlertResponse(BaseModel):
    alert_id: str
    student_id: str
    building_id: str
    floor: int | None
    starts_at: time | None
    ends_at: time | None
    threshold_score: int
    enabled: bool


class ActiveAlertResponse(BaseModel):
    alert_id: str
    building_id: str
    floor: int | None
    current_score: float
    predicted_score_after_10_min: float
    active: bool
    message: str


class DataSummaryResponse(BaseModel):
    sensor_rows: int
    imputed_rows: int
    schedule_rows: int
    first_sensor_time: datetime | None
    latest_sensor_time: datetime | None
