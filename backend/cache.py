"""
Advanced Caching Layer
Ready to use in backend/cache.py
"""

import redis.asyncio as redis
import json
import hashlib
import logging
from datetime import timedelta
from typing import Optional, Any, Dict
import os

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Production-grade caching layer with TTL management and pattern invalidation
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://redis:6379/0")
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Initialize Redis connection"""
        self.redis = await redis.from_url(self.redis_url, decode_responses=False)
        logger.info("✓ Connected to Redis cache")
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
    
    def _make_key(self, prefix: str, *args) -> str:
        """Generate cache key from prefix and arguments"""
        key_parts = [prefix] + [str(arg) for arg in args]
        return ":".join(key_parts)
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve from cache"""
        try:
            if not self.redis:
                return None
            
            value = await self.redis.get(key)
            if value:
                logger.debug(f"🟢 Cache HIT: {key}")
                return json.loads(value)
            
            logger.debug(f"🔴 Cache MISS: {key}")
            return None
        except Exception as e:
            logger.warning(f"Cache read error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Store in cache with TTL (seconds)"""
        try:
            if not self.redis:
                return False
            
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
            logger.debug(f"✓ Cached {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
            return False
    
    async def delete(self, key: str):
        """Delete specific cache key"""
        try:
            if self.redis:
                await self.redis.delete(key)
                logger.debug(f"🗑️ Deleted cache: {key}")
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
    
    async def invalidate_pattern(self, pattern: str):
        """Delete all keys matching pattern (e.g., "user:123:*")"""
        try:
            if not self.redis:
                return
            
            cursor = 0
            count = 0
            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern)
                if keys:
                    await self.redis.delete(*keys)
                    count += len(keys)
                if cursor == 0:
                    break
            
            if count > 0:
                logger.info(f"🗑️ Invalidated {count} cache entries for pattern: {pattern}")
        except Exception as e:
            logger.warning(f"Pattern invalidation error: {e}")
    
    async def clear_all(self):
        """Flush all cache (use with caution!)"""
        try:
            if self.redis:
                await self.redis.flushdb()
                logger.warning("⚠️ Cache completely cleared")
        except Exception as e:
            logger.warning(f"Cache flush error: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            if not self.redis:
                return {}
            
            info = await self.redis.info()
            return {
                "used_memory": info.get("used_memory_human", "N/A"),
                "keys_count": await self.redis.dbsize(),
                "connected_clients": info.get("connected_clients", 0),
            }
        except Exception as e:
            logger.warning(f"Stats retrieval error: {e}")
            return {}


# ============================================================================
# CACHING PATTERNS & RECIPES
# ============================================================================

class UserCache:
    """Cache layer for user-related data"""
    
    def __init__(self, cache: CacheManager):
        self.cache = cache
        self.ttl = 3600  # 1 hour
    
    async def get_user_profile(self, user_id: str):
        """Get cached user profile"""
        key = self.cache._make_key("user:profile", user_id)
        return await self.cache.get(key)
    
    async def set_user_profile(self, user_id: str, profile: Dict):
        """Cache user profile"""
        key = self.cache._make_key("user:profile", user_id)
        await self.cache.set(key, profile, self.ttl)
    
    async def invalidate_user(self, user_id: str):
        """Clear all user-related caches"""
        pattern = f"user:{user_id}:*"
        await self.cache.invalidate_pattern(pattern)
        logger.info(f"Invalidated all caches for user {user_id}")


class VehicleCache:
    """Cache layer for vehicle data"""
    
    def __init__(self, cache: CacheManager):
        self.cache = cache
        self.ttl = 300  # 5 minutes (hot data changes frequently)
    
    async def get_user_vehicles(self, user_id: str, sheet_name: str = "default"):
        """Get cached vehicle list"""
        key = self.cache._make_key("vehicles:list", user_id, sheet_name)
        return await self.cache.get(key)
    
    async def set_user_vehicles(self, user_id: str, sheet_name: str, vehicles: list):
        """Cache vehicle list"""
        key = self.cache._make_key("vehicles:list", user_id, sheet_name)
        await self.cache.set(key, {"data": vehicles}, self.ttl)
    
    async def invalidate_user_vehicles(self, user_id: str):
        """Clear vehicle cache when data changes"""
        pattern = f"vehicles:list:{user_id}:*"
        await self.cache.invalidate_pattern(pattern)


class SheetCache:
    """Cache layer for sheet metadata"""
    
    def __init__(self, cache: CacheManager):
        self.cache = cache
        self.ttl = 1800  # 30 minutes
    
    async def get_sheets(self, user_id: str):
        """Get cached sheet list with counts"""
        key = self.cache._make_key("sheets:list", user_id)
        return await self.cache.get(key)
    
    async def set_sheets(self, user_id: str, sheets: list):
        """Cache sheet list"""
        key = self.cache._make_key("sheets:list", user_id)
        await self.cache.set(key, {"data": sheets}, self.ttl)
    
    async def invalidate_sheets(self, user_id: str):
        """Invalidate sheet cache"""
        key = self.cache._make_key("sheets:list", user_id)
        await self.cache.delete(key)


# ============================================================================
# INTEGRATION HELPER
# ============================================================================

def cache_key(*args, **kwargs) -> str:
    """Generate cache key from args"""
    parts = [str(a) for a in args]
    parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
    return ":".join(parts)


# Example usage decorator (optional)
def cached(ttl: int = 3600, key_builder=None):
    """Decorator for caching function results
    
    Usage:
        @cached(ttl=300)
        async def get_user_stats(user_id: str):
            # Your logic here
            pass
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would need to be modified for your specific use case
            # For now, just call the function
            return await func(*args, **kwargs)
        return wrapper
    return decorator
