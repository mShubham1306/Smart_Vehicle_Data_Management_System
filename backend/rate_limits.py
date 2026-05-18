"""
Smart Rate Limiting by User Tier
Ready to integrate with FastAPI rate limiting
"""

from typing import Dict, Optional

# Tier-based rate limits (requests per hour)
RATE_LIMITS: Dict[str, str] = {
    "free": "100/hour",        # Free tier: 100 requests/hour
    "premium": "10000/hour",   # Premium: 10K requests/hour
    "enterprise": "unlimited", # Enterprise: no limits
    "admin": "unlimited",      # Admins: no limits
}

# Burst limits (requests per minute for burst protection)
BURST_LIMITS: Dict[str, int] = {
    "free": 10,        # 10 req/min
    "premium": 500,    # 500 req/min
    "enterprise": None,  # No burst limit
    "admin": None,
}


async def get_user_rate_limit(current_user: Optional[Dict]) -> str:
    """
    Get rate limit for current user based on tier
    
    Args:
        current_user: User object from auth dependency
        
    Returns:
        Rate limit string (e.g., "100/hour")
    """
    if not current_user:
        return RATE_LIMITS["free"]
    
    # Get user tier (default to free)
    tier = current_user.get("tier", "free").lower()
    
    # Validate tier
    if tier not in RATE_LIMITS:
        tier = "free"
    
    return RATE_LIMITS[tier]


async def get_user_burst_limit(current_user: Optional[Dict]) -> Optional[int]:
    """
    Get burst limit (per minute) for current user
    
    Args:
        current_user: User object from auth dependency
        
    Returns:
        Max requests per minute, or None for unlimited
    """
    if not current_user:
        return BURST_LIMITS["free"]
    
    tier = current_user.get("tier", "free").lower()
    
    if tier not in BURST_LIMITS:
        tier = "free"
    
    return BURST_LIMITS[tier]


# Endpoint-specific rate limits (stricter for expensive operations)
ENDPOINT_LIMITS: Dict[str, Dict[str, str]] = {
    # Expensive operations get stricter limits
    "POST /api/upload": {
        "free": "5/hour",
        "premium": "100/hour",
        "enterprise": "unlimited",
        "admin": "unlimited"
    },
    "POST /api/export": {
        "free": "3/hour",
        "premium": "50/hour",
        "enterprise": "unlimited",
        "admin": "unlimited"
    },
    "GET /api/search": {
        "free": "30/hour",
        "premium": "1000/hour",
        "enterprise": "unlimited",
        "admin": "unlimited"
    },
    # Cheap read operations can use default limits
}


async def get_endpoint_rate_limit(endpoint: str, current_user: Optional[Dict]) -> Optional[str]:
    """
    Get rate limit for a specific endpoint
    
    Args:
        endpoint: The endpoint path (e.g., "POST /api/upload")
        current_user: User object from auth dependency
        
    Returns:
        Rate limit string if specific limit exists, else None (use default)
    """
    if endpoint not in ENDPOINT_LIMITS:
        return None
    
    if not current_user:
        tier = "free"
    else:
        tier = current_user.get("tier", "free").lower()
    
    return ENDPOINT_LIMITS[endpoint].get(tier, None)


# Example usage in main.py:
"""
from rate_limits import get_user_rate_limit
from slowapi.util import get_remote_address
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/upload")
@limiter.limit("5/hour")  # Default, can be overridden per user
async def upload(file: UploadFile, current_user: Dict = Depends(get_current_user)):
    # Rate limiting is applied by middleware
    pass
"""
