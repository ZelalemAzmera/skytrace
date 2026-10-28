"""Coordinate transformations for astronomical ICRS and 3D celestial sphere."""
import math
import numpy as np
from astropy.coordinates import SkyCoord
import astropy.units as u

class CoordinateService:
    @staticmethod
    def validate_icrs(ra: float, dec: float) -> None:
        if not (0.0 <= ra < 360.0):
            raise ValueError(f"RA must be between 0 and 360 degrees, got {ra}")
        if not (-90.0 <= dec <= 90.0):
            raise ValueError(f"Dec must be between -90 and +90 degrees, got {dec}")

    @staticmethod
    def to_unit_vector(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
        """Convert ICRS (RA, Dec) in degrees to 3D Cartesian unit vector on celestial sphere.
        
        Formula:
            u_x = cos(dec) * cos(ra)
            u_y = cos(dec) * sin(ra)
            u_z = sin(dec)
        """
        CoordinateService.validate_icrs(ra_deg, dec_deg)
        ra_rad = math.radians(ra_deg)
        dec_rad = math.radians(dec_deg)
        cos_dec = math.cos(dec_rad)
        
        x = cos_dec * math.cos(ra_rad)
        y = cos_dec * math.sin(ra_rad)
        z = math.sin(dec_rad)
        return (round(x, 7), round(y, 7), round(z, 7))

    @staticmethod
    def from_unit_vector(x: float, y: float, z: float) -> tuple[float, float]:
        """Convert 3D unit vector back to ICRS (RA, Dec) in degrees."""
        norm = math.sqrt(x*x + y*y + z*z)
        if norm == 0:
            raise ValueError("Zero vector cannot be converted to celestial coordinates")
        x, y, z = x / norm, y / norm, z / norm
        
        dec_rad = math.asin(max(-1.0, min(1.0, z)))
        ra_rad = math.atan2(y, x)
        if ra_rad < 0:
            ra_rad += 2 * math.pi
            
        return (round(math.degrees(ra_rad), 6), round(math.degrees(dec_rad), 6))

    @staticmethod
    def to_hms_dms(ra_deg: float, dec_deg: float) -> dict[str, str | float]:
        CoordinateService.validate_icrs(ra_deg, dec_deg)
        c = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
        return {
            "ra_hms": c.ra.to_string(unit=u.hour, sep="hms", precision=2),
            "dec_dms": c.dec.to_string(sep="dms", precision=1, alwayssign=True),
            "ra_deg": round(ra_deg, 6),
            "dec_deg": round(dec_deg, 6),
        }

    @staticmethod
    def angular_separation_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
        c1 = SkyCoord(ra=ra1 * u.deg, dec=dec1 * u.deg, frame="icrs")
        c2 = SkyCoord(ra=ra2 * u.deg, dec=dec2 * u.deg, frame="icrs")
        return float(c1.separation(c2).arcsec)
