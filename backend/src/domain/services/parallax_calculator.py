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
