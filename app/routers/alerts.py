from datetime import datetime

from fastapi import APIRouter, Query

from app.models.schemas import ActiveAlertResponse, AlertCreateRequest, AlertResponse
from app.services.alert_service import alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.post("", response_model=AlertResponse)
def create_alert(request: AlertCreateRequest):
    return alert_service.create(request)


@router.get("/user/{student_id}", response_model=list[AlertResponse])
def alerts_by_user(student_id: str):
    return alert_service.by_user(student_id)


@router.get("/user/{student_id}/active", response_model=list[ActiveAlertResponse])
def active_alerts(student_id: str, at: datetime | None = Query(default=None)):
    return alert_service.active(student_id, at)
