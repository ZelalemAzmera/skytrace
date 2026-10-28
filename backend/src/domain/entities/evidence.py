from dataclasses import dataclass, field
import numpy as np
from .fits_image import FITSImage
from .candidate import Candidate

@dataclass
class Measurement:
    label: str
    value: float
    unit: str
    uncertainty: float | None = None

@dataclass
class Evidence:
    candidate_id: str
    narrative: str
    measurements: list[Measurement] = field(default_factory=list)
    caveats: list[str] = field(default_factory=list)
    irsa_links: list[dict] = field(default_factory=list)
    quality_flags: dict = field(default_factory=dict)

@dataclass
class ComparisonResult:
    image_a: FITSImage | None
    image_b: FITSImage | None
    difference: np.ndarray | None
    snr_map: np.ndarray | None
    candidates: list[Candidate]
    metadata: dict
    tile_a_b64: str = ""
    tile_b_b64: str = ""
    tile_diff_b64: str = ""

    def to_dict(self) -> dict:
        return {
            "tile_a_b64": self.tile_a_b64,
            "tile_b_b64": self.tile_b_b64,
            "tile_diff_b64": self.tile_diff_b64,
            "candidates": [c.__dict__ for c in self.candidates],
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ComparisonResult":
        from .candidate import Candidate
        result = cls.__new__(cls)
        result.tile_a_b64 = d.get("tile_a_b64", "")
        result.tile_b_b64 = d.get("tile_b_b64", "")
        result.tile_diff_b64 = d.get("tile_diff_b64", "")
        result.candidates = [Candidate(**c) for c in d.get("candidates", [])]
        result.metadata = d.get("metadata", {})
        result.image_a = None
        result.image_b = None
        result.difference = None
        result.snr_map = None
        return result
