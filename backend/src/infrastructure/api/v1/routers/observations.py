from fastapi import APIRouter, Depends, Query
from ..schemas import ObservationResponse
from src.infrastructure.api.dependencies import get_query_sky_region_uc

router = APIRouter(prefix="/api/v1/observations", tags=["observations"])

@router.get("", response_model=list[ObservationResponse])
async def list_observations(
    ra: float = Query(..., ge=0.0, le=360.0, description="Right Ascension in degrees"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination in degrees"),
    radius: float = Query(0.1, ge=0.01, le=5.0, description="Search radius in degrees"),
    band: int | None = Query(None, ge=0, le=101, description="SPHEREx band index"),
    use_case=Depends(get_query_sky_region_uc),
):
    observations = await use_case.execute(ra=ra, dec=dec, radius_deg=radius, band=band)
    return [ObservationResponse(**o.__dict__) for o in observations]
