from datetime import datetime

from fastapi import APIRouter, Query

from app.models.schemas import CampusMapResponse
from app.services.congestion_service import congestion_service

router = APIRouter(prefix="/api/home", tags=["home"])


@router.get("/map", response_model=CampusMapResponse)
def campus_map(at: datetime | None = Query(default=None)):
    return congestion_service.campus_map(at)
