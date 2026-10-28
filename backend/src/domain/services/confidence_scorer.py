"""Automated confidence scoring model with explicit scientific caveats."""
from dataclasses import dataclass

@dataclass
class ConfidenceResult:
    score: float           # 0.0 - 1.0
    label: str             # "Very Low" | "Moderate" | "High" | "Very High"
    caveats: list[str]
    components: dict[str, float]

class ConfidenceScorer:
    STANDARD_CAVEATS = [
        "Automated algorithm detection; not yet validated by human inspection.",
        "Candidate requires ground-based or space-based follow-up photometry to rule out transient flare.",
    ]

    def score(
        self,
        snr: float,
        quality_pct: float,
        most_match: bool,
        multi_band_count: int,
        fwhm_pixels: float,
        edge_distance: float,
    ) -> ConfidenceResult:
        # 1. SNR score (5-sigma = 0.5, 10-sigma = 0.8, 20-sigma = 1.0)
        snr_score = min(max(abs(snr) - 3.0, 0.0) / 17.0, 1.0)
        
        # 2. Multi-band confirmation (1 band = 0.25, 4+ bands = 1.0)
        multiband_score = min(max(multi_band_count, 1) / 4.0, 1.0)
        
        # 3. PSF profile score (SPHEREx PSF is ~1.8 to 2.4 px)
        if 1.4 <= fwhm_pixels <= 3.2:
            psf_score = 1.0
        elif 1.0 <= fwhm_pixels < 1.4 or 3.2 < fwhm_pixels <= 4.5:
            psf_score = 0.6
        else:
            psf_score = 0.1 # likely cosmic ray or optical blur

        # 4. Edge and data quality
        edge_score = 1.0 if edge_distance >= 20.0 else max(edge_distance / 20.0, 0.1)
        quality_score = min(max(quality_pct / 100.0, 0.0), 1.0)
        clearance_score = 0.6 * quality_score + 0.4 * edge_score

        # Composite weighted score
        composite = (
            0.35 * snr_score +
            0.25 * multiband_score +
            0.20 * psf_score +
            0.20 * clearance_score
        )
        
        caveats = list(self.STANDARD_CAVEATS)
        if most_match:
            caveats.append("Matches known moving Solar System body in NASA MOST database.")
        if multi_band_count < 2:
            caveats.append("Single-band detection only; high vulnerability to single-detector anomalies.")
        if fwhm_pixels < 1.2:
            caveats.append(f"Sub-pixel FWHM ({fwhm_pixels:.2f} px); high risk of cosmic ray strike.")
        if edge_distance < 15.0:
            caveats.append(f"Close to detector edge ({edge_distance:.1f} px); increased edge-diffraction risk.")
        if quality_pct < 85.0:
            caveats.append(f"Low observation quality ({quality_pct:.1f}%); dirty or high-noise pixel field.")

        if composite < 0.35:
            label = "Very Low"
        elif composite < 0.60:
            label = "Moderate"
        elif composite < 0.82:
            label = "High"
        else:
            label = "Very High"

        components = {
            "snr_component": round(snr_score, 3),
            "multiband_component": round(multiband_score, 3),
            "psf_component": round(psf_score, 3),
            "clearance_component": round(clearance_score, 3),
        }

        return ConfidenceResult(
            score=round(composite, 3),
            label=label,
            caveats=caveats,
            components=components,
        )
