"""Shared outbound HTTP with timeout, retry, and backoff. Original implementation.

All provider calls go through here so transient failures get a second
chance while total added latency stays bounded (~1s worst case).
Callers keep their existing try/except contracts: after the final retry
the last exception (or HTTP error) propagates.
"""
import time
from typing import Any

import requests

DEFAULT_RETRIES = 2
DEFAULT_BACKOFF = 0.4


def _call(method: str, url: str, timeout: float, retries: int,
          backoff: float, **kwargs: Any) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            response = requests.request(method, url, timeout=timeout, **kwargs)
            if response.status_code in (429, 500, 502, 503, 504):
                last_error = RuntimeError(f"HTTP {response.status_code} for {url}")
            else:
                return response
        except Exception as exc:  # network error, DNS, timeout
            last_error = exc
        if attempt < retries:
            time.sleep(backoff * (2 ** attempt))
    raise last_error if last_error is not None else RuntimeError(f"request failed: {url}")


def http_get(url: str, timeout: float = 5.0, retries: int = DEFAULT_RETRIES,
             backoff: float = DEFAULT_BACKOFF, **kwargs: Any) -> requests.Response:
    """GET with retries. Raises on final failure."""
    return _call("GET", url, timeout, retries, backoff, **kwargs)


def http_post(url: str, timeout: float = 10.0, retries: int = 1,
              backoff: float = DEFAULT_BACKOFF, **kwargs: Any) -> requests.Response:
    """POST with one retry (non-idempotent safety: single retry only)."""
    return _call("POST", url, timeout, retries, backoff, **kwargs)
