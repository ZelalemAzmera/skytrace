from dataclasses import dataclass

@dataclass
class ParallaxResult:
    pixel_shift: float         # Shift between epochs in pixels
    proper_motion_arcsec: float # Total apparent angular shift
    parallax_arcsec: float     # Estimated annual parallax
    distance_pc: float | None  # Distance in parsecs (if parallax valid)
    distance_ly: float | None  # Distance in light years
    is_bound: bool             # Whether physical distance < 1000 pc
