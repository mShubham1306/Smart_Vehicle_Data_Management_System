import os
from slowapi import Limiter
from slowapi.util import get_remote_address

_redis_url = os.getenv("REDIS_URL", "").strip()


def _make_limiter() -> Limiter:
    """
    Use Redis for rate limits only when REDIS_URL is set AND reachable.
    On Render, a bad/unreachable REDIS_URL used to crash auth endpoints with 500.
    """
    if _redis_url:
        try:
            import redis
            client = redis.from_url(_redis_url, socket_connect_timeout=3, socket_timeout=3)
            client.ping()
            print("[limiter] Using Redis rate-limit storage")
            return Limiter(key_func=get_remote_address, storage_uri=_redis_url)
        except Exception as exc:
            print(f"[limiter] Redis unavailable ({exc}); falling back to in-memory storage")
    return Limiter(key_func=get_remote_address)


limiter = _make_limiter()
