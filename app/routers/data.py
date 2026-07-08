from fastapi import APIRouter, Query

from app.models.schemas import DataSummaryResponse, ScheduleResponse
from app.services.congestion_service import congestion_service

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/schedules/search", response_model=list[ScheduleResponse])
def search_schedules(
    keyword: str | None = Query(default=None),
    building_id: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
):
    return congestion_service.search_schedules(keyword, building_id, limit)


@router.get("/data/summary", response_model=DataSummaryResponse)
def data_summary():
    return congestion_service.data_summary()
