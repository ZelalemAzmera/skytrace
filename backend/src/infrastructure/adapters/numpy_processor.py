import asyncio
import base64
import io
import numpy as np
from PIL import Image
from astropy.visualization import ZScaleInterval
from reproject import reproject_interp
from photutils.detection import DAOStarFinder
from astropy.stats import sigma_clipped_stats

from ...domain.entities.fits_image import FITSImage
from ...domain.entities.candidate import Candidate
from ...domain.services.artifact_checker import ArtifactChecker

class NumpyImageProcessor:
    async def align(self, image_a: FITSImage, image_b: FITSImage) -> tuple[FITSImage, FITSImage]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._align_sync, image_a, image_b)

    def _align_sync(self, image_a: FITSImage, image_b: FITSImage) -> tuple[FITSImage, FITSImage]:
        try:
            data_b_reproj, footprint = reproject_interp(
                (np.nan_to_num(image_b.data, nan=0.0), image_b.wcs),
                image_a.wcs,
                shape_out=image_a.shape,
            )
            var_b_reproj, _ = reproject_interp(
                (image_b.variance, image_b.wcs),
                image_a.wcs,
                shape_out=image_a.shape,
            )
            data_b_aligned = np.where(footprint, data_b_reproj, np.nan)
        except Exception:
            data_b_aligned = image_b.data
            var_b_reproj = image_b.variance

        image_b_aligned = FITSImage(
            data=data_b_aligned.astype(np.float32),
            variance=var_b_reproj.astype(np.float32),
            flags=image_b.flags,
            wcs=image_a.wcs,
            epoch_mjd=image_b.epoch_mjd,
            wavelength_um=image_b.wavelength_um,
            band_index=image_b.band_index,
            obs_id=image_b.obs_id,
            quality_pct=image_b.quality_pct,
        )
        return image_a, image_b_aligned

    async def subtract(self, image_a: FITSImage, image_b: FITSImage) -> tuple[np.ndarray, np.ndarray]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._subtract_sync, image_a, image_b)

    def _subtract_sync(self, image_a: FITSImage, image_b: FITSImage) -> tuple[np.ndarray, np.ndarray]:
        a_clean = np.nan_to_num(image_a.data, nan=0.0)
        b_clean = np.nan_to_num(image_b.data, nan=0.0)

        difference = b_clean - a_clean  # positive means epoch B is brighter
        sigma_diff = np.sqrt(
            np.nan_to_num(image_a.variance, nan=1.0) +
            np.nan_to_num(image_b.variance, nan=1.0)
        )
        sigma_diff = np.where(sigma_diff <= 0, 1e-6, sigma_diff)
        snr_map = difference / sigma_diff
        return difference, snr_map

    async def detect_sources(self, snr_map: np.ndarray, sigma_threshold: float = 4.5) -> list[Candidate]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._detect_sync, snr_map, sigma_threshold)

    def _detect_sync(self, snr_map: np.ndarray, sigma_threshold: float) -> list[Candidate]:
        clean_snr = np.nan_to_num(snr_map, nan=0.0)
        mean, median, std = sigma_clipped_stats(clean_snr, sigma=3.0)

        daofind = DAOStarFinder(fwhm=2.2, threshold=sigma_threshold * max(std, 0.5))
        sources = daofind(clean_snr - median)

        if sources is None or len(sources) == 0:
            # Fallback: check manual local maxima if DAOStarFinder didn't find point sources
            max_val = np.max(clean_snr)
            if max_val >= sigma_threshold:
                y, x = np.unravel_index(np.argmax(clean_snr), clean_snr.shape)
                c = Candidate(
                    ra=0.0, dec=0.0, pixel_x=float(x), pixel_y=float(y),
                    snr_change=float(max_val), delta_flux=float(max_val * 15.0),
                    delta_flux_sigma=15.0, motion_arcsec=0.0,
                    artifact_probability=0.1, confidence_score=min(max_val / 20.0, 0.98),
                )
                return [c]
            return []

        candidates = []
        for row in sources:
            # photutils 3.x uses x_centroid / y_centroid; photutils 1.x used xcentroid / ycentroid
            x_val = float(row["x_centroid"] if "x_centroid" in row.colnames else row["xcentroid"])
            y_val = float(row["y_centroid"] if "y_centroid" in row.colnames else row["ycentroid"])
            x, y = int(x_val), int(y_val)
            if y >= clean_snr.shape[0] or x >= clean_snr.shape[1]:
                continue
            snr = float(clean_snr[y, x])
            if abs(snr) < sigma_threshold:
                continue

            # Artifact check
            fwhm = float(row.get("fwhm", 2.2)) if "fwhm" in row.colnames else 2.2
            is_art, art_prob, _ = ArtifactChecker.is_artifact(
                pixel_x=float(x), pixel_y=float(y),
                image_shape=clean_snr.shape, fwhm_pixels=fwhm,
            )

            conf = min(max(abs(snr) / 18.0, 0.1) * (1.0 - 0.5 * art_prob), 0.99)

            c = Candidate(
                ra=0.0, dec=0.0,
                pixel_x=float(x), pixel_y=float(y),
                snr_change=snr,
                delta_flux=float(row["peak"]) if "peak" in row.colnames else float(abs(snr)*10.0),
                delta_flux_sigma=float(row["peak"]) / max(abs(snr), 1e-4) if "peak" in row.colnames else 1.0,
                motion_arcsec=0.0,
                artifact_probability=art_prob,
                confidence_score=round(conf, 3),
            )
            candidates.append(c)

        return sorted(candidates, key=lambda c: abs(c.snr_change), reverse=True)[:25]

    async def render_tile(self, image: FITSImage, scaling: str = "zscale") -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._render_tile_sync, image.data, scaling, "gray")

    async def render_diff_tile(self, diff_array: np.ndarray, colormap: str = "diverging") -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._render_tile_sync, diff_array, "linear", colormap)

    def _render_tile_sync(self, data: np.ndarray, scaling: str, colormap: str) -> str:
        clean = np.nan_to_num(data, nan=0.0)

        if scaling == "zscale":
            try:
                interval = ZScaleInterval()
                vmin, vmax = interval.get_limits(clean)
            except Exception:
                vmin, vmax = float(np.percentile(clean, 1)), float(np.percentile(clean, 99))
        else:
            vmin, vmax = float(np.percentile(clean, 1)), float(np.percentile(clean, 99))

        if vmax <= vmin:
            vmax = vmin + 1e-5

        norm = np.clip((clean - vmin) / (vmax - vmin), 0.0, 1.0)

        if colormap == "diverging":
            # Cyan for negative change, Red/Orange for positive change
            # zero difference maps to neutral dark space
            scaled = (clean - np.median(clean)) / (np.std(clean) + 1e-5)
            r = np.clip(scaled * 60 + 20, 0, 255).astype(np.uint8)
            b = np.clip(-scaled * 60 + 20, 0, 255).astype(np.uint8)
            g = np.full_like(r, 20)
            rgb = np.stack([r, g, b], axis=-1)
            img = Image.fromarray(rgb, mode="RGB")
        else:
            uint8 = (norm * 255).astype(np.uint8)
            img = Image.fromarray(uint8, mode="L")

        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
