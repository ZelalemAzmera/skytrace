from dataclasses import dataclass
from datetime import date

@dataclass(frozen=True)
class Observation:
    id: str
    region_id: str
    epoch_mjd: float        # Modified Julian Date
    band_index: int         # 0-101 (SPHEREx bands)
    wavelength_um: float    # 0.75-5.0 micrometers
    fits_url: str           # IRSA IBE direct URL
    quality_pct: float      # 0-100 (% clean pixels)
    data_release: str       # "qr3"
    obs_date: date
    ra: float
    dec: float
