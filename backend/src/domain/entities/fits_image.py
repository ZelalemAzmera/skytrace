from dataclasses import dataclass
import numpy as np
from astropy.wcs import WCS

@dataclass
class FITSImage:
    data: np.ndarray          # float32 science array
    variance: np.ndarray      # float32 noise variance array
    flags: np.ndarray         # int16 quality flag array
    wcs: WCS                  # Astropy WCS object
    epoch_mjd: float
    wavelength_um: float
    band_index: int
    obs_id: str
    quality_pct: float        # Computed from flags

    @property
    def shape(self) -> tuple[int, int]:
        return self.data.shape
