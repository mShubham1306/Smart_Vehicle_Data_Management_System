import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# When REDIS_URL is set (and multiple gunicorn workers are running),
# use Redis as shared storage so rate limits are enforced globally
# across all workers — not per-worker.
# Falls back to in-memory storage if Redis is not configured.
_redis_url = os.getenv("REDIS_URL", "")

if _redis_url:
    limiter = Limiter(key_func=get_remote_address, storage_uri=_redis_url)
else:
    # In-memory: safe for single-worker local dev; use Redis in production.
    limiter = Limiter(key_func=get_remote_address)
