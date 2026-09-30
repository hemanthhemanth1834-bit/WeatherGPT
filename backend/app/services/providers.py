"""Provider abstraction layer. Original implementation.

Every external source is registered with a live status probe. Status values:
LIVE (verified now), FALLBACK (backup path in use), ESTIMATED (computed),
STATIC (bundled reference), DEMO (illustrative), NOT_CONFIGURED (needs
credentials/access), ERROR (probe failed). Probes never raise.
"""
import time
from typing import Any, Callable, Dict, List

import requests


def _get(url: str, timeout: float = 5.0) -> Dict[str, Any]:
    start = time.time()
    try:
        response = requests.get(url, timeout=timeout)
        latency = round((time.time() - start) * 1000)
        if response.status_code == 200:
            return {"ok": True, "latency_ms": latency, "status": response.status_code}
        return {"ok": False, "latency_ms": latency, "status": response.status_code,
                "error": f"HTTP {response.status_code}"}
    except Exception as exc:
        return {"ok": False, "latency_ms": round((time.time() - start) * 1000),
                "status": None, "error": str(exc)[:120]}


def probe_open_meteo() -> Dict[str, Any]:
    return _get("https://api.open-meteo.com/v1/forecast?latitude=20&longitude=78"
                "&current=temperature_2m&timezone=Asia%2FKolkata")


def probe_geocoding() -> Dict[str, Any]:
    return _get("https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1&format=json")


def probe_air_quality() -> Dict[str, Any]:
    return _get("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=20"
                "&longitude=78&current=us_aqi&timezone=Asia%2FKolkata")


def probe_marine() -> Dict[str, Any]:
    return _get("https://marine-api.open-meteo.com/v1/marine?latitude=13&longitude=80"
                "&current=wave_height&timezone=Asia%2FKolkata")


def probe_archive() -> Dict[str, Any]:
    return _get("https://archive-api.open-meteo.com/v1/archive?latitude=20&longitude=78"
                "&start_date=2020-01-01&end_date=2020-01-02&daily=temperature_2m_max"
                "&timezone=Asia%2FKolkata")


def probe_rainviewer() -> Dict[str, Any]:
    return _get("https://api.rainviewer.com/public/weather-maps.json")


def probe_gibs() -> Dict[str, Any]:
    return _get("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_"
                "CorrectedReflectance_TrueColor/default/2026-09-28/"
                "GoogleMapsCompatible_Level9/5/18/12.jpg")


def probe_portal(url: str) -> Dict[str, Any]:
    return _get(url, timeout=8.0)


PROVIDERS: List[Dict[str, Any]] = [
    {"name": "Open-Meteo Forecast", "role": "weather", "kind": "LIVE data",
     "needs_key": False, "probe": probe_open_meteo},
    {"name": "Open-Meteo Geocoding", "role": "geocoding", "kind": "LIVE data",
     "needs_key": False, "probe": probe_geocoding},
    {"name": "Open-Meteo Air Quality", "role": "air_quality", "kind": "LIVE data",
     "needs_key": False, "probe": probe_air_quality},
    {"name": "Open-Meteo Marine", "role": "marine", "kind": "LIVE data",
     "needs_key": False, "probe": probe_marine},
    {"name": "Open-Meteo Archive (ERA5)", "role": "climate", "kind": "LIVE data",
     "needs_key": False, "probe": probe_archive},
    {"name": "GFS via Open-Meteo models", "role": "nwp", "kind": "LIVE data",
     "needs_key": False, "probe": probe_open_meteo},
    {"name": "RainViewer Radar", "role": "radar", "kind": "LIVE tiles",
     "needs_key": False, "probe": probe_rainviewer},
    {"name": "NASA GIBS Tiles", "role": "satellite", "kind": "LIVE tiles",
     "needs_key": False, "probe": probe_gibs},
    {"name": "IMD Portal", "role": "india", "kind": "portal reachable; no open data API",
     "needs_key": True, "probe": lambda: probe_portal("https://mausam.imd.gov.in/")},
    {"name": "MOSDAC / ISRO", "role": "india", "kind": "auth required",
     "needs_key": True, "probe": lambda: probe_portal("https://www.mosdac.gov.in/")},
    {"name": "INCOIS", "role": "india", "kind": "no open data API",
     "needs_key": True, "probe": lambda: probe_portal("https://incois.gov.in/")},
    {"name": "WRF feed", "role": "nwp", "kind": "no feed provisioned",
     "needs_key": True, "probe": None},
    {"name": "LLM provider", "role": "ai", "kind": "none configured; deterministic tools",
     "needs_key": True, "probe": None},
]

STATUS_UNAVAILABLE = {"OPENWEATHER": "not implemented (key-gated; OM covers needs)",
                      "WEATHERAPI": "not implemented (key-gated; OM covers needs)",
                      "NOMINATIM": "evaluated, not used (1 req/s policy; OM geocoding + cache suffice)"}


def health_snapshot(check_live: bool = True) -> Dict[str, Any]:
    """Build the provider health table. Set check_live=False for instant metadata."""
    rows = []
    for entry in PROVIDERS:
        probe: Callable[[], Dict[str, Any]] | None = entry["probe"]
        if probe is None or not check_live:
            status = "NOT_CONFIGURED"
            result: Dict[str, Any] = {"ok": False, "latency_ms": None}
        else:
            result = probe()
            status = "LIVE" if result["ok"] else "ERROR"
            if entry["role"] == "india" and result["ok"]:
                status = "AVAILABLE"
        rows.append({
            "provider": entry["name"],
            "role": entry["role"],
            "status": status,
            "latency_ms": result.get("latency_ms"),
            "coverage": entry["kind"],
            "needs_key": entry["needs_key"],
            "error": result.get("error"),
        })
    return {"providers": rows, "evaluated_not_used": STATUS_UNAVAILABLE,
            "policy": "LIVE means probed OK now. ERROR means probe failed. "
                      "NOT_CONFIGURED needs credentials or a feed."}
