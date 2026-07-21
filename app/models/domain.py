from dataclasses import dataclass
from datetime import date, datetime, time
from enum import Enum


class RouteMode(str, Enum):
    ELEVATOR_ONLY = "ELEVATOR_ONLY"
    STAIRS_AND_ELEVATOR = "STAIRS_AND_ELEVATOR"
    STAIRS_ONLY = "STAIRS_ONLY"


class CongestionLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


LEVEL_LABELS = {
    CongestionLevel.LOW: "여유",
    CongestionLevel.MODERATE: "보통",
    CongestionLevel.HIGH: "혼잡",
}

LEVEL_SCORES = {
    CongestionLevel.LOW: 20.0,
    CongestionLevel.MODERATE: 55.0,
    CongestionLevel.HIGH: 85.0,
}

LEVEL_COLORS = {
    CongestionLevel.LOW: "#2ECC71",
    CongestionLevel.MODERATE: "#F1C40F",
    CongestionLevel.HIGH: "#E74C3C",
}


def level_from_label(value: str | None) -> CongestionLevel:
    if not value:
        return CongestionLevel.MODERATE
    normalized = value.strip().upper()
    if normalized in {"여유", "LOW", "NOT CROWDED", "NOT_CROWDED"}:
        return CongestionLevel.LOW
    if normalized in {"혼잡", "HIGH", "CROWDED"}:
        return CongestionLevel.HIGH
    return CongestionLevel.MODERATE


def level_from_score(score: float) -> CongestionLevel:
    if score >= 70:
        return CongestionLevel.HIGH
    if score >= 40:
        return CongestionLevel.MODERATE
    return CongestionLevel.LOW


@dataclass(frozen=True)
class BuildingInfo:
    id: str
    name: str
    latitude: float
    longitude: float
    min_floor: int
    max_floor: int


@dataclass(frozen=True)
class SensorMeasurement:
    timestamp: datetime
    pir1: float
    pir2: float
    ultra1_dist: float
    ultra2_dist: float
    status: str
    pir1_missing: bool
    pir2_missing: bool
    ultra1_missing: bool
    ultra2_missing: bool
    imputed: bool
    hour: int
    minute: int
    day_of_week: int
    day_name: str
    measured_date: date
    level: CongestionLevel
    score: float


@dataclass(frozen=True)
class ScheduleEntry:
    semester: int
    category: str
    subject: str
    day: str
    day_of_week: int
    start_period: int
    end_period: int
    start_time: time
    end_time: time
    room: str
    building_id: str
    building_name: str
    floor: int | None


@dataclass
class UserTimetableEntry:
    subject: str
    day_of_week: int
    start_time: time
    end_time: time
    building_id: str
    room: str
    floor: int | None
    preferred_route_mode: RouteMode


@dataclass
class UserProfile:
    student_id: str
    timetable: list[UserTimetableEntry]
    favorite_places: set[str]
    stair_use_floors: int = 0
    reward_points: int = 0
    suyong_health: int = 50

    def record_stair_use(self, floors: int) -> None:
        safe_floors = max(1, floors)
        self.stair_use_floors += safe_floors
        self.reward_points += safe_floors * 10
        self.suyong_health = min(100, self.suyong_health + safe_floors * 2)

    def badges(self) -> set[str]:
        badges: set[str] = set()
        if self.stair_use_floors >= 1:
            badges.add("FIRST_STEP")
        if self.stair_use_floors >= 10:
            badges.add("STAIR_STARTER")
        if self.stair_use_floors >= 30:
            badges.add("SUYONG_HEALTHY")
        if self.stair_use_floors >= 60:
            badges.add("CAMPUS_CLIMBER")
        return badges


@dataclass(frozen=True)
class AlertPreference:
    id: str
    student_id: str
    building_id: str
    floor: int | None
    starts_at: time | None
    ends_at: time | None
    threshold_score: int
    enabled: bool = True
