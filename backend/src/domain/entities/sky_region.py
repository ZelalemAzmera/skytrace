from dataclasses import dataclass

@dataclass(frozen=True)
class SkyRegion:
    ra: float          # ICRS decimal degrees (0-360)
    dec: float         # ICRS decimal degrees (-90 to +90)
    radius_deg: float  # Search radius in decimal degrees
    label: str | None = None

    def __post_init__(self) -> None:
        if not (0.0 <= self.ra < 360.0):
            raise ValueError(f"RA must be 0-360, got {self.ra}")
        if not (-90.0 <= self.dec <= 90.0):
            raise ValueError(f"Dec must be -90 to +90, got {self.dec}")
        if not (0.0 < self.radius_deg <= 5.0):
            raise ValueError(f"Radius must be 0-5 deg, got {self.radius_deg}")
