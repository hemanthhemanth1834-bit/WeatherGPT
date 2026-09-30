"""Tiny in-memory TTL cache to avoid repeatedly requesting the same weather data."""
import time
from typing import Any, Callable, Dict, Tuple

_cache: Dict[str, Tuple[float, Any]] = {}


def cached(ttl_seconds: int, key: str, loader: Callable[[], Any]) -> Any:
    now = time.time()
    if key in _cache:
        expires_at, value = _cache[key]
        if now < expires_at:
            return value
    value = loader()
    _cache[key] = (now + ttl_seconds, value)
    return value


def clear_cache() -> None:
    _cache.clear()
