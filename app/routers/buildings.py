from datetime import datetime

from fastapi import APIRouter, Query

from app.models.schemas import BuildingDetailResponse, ElevatorMenuResponse
from app.services.congestion_service import congestion_service

router = APIRouter(prefix="/api/buildings", tags=["buildings"])


@router.get("/{building_id}", response_model=BuildingDetailResponse)
def building_detail(building_id: str, at: datetime | None = Query(default=None)):
    return congestion_service.building_detail(building_id, at)


@router.get("/{building_id}/elevators", response_model=ElevatorMenuResponse)
def elevators(building_id: str, at: datetime | None = Query(default=None)):
    return congestion_service.elevators(building_id, at)
