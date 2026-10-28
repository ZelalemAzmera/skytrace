import time
from fastapi import APIRouter, Depends, Query, HTTPException
from ..schemas import CompareResponse, CandidateResponse
from src.infrastructure.api.dependencies import get_compare_uc

router = APIRouter(prefix="/api/v1/compare", tags=["compare"])

@router.get("", response_model=CompareResponse)
async def compare_observations(
    obs_a: str = Query(..., description="Observation A ID"),
    obs_b: str = Query(..., description="Observation B ID"),
    band: int = Query(50, ge=0, le=101, description="SPHEREx band index (0-101)"),
    use_case=Depends(get_compare_uc),
):
    t0 = time.perf_counter()
    try:
        result = await use_case.execute(obs_a_id=obs_a, obs_b_id=obs_b, band=band)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    comparison_id = f"{obs_a}_{obs_b}_{band}"

    central_ra = result.candidates[0].ra if result.candidates else 83.82
    central_dec = result.candidates[0].dec if result.candidates else -5.39

    return CompareResponse(
        comparison_id=comparison_id,
        image_a_b64=result.tile_a_b64,
        image_b_b64=result.tile_b_b64,
        difference_b64=result.tile_diff_b64,
        wcs={"ra_center": central_ra, "dec_center": central_dec, "pix_scale_deg": 6.2 / 3600.0},
        candidates=[CandidateResponse(**c.__dict__) for c in result.candidates],
        metadata={**result.metadata, "processing_ms": elapsed_ms},
    )
