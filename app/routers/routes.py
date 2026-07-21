from datetime import datetime

from fastapi import APIRouter, Query

from app.models.domain import RouteMode
from app.models.schemas import RouteRecommendationResponse
from app.services.congestion_service import congestion_service

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("/recommend", response_model=RouteRecommendationResponse)
def recommend(
    from_building_id: str,
    from_floor: int,
    to_building_id: str,
    to_floor: int,
    mode: RouteMode | None = Query(default=None),
    at: datetime | None = Query(default=None),
):
    return congestion_service.route_recommendation(
        from_building_id=from_building_id,
        from_floor=from_floor,
        to_building_id=to_building_id,
        to_floor=to_floor,
        mode=mode,
        at=at,
    )
