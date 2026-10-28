from ..ports.outbound import IObservationRepository, ICacheService
from ...domain.entities.observation import Observation
import hashlib

class QuerySkyRegionUC:
    def __init__(self, obs_repo: IObservationRepository, cache: ICacheService) -> None:
        self._repo = obs_repo
        self._cache = cache

    async def execute(self, ra: float, dec: float, radius_deg: float, band: int | None = None) -> list[Observation]:
        key_data = f"{ra:.6f}:{dec:.6f}:{radius_deg:.4f}:{band}"
        cache_key = "obs_meta:" + hashlib.sha256(key_data.encode()).hexdigest()[:16]

        cached = await self._cache.get(cache_key)
        if cached:
            from datetime import date
            obs_list = []
            for o in cached["observations"]:
                d = dict(o)
                if isinstance(d.get("obs_date"), str):
                    d["obs_date"] = date.fromisoformat(d["obs_date"])
                obs_list.append(Observation(**d))
            return obs_list

        observations = await self._repo.search(ra, dec, radius_deg, band)
        
        # serialize to cache
        cacheable = []
        for o in observations:
            od = dict(o.__dict__)
            if hasattr(od["obs_date"], "isoformat"):
                od["obs_date"] = od["obs_date"].isoformat()
            cacheable.append(od)
            
        await self._cache.set(cache_key, {"observations": cacheable}, ttl=3600)
        return observations
