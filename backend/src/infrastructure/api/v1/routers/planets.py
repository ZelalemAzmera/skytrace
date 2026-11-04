"""Real heliocentric positions of the eight planets (offline astropy ephemeris) for comparison views."""
import argparse
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1/planets", tags=["planets"])


@router.get("")
async def planets(date: str = Query("2026-01-01", description="UTC date/time, ISO")):
    try:
        from astropy.time import Time
        from space_object_explorer import parse_datetime, planet_positions_builtin
        dt = parse_datetime(date)
        jd = float(Time(dt, scale="utc").jd)
        return {"date": dt.isoformat(), "jd": jd, "frame": "heliocentric ecliptic J2000 (AU)",
                "accuracy_note": "astropy built-in ephemeris, roughly arc-minute accuracy; use JPL Horizons for exact values",
                "planets": planet_positions_builtin(jd)}
    except (ValueError, argparse.ArgumentTypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc))