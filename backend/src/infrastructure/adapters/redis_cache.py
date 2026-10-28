import json
import time

class RedisCache:
    def __init__(self, redis_url: str) -> None:
        self._memory_cache: dict[str, tuple[float, str]] = {}
        self._client = None
        try:
            import redis.asyncio as aioredis
            self._client = aioredis.from_url(redis_url, decode_responses=False)
        except Exception:
            self._client = None

    async def get(self, key: str) -> dict | None:
        if self._client:
            try:
                raw = await self._client.get(key)
                if raw:
                    return json.loads(raw)
            except Exception:
                pass
        
        # in-memory fallback
        if key in self._memory_cache:
            exp, val = self._memory_cache[key]
            if time.time() < exp:
                return json.loads(val)
            del self._memory_cache[key]
        return None

    async def set(self, key: str, value: dict, ttl: int = 3600) -> None:
        val_str = json.dumps(value)
        if self._client:
            try:
                await self._client.set(key, val_str, ex=ttl)
                return
            except Exception:
                pass
        self._memory_cache[key] = (time.time() + ttl, val_str)

    async def get_bytes(self, key: str) -> bytes | None:
        if self._client:
            try:
                return await self._client.get(key)
            except Exception:
                pass
        return None

    async def set_bytes(self, key: str, value: bytes, ttl: int = 86400) -> None:
        if self._client:
            try:
                await self._client.set(key, value, ex=ttl)
            except Exception:
                pass

    async def close(self) -> None:
        if self._client:
            try:
                await self._client.aclose()
            except Exception:
                pass
