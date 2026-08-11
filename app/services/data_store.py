import csv
import re
import time as time_module
from datetime import datetime, time
from pathlib import Path

from app.config import settings
from app.models.domain import (
    BuildingInfo,
    CongestionLevel,
    ScheduleEntry,
    SensorMeasurement,
    level_from_label,
)


class DataStore:
    def __init__(self) -> None:
        self._loaded_at = 0.0
        self._sensors: list[SensorMeasurement] = []
        self._schedules: list[ScheduleEntry] = []
        self._buildings = self._buildings_map()

    def ensure_loaded(self) -> None:
        now = time_module.monotonic()
        if self._loaded_at == 0 or now - self._loaded_at >= settings.reload_seconds:
            self.reload()

    def reload(self) -> None:
        self._sensors = sorted(
            [self._sensor_from_row(row) for row in self._read_csv(settings.sensor_imputed_csv)],
            key=lambda item: item.timestamp,
        )
        self._schedules = (
            self._load_schedule(settings.semester1_schedule_csv, 1)
            + self._load_schedule(settings.semester2_schedule_csv, 2)
        )
        self._loaded_at = time_module.monotonic()

    @property
    def buildings(self) -> dict[str, BuildingInfo]:
        self.ensure_loaded()
        return self._buildings

    @property
    def sensors(self) -> list[SensorMeasurement]:
        self.ensure_loaded()
        return self._sensors

    @property
    def schedules(self) -> list[ScheduleEntry]:
        self.ensure_loaded()
        return self._schedules

    def get_building(self, building_id: str) -> BuildingInfo:
        normalized_id = self.normalize_building_id(building_id)
        building = self.buildings.get(normalized_id)
        if not building:
            raise ValueError(f"Unknown building_id: {building_id}")
        return building

    def normalize_building_id(self, building_id: str | None) -> str:
        if not building_id:
            return "UNKNOWN"
        raw = building_id.strip()
        if raw in self._buildings:
            return raw
        compact = re.sub(r"[\s_-]+", "", raw).upper()
        aliases = {
            "SOOJUNG": "SOOJUNG",
            "SUJEONG": "SOOJUNG",
            "SUJUNG": "SOOJUNG",
            "수정": "SOOJUNG",
            "수정관": "SOOJUNG",
            "SUNGSHIN": "SUNGSHIN",
            "성신": "SUNGSHIN",
            "성신관": "SUNGSHIN",
            "NANHYANG": "NANHYANG",
            "NANHYANGHALL": "NANHYANG",
            "NANHYANGGWAN": "NANHYANG",
            "난향": "NANHYANG",
            "난향관": "NANHYANG",
            "UNJEONG": "UNJEONG",
            "운정": "UNJEONG",
            "운정그린캠퍼스": "UNJEONG",
            "PRIME": "PRIME",
            "프라임": "PRIME",
            "프라임관": "PRIME",
            "JOHYUNG": "JOHYUNG",
            "조형": "JOHYUNG",
            "조형관": "JOHYUNG",
            "MUSIC": "MUSIC",
            "음악": "MUSIC",
            "음악관": "MUSIC",
            "MEDIA": "MEDIA",
            "미디어": "MEDIA",
            "미디어정보관": "MEDIA",
            "GLOBAL": "GLOBAL",
            "국제": "GLOBAL",
            "국제교육관": "GLOBAL",
            "GYM": "GYM",
            "체육": "GYM",
            "체육관": "GYM",
            "STUDENT": "STUDENT_HALL",
            "STUDENTHALL": "STUDENT_HALL",
            "STUDENTUNION": "STUDENT_HALL",
            "STUDENTCENTER": "STUDENT_HALL",
            "HAKSAENG": "STUDENT_HALL",
            "HAKSENG": "STUDENT_HALL",
            "HAKSAENGHALL": "STUDENT_HALL",
            "HAKSENGHALL": "STUDENT_HALL",
            "학생": "STUDENT_HALL",
            "학생관": "STUDENT_HALL",
            "학생회관": "STUDENT_HALL",
        }
        return aliases.get(compact, raw)

    def latest_sensor_time(self) -> datetime | None:
        return self.sensors[-1].timestamp if self.sensors else None

    def first_sensor_time(self) -> datetime | None:
        return self.sensors[0].timestamp if self.sensors else None

    def latest_sensor_at(self, base_time: datetime) -> SensorMeasurement | None:
        latest: SensorMeasurement | None = None
        for sensor in self.sensors:
            if sensor.timestamp <= base_time:
                latest = sensor
            else:
                break
        return latest or (self.sensors[-1] if self.sensors else None)

    def recent_sensors(self, base_time: datetime, minutes: int) -> list[SensorMeasurement]:
        start_ts = base_time.timestamp() - minutes * 60
        return [
            sensor
            for sensor in self.sensors
            if start_ts <= sensor.timestamp.timestamp() <= base_time.timestamp()
        ]

    def schedule_pressure(self, building_id: str, base_time: datetime, window_minutes: int = 10, floor: int | None = None) -> int:
        normalized_id = self.normalize_building_id(building_id)
        current_minutes = base_time.hour * 60 + base_time.minute
        count = 0
        for entry in self.schedules:
            if entry.building_id != normalized_id:
                continue
            if floor is not None and entry.floor != floor:
                continue
            if entry.day_of_week != base_time.weekday():
                continue
            start_minutes = entry.start_time.hour * 60 + entry.start_time.minute
            end_minutes = entry.end_time.hour * 60 + entry.end_time.minute
            if abs(start_minutes - current_minutes) <= window_minutes or abs(end_minutes - current_minutes) <= window_minutes:
                count += 1
        return count

    def nearby_classes(self, building_id: str, base_time: datetime, window_minutes: int = 15) -> list[ScheduleEntry]:
        normalized_id = self.normalize_building_id(building_id)
        current_minutes = base_time.hour * 60 + base_time.minute
        result: list[ScheduleEntry] = []
        for entry in self.schedules:
            if entry.building_id != normalized_id or entry.day_of_week != base_time.weekday():
                continue
            start_minutes = entry.start_time.hour * 60 + entry.start_time.minute
            end_minutes = entry.end_time.hour * 60 + entry.end_time.minute
            if abs(start_minutes - current_minutes) <= window_minutes or abs(end_minutes - current_minutes) <= window_minutes:
                result.append(entry)
        return result[:30]

    def search_schedules(self, keyword: str | None, building_id: str | None, limit: int) -> list[ScheduleEntry]:
        safe_keyword = (keyword or "").strip()
        safe_building_id = self.normalize_building_id(building_id) if building_id else ""
        result: list[ScheduleEntry] = []
        for entry in self.schedules:
            if safe_keyword and safe_keyword not in entry.subject and safe_keyword not in entry.room:
                continue
            if safe_building_id and entry.building_id != safe_building_id:
                continue
            result.append(entry)
            if len(result) >= max(1, min(limit, 100)):
                break
        return result

    def building_from_room(self, room: str | None) -> BuildingInfo:
        return self._buildings.get(self.building_id_from_room(room), self._buildings["UNKNOWN"])

    def building_id_from_room(self, room: str | None) -> str:
        if not room or room.lower() == "nan":
            return "UNKNOWN"
        stripped = room.strip()
        if stripped.startswith("수"):
            return "SOOJUNG"
        if stripped.startswith("성"):
            return "SUNGSHIN"
        if stripped.startswith("난"):
            return "NANHYANG"
        if stripped.startswith("운"):
            return "UNJEONG"
        if stripped.startswith("프"):
            return "PRIME"
        if stripped.startswith("학") or "학생회관" in stripped:
            return "STUDENT_HALL"
        if stripped.startswith("조"):
            return "JOHYUNG"
        if stripped.startswith("음"):
            return "MUSIC"
        if stripped.startswith("미"):
            return "MEDIA"
        if stripped.startswith("국"):
            return "GLOBAL"
        if stripped.startswith("체"):
            return "GYM"
        return "UNKNOWN"

    def floor_from_room(self, room: str | None) -> int | None:
        if not room:
            return None
        match = re.search(r"(\d)", room)
        return int(match.group(1)) if match else None

    def day_to_weekday(self, value: str) -> int:
        normalized = value.strip()
        first = normalized[:1]
        korean = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
        english = {
            "MONDAY": 0,
            "TUESDAY": 1,
            "WEDNESDAY": 2,
            "THURSDAY": 3,
            "FRIDAY": 4,
            "SATURDAY": 5,
            "SUNDAY": 6,
        }
        if first in korean:
            return korean[first]
        upper = normalized.upper()
        if upper in english:
            return english[upper]
        raise ValueError(f"Unknown day value: {value}")

    def _load_schedule(self, path: Path, semester: int) -> list[ScheduleEntry]:
        return [self._schedule_from_row(row, semester) for row in self._read_csv(path)]

    def _sensor_from_row(self, row: dict[str, str]) -> SensorMeasurement:
        timestamp = datetime.strptime(row["timestamp"], "%Y-%m-%d %H:%M:%S")
        pir1 = self._float(row.get("pir1"), 0.0)
        pir2 = self._float(row.get("pir2"), 0.0)
        ultra1 = self._float(row.get("ultra1_dist"), 0.0)
        ultra2 = self._float(row.get("ultra2_dist"), 0.0)
        level = level_from_label(row.get("status_kor") or row.get("status"))

        return SensorMeasurement(
            timestamp=timestamp,
            pir1=pir1,
            pir2=pir2,
            ultra1_dist=ultra1,
            ultra2_dist=ultra2,
            status=row.get("status", ""),
            pir1_missing=self._bool(row.get("pir1_missing")),
            pir2_missing=self._bool(row.get("pir2_missing")),
            ultra1_missing=self._bool(row.get("ultra1_missing")),
            ultra2_missing=self._bool(row.get("ultra2_missing")),
            imputed=self._bool(row.get("imputed")),
            hour=self._int(row.get("hour"), timestamp.hour),
            minute=self._int(row.get("minute"), timestamp.minute),
            day_of_week=self._int(row.get("day_of_week"), timestamp.weekday()),
            day_name=row.get("day_name", ""),
            measured_date=timestamp.date(),
            level=level,
            score=self._score_from_level(level),
        )

    def _schedule_from_row(self, row: dict[str, str], semester: int) -> ScheduleEntry:
        room = row.get("room", "")
        building = self.building_from_room(room)
        return ScheduleEntry(
            semester=semester,
            category=row.get("category", ""),
            subject=row.get("subject", ""),
            day=row.get("day", ""),
            day_of_week=self.day_to_weekday(row.get("day", "월")),
            start_period=self._int(row.get("start_period"), 0),
            end_period=self._int(row.get("end_period"), 0),
            start_time=self._time(row.get("start_time")),
            end_time=self._time(row.get("end_time")),
            room=room,
            building_id=building.id,
            building_name=building.name,
            floor=self.floor_from_room(room),
        )

    def _read_csv(self, path: Path) -> list[dict[str, str]]:
        with path.open("r", encoding="utf-8-sig", newline="") as fp:
            return list(csv.DictReader(fp))

    def _buildings_map(self) -> dict[str, BuildingInfo]:
        buildings = [
            BuildingInfo("SOOJUNG", "수정관", 37.59124, 127.02204, 1, 10),
            BuildingInfo("SUNGSHIN", "성신관", 37.59178, 127.02152, 1, 8),
            BuildingInfo("NANHYANG", "난향관", 37.59091, 127.02121, 1, 7),
            BuildingInfo("UNJEONG", "운정그린캠퍼스", 37.60353, 127.04262, 1, 12),
            BuildingInfo("PRIME", "프라임관", 37.59107, 127.02282, 1, 8),
            BuildingInfo("STUDENT_HALL", "학생회관", 37.58930, 127.01650, 1, 5),
            BuildingInfo("JOHYUNG", "조형관", 37.59066, 127.02194, 1, 8),
            BuildingInfo("MUSIC", "음악관", 37.59196, 127.02244, 1, 6),
            BuildingInfo("MEDIA", "미디어정보관", 37.59216, 127.02181, 1, 6),
            BuildingInfo("GLOBAL", "국제교육관", 37.59047, 127.02151, 1, 6),
            BuildingInfo("GYM", "체육관", 37.59026, 127.02237, 1, 5),
            BuildingInfo("UNKNOWN", "미지정", 37.59124, 127.02204, 1, 10),
        ]
        return {building.id: building for building in buildings}

    def _score_from_level(self, level: CongestionLevel) -> float:
        return {CongestionLevel.LOW: 20.0, CongestionLevel.MODERATE: 55.0, CongestionLevel.HIGH: 85.0}[level]

    def _time(self, value: str | None) -> time:
        return time.fromisoformat(value or "00:00")

    def _int(self, value: str | None, fallback: int) -> int:
        try:
            return int(float(value)) if value not in (None, "") else fallback
        except ValueError:
            return fallback

    def _float(self, value: str | None, fallback: float) -> float:
        try:
            return float(value) if value not in (None, "") else fallback
        except ValueError:
            return fallback

    def _bool(self, value: str | None) -> bool:
        return str(value).lower() == "true"


data_store = DataStore()
