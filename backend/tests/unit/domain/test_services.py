import pytest
import math
import numpy as np
from src.domain.services.coordinate_service import CoordinateService
from src.domain.services.parallax_calculator import ParallaxCalculator
from src.domain.services.spectral_fitter import SpectralTemplateFitter
from src.domain.services.confidence_scorer import ConfidenceScorer
from src.domain.services.artifact_checker import ArtifactChecker
from src.domain.entities.sed import SpectralPoint

# 1. CoordinateService Tests
def test_coordinate_unit_vectors():
    # Test cardinal directions
    x, y, z = CoordinateService.to_unit_vector(0.0, 0.0)
    assert math.isclose(x, 1.0, abs_tol=1e-5)
    assert math.isclose(y, 0.0, abs_tol=1e-5)
    assert math.isclose(z, 0.0, abs_tol=1e-5)

    x, y, z = CoordinateService.to_unit_vector(90.0, 0.0)
    assert math.isclose(x, 0.0, abs_tol=1e-5)
    assert math.isclose(y, 1.0, abs_tol=1e-5)
    assert math.isclose(z, 0.0, abs_tol=1e-5)

    x, y, z = CoordinateService.to_unit_vector(0.0, 90.0)
    assert math.isclose(x, 0.0, abs_tol=1e-5)
    assert math.isclose(y, 0.0, abs_tol=1e-5)
    assert math.isclose(z, 1.0, abs_tol=1e-5)

def test_coordinate_roundtrip():
    test_coords = [(45.0, 30.0), (180.0, -45.0), (275.5, 12.3)]
    for ra, dec in test_coords:
        vec = CoordinateService.to_unit_vector(ra, dec)
        r_ra, r_dec = CoordinateService.from_unit_vector(*vec)
        assert math.isclose(ra, r_ra, abs_tol=1e-4)
        assert math.isclose(dec, r_dec, abs_tol=1e-4)

def test_coordinate_invalid_ranges():
    with pytest.raises(ValueError):
        CoordinateService.validate_icrs(-1.0, 0.0)
    with pytest.raises(ValueError):
        CoordinateService.validate_icrs(365.0, 0.0)
    with pytest.raises(ValueError):
        CoordinateService.validate_icrs(100.0, -95.0)

# 2. ParallaxCalculator Tests
def test_parallax_calculation():
    # 1.0 pixel shift with SPHEREx 6.2 arcsec/px scale
    result = ParallaxCalculator.calculate(pixel_shift=1.0)
    assert result.proper_motion_arcsec == 6.2
    assert result.parallax_arcsec == 3.1
    # distance = 1 / 3.1 ~ 0.3226 pc
    assert math.isclose(result.distance_pc, 0.32, abs_tol=0.05)
    assert result.is_bound is True

def test_parallax_zero_shift():
    result = ParallaxCalculator.calculate(pixel_shift=0.0)
    assert result.distance_pc is None
    assert result.is_bound is False

# 3. SpectralTemplateFitter Tests
def test_spectral_fitter_y_dwarf():
    waves = SpectralTemplateFitter.WAVELENGTHS
    # Generate noisy Y-dwarf points
    t_flux = SpectralTemplateFitter._generate_template("Y-Dwarf")
    points = [
        SpectralPoint(band_index=i, wavelength_um=waves[i], flux_density=float(t_flux[i]), flux_uncertainty=0.05)
        for i in range(0, len(waves), 4) # sample 26 bands
    ]
    best_name, red_chi2 = SpectralTemplateFitter.fit(points)
    assert best_name == "Y-Dwarf"
    assert red_chi2 < 1.0

def test_spectral_fitter_methane():
    waves = SpectralTemplateFitter.WAVELENGTHS
    t_flux = SpectralTemplateFitter._generate_template("Methane Ice")
    points = [
        SpectralPoint(band_index=i, wavelength_um=waves[i], flux_density=float(t_flux[i]), flux_uncertainty=0.05)
        for i in range(0, len(waves), 4)
    ]
    best_name, red_chi2 = SpectralTemplateFitter.fit(points)
    assert best_name == "Methane Ice"
    assert red_chi2 < 1.0

# 4. ConfidenceScorer Tests
def test_confidence_scorer_high():
    scorer = ConfidenceScorer()
    res = scorer.score(
        snr=15.0,
        quality_pct=95.0,
        most_match=False,
        multi_band_count=5,
        fwhm_pixels=2.1,
        edge_distance=45.0,
    )
    assert res.score >= 0.8
    assert res.label in ["High", "Very High"]
    assert len(res.caveats) >= 2

def test_confidence_scorer_cosmic_ray():
    scorer = ConfidenceScorer()
    res = scorer.score(
        snr=5.0,
        quality_pct=60.0,
        most_match=False,
        multi_band_count=1,
        fwhm_pixels=0.8, # sharp cosmic ray
        edge_distance=8.0,
    )
    assert res.score < 0.4
    assert res.label == "Very Low"
    assert any("cosmic ray" in c for c in res.caveats)

# 5. ArtifactChecker Tests
def test_artifact_checker():
    # Near edge
    is_art, prob, reasons = ArtifactChecker.is_artifact(
        pixel_x=4.0, pixel_y=50.0, image_shape=(100, 100), fwhm_pixels=2.0
    )
    assert is_art is True
    assert prob >= 0.5
    assert any("edge" in r for r in reasons)

    # Clean center
    is_art, prob, reasons = ArtifactChecker.is_artifact(
        pixel_x=50.0, pixel_y=50.0, image_shape=(100, 100), fwhm_pixels=2.0
    )
    assert is_art is False
    assert prob < 0.2
