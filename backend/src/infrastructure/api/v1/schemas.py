from pydantic import BaseModel
from datetime import date

class ObservationResponse(BaseModel):
    id: str
    epoch_mjd: float
    obs_date: date | None
    band_index: int
    wavelength_um: float
    fits_url: str
    quality_pct: float
    data_release: str
    ra: float
    dec: float

class CandidateResponse(BaseModel):
    id: str
    ra: float
    dec: float
    pixel_x: float
    pixel_y: float
    snr_change: float
    delta_flux: float
    delta_flux_sigma: float
    motion_arcsec: float
    artifact_probability: float
    confidence_score: float
    most_match: bool
    most_object_name: str | None = None
    classification: str = "Unclassified"

class CompareResponse(BaseModel):
    comparison_id: str
    image_a_b64: str
    image_b_b64: str
    difference_b64: str
    wcs: dict
    candidates: list[CandidateResponse]
    metadata: dict

class EvidenceResponse(BaseModel):
    candidate_id: str
    narrative: str
    measurements: list[dict]
    caveats: list[str]
    irsa_links: list[dict]
    quality_flags: dict

class WavelengthBandResponse(BaseModel):
    index: int
    wavelength_um: float
    label: str
