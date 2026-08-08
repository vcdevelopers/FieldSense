from django.core.cache import cache

BLOCKLIST_PREFIX = "jwt_blocklist:"


def is_jti_blocklisted(jti: str) -> bool:
    """Checks if a JTI claim is stored in Redis/Cache blocklist."""
    if not jti:
        return False
    return bool(cache.get(f"{BLOCKLIST_PREFIX}{jti}"))


def blocklist_jti(jti: str, ttl_seconds: int = 86400) -> bool:
    """Stores a JTI claim in Redis/Cache blocklist for specified TTL."""
    if not jti:
        return False
    cache.set(f"{BLOCKLIST_PREFIX}{jti}", True, timeout=ttl_seconds)
    return True
