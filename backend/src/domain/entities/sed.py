from dataclasses import dataclass, field

@dataclass
class SpectralPoint:
    band_index: int
    wavelength_um: float
    flux_density: float        # mJy or normalized
    flux_uncertainty: float    # 1-sigma error

@dataclass
class SpectralEnergyDistribution:
    candidate_id: str
    points: list[SpectralPoint] = field(default_factory=list)
    best_template_fit: str = "Unknown"
    chi_squared: float = 0.0
    dof: int = 1
    reduced_chi_squared: float = 0.0
