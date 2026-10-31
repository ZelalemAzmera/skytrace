"""Parallax and proper motion calculator for SPHEREx epochs."""
import math
from ..entities.parallax import ParallaxResult

class ParallaxCalculator:
    SPHEREX_PIXEL_SCALE_ARCSEC = 6.2  # arcseconds per pixel

    @classmethod
    def calculate(
        cls,
        pixel_shift: float,
        baseline_days: float = 182.625,  # ~6 months (half Earth orbit = 2 AU baseline)
        earth1_helio_ecl=None,
        earth2_helio_ecl=None,
        ra_deg: float | None = None,
        dec_deg: float | None = None,
    ) -> ParallaxResult:
        """Calculate parallax and distance from observed pixel shift between epochs.
        
        Formula:
            motion_arcsec = pixel_shift * 6.2 arcsec/px
            For a ~6-month baseline across 2 AU:
                parallax_arcsec = motion_arcsec / 2.0
                d_pc = 1.0 / parallax_arcsec
                d_ly = d_pc * 3.26156
        """
        shift = abs(pixel_shift)
        motion_arcsec = shift * cls.SPHEREX_PIXEL_SCALE_ARCSEC

        # Exact path: delegate to the calculation engine using real Earth vectors
        # (heliocentric ecliptic, AU) and the target direction.
        if earth1_helio_ecl is not None and earth2_helio_ecl is not None and ra_deg is not None and dec_deg is not None:
            from space_object_explorer import parallax_distance  # lazy: engine needs astropy/astroquery
            r = parallax_distance(motion_arcsec, earth1_helio_ecl, earth2_helio_ecl, ra_deg, dec_deg)
            pc, ly = r['distance_pc'], r['distance_ly']
            return ParallaxResult(
                pixel_shift=round(shift, 4),
                proper_motion_arcsec=round(motion_arcsec, 4),
                parallax_arcsec=round(motion_arcsec / r['baseline_perp_au'], 4) if r['baseline_perp_au'] > 1e-6 else 0.0,  # annual-equivalent (1 AU) parallax
                distance_pc=round(pc, 2) if pc is not None else None,
                distance_ly=round(ly, 2) if ly is not None else None,
                is_bound=pc is not None and pc <= 1000.0,
            )
        
        # Scale to annual parallax based on baseline
        baseline_fraction = baseline_days / 365.25
        # For ~0.5 year baseline (opposite sides of Sun), parallax angle is half the baseline displacement:
        if baseline_fraction > 0:
            parallax_arcsec = motion_arcsec / 2.0
        else:
            parallax_arcsec = 0.0

        if parallax_arcsec > 0.001:  # measurable limit (>1 milliarcsec)
            distance_pc = 1.0 / parallax_arcsec
            distance_ly = distance_pc * 3.26156
            is_bound = distance_pc <= 1000.0
        else:
            distance_pc = None
            distance_ly = None
            is_bound = False

        return ParallaxResult(
            pixel_shift=round(shift, 4),
            proper_motion_arcsec=round(motion_arcsec, 4),
            parallax_arcsec=round(parallax_arcsec, 4),
            distance_pc=round(distance_pc, 2) if distance_pc is not None else None,
            distance_ly=round(distance_ly, 2) if distance_ly is not None else None,
            is_bound=is_bound,
        )