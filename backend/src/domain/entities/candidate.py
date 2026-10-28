from dataclasses import dataclass, field
from uuid import uuid4

@dataclass
class Candidate:
    ra: float
    dec: float
    pixel_x: float
    pixel_y: float
    snr_change: float            # Signed SNR (positive = brightening)
    delta_flux: float            # Flux change in data units
    delta_flux_sigma: float      # Uncertainty on delta_flux
    motion_arcsec: float         # Apparent motion
    artifact_probability: float  # 0.0-1.0
    confidence_score: float      # 0.0-1.0
    most_match: bool = False
    most_object_name: str | None = None
    most_object_type: str | None = None
    classification: str = "Unclassified"
    id: str = field(default_factory=lambda: str(uuid4()))
