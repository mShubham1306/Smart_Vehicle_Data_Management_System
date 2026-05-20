import os
from celery import Celery
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

celery_app = Celery(
    "smart_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["tasks"]
)

# Test if Redis broker is reachable. If not, fallback to eager mode (synchronous local execution)
try:
    client = redis.from_url(CELERY_BROKER_URL, socket_connect_timeout=2)
    client.ping()
    print("[celery] Redis is running. Tasks will be sent to the broker.")
except Exception as e:
    print(f"[celery] Redis connection failed ({e}). Falling back to synchronous eager mode.")
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
