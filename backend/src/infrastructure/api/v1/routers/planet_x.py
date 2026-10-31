"""Hypothetical Planet X: orbit size, mass and position on a timeline (calculated by space_object_explorer)."""
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1/planet-x", tags=["planet-x"])


@router.get("")
async def planet_x(
    start: str = Query("2026-01-01", description="Timeline start (UTC, ISO)"),
    end: str = Query("2027-01-01", description="Timeline end (UTC, ISO)"),
    step: str = Query("30 d", description="Sampling step, e.g. '7 d', '1 y'"),
    a: float = Query(500.0, gt=0, description="Semi-major axis (AU)"),
    e: float = Query(0.25, ge=0, lt=1, description="Eccentricity"),
    inc: float = Query(20.0, description="Inclination (deg)"),
    node: float = Query(90.0, description="Longitude of ascending node (deg)"),
    arg_peri: float = Query(150.0, description="Argument of perihelion (deg)"),
    m0: float = Query(180.0, description="Mean anomaly at epoch (deg)"),
    epoch: str = Query("2026-01-01T00:00:00Z", description="Epoch of m0 (UTC)"),
    mass_earth: float = Query(5.0, gt=0, description="Assumed mass (Earth masses)"),
):
    try:
        from space_object_explorer import planet_x_report  # backend root module
        return planet_x_report(start, end, step, a=a, e=e, inc=inc, node=node, arg_peri=arg_peri,
                               M0_deg=m0, epoch=epoch, mass_earth=mass_earth)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc))