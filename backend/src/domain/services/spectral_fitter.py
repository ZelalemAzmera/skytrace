"""Spectral template fitting across 102 SPHEREx spectroscopic bands."""
import math
import numpy as np
from ..entities.sed import SpectralPoint, SpectralEnergyDistribution

class SpectralTemplateFitter:
    WAVELENGTHS = [0.75 * ((5.0 / 0.75) ** (i / 101.0)) for i in range(102)]

    @classmethod
    def _generate_template(cls, template_name: str) -> np.ndarray:
        waves = np.array(cls.WAVELENGTHS)
        if template_name == "Y-Dwarf":
            # Y-dwarf: deep H2O absorption at 1.4, 1.9 um; CH4 absorption at 3.3 um; H-band peak at 1.66 um
            flux = np.exp(-((waves - 1.66) ** 2) / (2 * 0.15 ** 2))
            # secondary peak at 4.6 um
            flux += 0.7 * np.exp(-((waves - 4.6) ** 2) / (2 * 0.25 ** 2))
            # dips
            flux *= (1.0 - 0.75 * np.exp(-((waves - 3.3) ** 2) / (2 * 0.12 ** 2)))
            flux *= (1.0 - 0.65 * np.exp(-((waves - 1.4) ** 2) / (2 * 0.08 ** 2)))
        elif template_name == "Methane Ice":
            # Methane ice: sharp absorption dips at 1.67, 2.32, 3.32 um
            flux = 1.0 - 0.85 * np.exp(-((waves - 3.32) ** 2) / (2 * 0.08 ** 2))
            flux -= 0.60 * np.exp(-((waves - 2.32) ** 2) / (2 * 0.06 ** 2))
            flux -= 0.40 * np.exp(-((waves - 1.67) ** 2) / (2 * 0.05 ** 2))
            flux = np.clip(flux, 0.05, 1.0)
        elif template_name == "High-z Galaxy":
            # Redshifted galaxy: power law continuum with break
            flux = (waves / 1.0) ** (-1.2)
            flux[waves < 1.2] *= 0.25 # break
        elif template_name == "Comet":
            # Comet: solar reflection (falls with wavelength) + organic/CO2 emission bumps at 3.3 & 4.26 um
            flux = (0.75 / waves) ** 1.5
            flux += 0.8 * np.exp(-((waves - 3.3) ** 2) / (2 * 0.07 ** 2))
            flux += 1.2 * np.exp(-((waves - 4.26) ** 2) / (2 * 0.09 ** 2))
        else:
            flux = np.ones_like(waves)
            
        # normalize template peak to 1.0
        return flux / np.max(flux)

    @classmethod
    def fit(cls, points: list[SpectralPoint]) -> tuple[str, float]:
        """Fit observed points against the 4 spectral templates.
        
        Returns:
            (best_template_name, reduced_chi_squared)
        """
        if not points:
            return ("Unknown", 999.0)

        obs_waves = np.array([p.wavelength_um for p in points])
        obs_flux = np.array([p.flux_density for p in points])
        obs_err = np.array([max(p.flux_uncertainty, 1e-4) for p in points])

        templates = ["Y-Dwarf", "Methane Ice", "High-z Galaxy", "Comet"]
        best_name = "Unknown"
        best_chi2 = float("inf")

        all_waves = np.array(cls.WAVELENGTHS)

        for name in templates:
            t_flux = cls._generate_template(name)
            # interpolate template to observed wavelengths
            model_flux = np.interp(obs_waves, all_waves, t_flux)
            
            # optimal scale factor alpha = sum(obs * model / err^2) / sum(model^2 / err^2)
            w = 1.0 / (obs_err ** 2)
            alpha = np.sum(obs_flux * model_flux * w) / max(np.sum((model_flux ** 2) * w), 1e-8)
            alpha = max(alpha, 1e-6)

            scaled_model = alpha * model_flux
            chi2 = np.sum(((obs_flux - scaled_model) / obs_err) ** 2)
            dof = max(len(points) - 1, 1)
            red_chi2 = float(chi2 / dof)

            if red_chi2 < best_chi2:
                best_chi2 = red_chi2
                best_name = name

        return (best_name, round(best_chi2, 3))
