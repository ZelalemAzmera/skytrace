import time
from ..ports.outbound import IFITSImageSource, IImageProcessor, ICacheService
from ...domain.entities.evidence import ComparisonResult

class CompareObservationsUC:
    def __init__(self, image_source: IFITSImageSource, processor: IImageProcessor, cache: ICacheService) -> None:
        self._source = image_source
        self._proc = processor
        self._cache = cache

    async def execute(self, obs_a_id: str, obs_b_id: str, band: int) -> ComparisonResult:
        cache_key = f"comparison:{obs_a_id}:{obs_b_id}:{band}"
        cached = await self._cache.get(cache_key)
        if cached:
            return ComparisonResult.from_dict(cached)

        image_a = await self._source.fetch(obs_a_id, band=band)
        image_b = await self._source.fetch(obs_b_id, band=band)

        aligned_a, aligned_b = await self._proc.align(image_a, image_b)
        difference, snr_map = await self._proc.subtract(aligned_a, aligned_b)
        candidates = await self._proc.detect_sources(snr_map, sigma_threshold=4.5)

        # Populate coordinates for candidates using WCS
        for c in candidates:
            try:
                sky = aligned_a.wcs.pixel_to_world(c.pixel_x, c.pixel_y)
                c.ra = float(sky.ra.deg)
                c.dec = float(sky.dec.deg)
            except Exception:
                pass

        tile_a = await self._proc.render_tile(aligned_a, scaling="zscale")
        tile_b = await self._proc.render_tile(aligned_b, scaling="zscale")
        tile_diff = await self._proc.render_diff_tile(snr_map, colormap="diverging")

        result = ComparisonResult(
            image_a=aligned_a,
            image_b=aligned_b,
            difference=difference,
            snr_map=snr_map,
            candidates=candidates,
            metadata={
                "obs_a_epoch_mjd": image_a.epoch_mjd,
                "obs_b_epoch_mjd": image_b.epoch_mjd,
                "time_delta_days": abs(image_b.epoch_mjd - image_a.epoch_mjd),
                "band": band,
                "wavelength_um": image_a.wavelength_um,
                "n_candidates": len(candidates),
                "image_width": aligned_a.shape[1],
                "image_height": aligned_a.shape[0],
            },
            tile_a_b64=tile_a,
            tile_b_b64=tile_b,
            tile_diff_b64=tile_diff,
        )

        await self._cache.set(cache_key, result.to_dict(), ttl=43200)
        return result
