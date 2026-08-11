from datetime import datetime, time
from uuid import uuid4

from app.models.domain import AlertPreference
from app.models.schemas import ActiveAlertResponse, AlertCreateRequest, AlertResponse
from app.services.congestion_service import congestion_service
from app.services.data_store import data_store
from app.services.db_service import database
from app.services.user_service import user_service


class AlertService:
    def create(self, request: AlertCreateRequest) -> AlertResponse:
        user_service.require_user(request.student_id)
        building = data_store.get_building(request.building_id)

        alert = AlertPreference(
            id=f"ALERT-{uuid4().hex[:8].upper()}",
            student_id=request.student_id.strip(),
            building_id=building.id,
            floor=request.floor,
            starts_at=request.starts_at,
            ends_at=request.ends_at,
            threshold_score=request.threshold_score,
            enabled=True,
        )
        with database.connect() as connection:
            connection.execute(
                """
                INSERT INTO alerts (
                    id, student_id, building_id, floor, starts_at,
                    ends_at, threshold_score, enabled
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert.id,
                    alert.student_id,
                    alert.building_id,
                    alert.floor,
                    alert.starts_at.isoformat() if alert.starts_at else None,
                    alert.ends_at.isoformat() if alert.ends_at else None,
                    alert.threshold_score,
                    1,
                ),
            )
        return self._response(alert)

    def by_user(self, student_id: str) -> list[AlertResponse]:
        user_service.require_user(student_id)
        return [self._response(alert) for alert in self._alerts_for_user(student_id)]

    def active(self, student_id: str, at: datetime | None) -> list[ActiveAlertResponse]:
        user_service.require_user(student_id)
        base_time = congestion_service.resolve_base_time(at)
        result: list[ActiveAlertResponse] = []
        for alert in self._alerts_for_user(student_id):
            if not alert.enabled:
                continue
            if not self._in_window(base_time.time(), alert.starts_at, alert.ends_at):
                continue
            congestion = congestion_service.building_congestion(alert.building_id, base_time)
            active = (
                congestion.current_score >= alert.threshold_score
                or congestion.predicted_score_after_10_min >= alert.threshold_score
            )
            if active:
                result.append(
                    ActiveAlertResponse(
                        alert_id=alert.id,
                        building_id=alert.building_id,
                        floor=alert.floor,
                        current_score=congestion.current_score,
                        predicted_score_after_10_min=congestion.predicted_score_after_10_min,
                        active=True,
                        message="설정한 기준보다 혼잡합니다. 계단 이용 또는 출발 시간 조정을 추천합니다.",
                    )
                )
        return result

    def _alerts_for_user(self, student_id: str) -> list[AlertPreference]:
        with database.connect() as connection:
            rows = connection.execute(
                """
                SELECT id, student_id, building_id, floor, starts_at, ends_at,
                       threshold_score, enabled
                FROM alerts
                WHERE student_id = ?
                ORDER BY created_at DESC
                """,
                (student_id,),
            ).fetchall()
        return [
            AlertPreference(
                id=row["id"],
                student_id=row["student_id"],
                building_id=row["building_id"],
                floor=row["floor"],
                starts_at=self._parse_time(row["starts_at"]),
                ends_at=self._parse_time(row["ends_at"]),
                threshold_score=int(row["threshold_score"]),
                enabled=bool(row["enabled"]),
            )
            for row in rows
        ]

    def _response(self, alert: AlertPreference) -> AlertResponse:
        return AlertResponse(
            alert_id=alert.id,
            student_id=alert.student_id,
            building_id=alert.building_id,
            floor=alert.floor,
            starts_at=alert.starts_at,
            ends_at=alert.ends_at,
            threshold_score=alert.threshold_score,
            enabled=alert.enabled,
        )

    def _in_window(self, current: time, start: time | None, end: time | None) -> bool:
        if start is None or end is None or start == end:
            return True
        if start < end:
            return start <= current <= end
        return current >= start or current <= end

    def _parse_time(self, value: str | None) -> time | None:
        return time.fromisoformat(value) if value else None


alert_service = AlertService()
