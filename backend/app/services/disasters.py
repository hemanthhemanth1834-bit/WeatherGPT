"""USGS earthquakes + NASA EONET wildfires/storms. Original implementation.

Both are free public feeds, no key. Read-only, cached, passed through with
official severities and source links. USGS events are geological — never
labelled as Indian government alerts.
"""
from typing import Any, Dict, List

from .cache import cached

HEADERS = {"User-Agent": "WeatherGPT-SIH2026/2.0 (education project)"}
QUAKE_TTL = 600
FIRE_TTL = 1800


def earthquakes(min_magnitude: float = 4.5, days: int = 7) -> Dict[str, Any]:
    """Recent earthquakes worldwide, largest first."""
    from .http import http_get

    def load() -> List[Dict[str, Any]]:
        import datetime as dt
        since = (dt.date.today() - dt.timedelta(days=max(1, min(30, days)))).isoformat()
        url = ("https://earthquake.usgs.gov/fdsnws/event/1/query"
               f"?format=geojson&starttime={since}"
               f"&minmagnitude={max(0.0, min(9.0, min_magnitude))}&limit=50&orderby=time")
        response = http_get(url, timeout=12, headers=HEADERS)
        if response.status_code != 200:
            raise RuntimeError(f"USGS HTTP {response.status_code}")
        return [_quake_feature(f) for f in response.json().get("features", [])]

    events = cached(QUAKE_TTL, f"quakes:{min_magnitude}:{days}", load)
    events = sorted(events, key=lambda e: (e["magnitude"] or 0), reverse=True)
    return {"events": events, "count": len(events),
            "data_type": "Official third-party feed (read-only)",
            "status": "LIVE", "source": "USGS Earthquake Hazards Program",
            "note": "Geological events, global. Not Indian government alerts."}


def _quake_feature(feature: Dict[str, Any]) -> Dict[str, Any]:
    props = feature.get("properties", {}) or {}
    geometry = feature.get("geometry", {}) or {}
    coords = geometry.get("coordinates", [None, None, None])
    return {
        "magnitude": props.get("mag"),
        "place": props.get("place", "Unknown location"),
        "time_ms": props.get("time"),
        "depth_km": coords[2] if len(coords) > 2 else None,
        "lat": coords[1] if len(coords) > 1 else None,
        "lon": coords[0] if len(coords) > 0 else None,
        "felt": props.get("felt"),
        "tsunami": bool(props.get("tsunami", 0)),
        "url": props.get("url", "https://earthquake.usgs.gov/"),
        "source": "USGS Earthquake Hazards Program",
        "status": "OFFICIAL third-party feed",
    }


def wildfires(limit: int = 20) -> Dict[str, Any]:
    """Open EONET wildfire events with acquisition info."""
    from .http import http_get

    def load() -> List[Dict[str, Any]]:
        url = ("https://eonet.gsfc.nasa.gov/api/v3/events"
               f"?status=open&limit={max(1, min(50, limit))}&category=wildfires")
        response = http_get(url, timeout=12, headers=HEADERS)
        if response.status_code != 200:
            raise RuntimeError(f"EONET HTTP {response.status_code}")
        out = []
        for event in response.json().get("events", []):
            geometries = event.get("geometry", []) or event.get("geometries", []) or []
            latest = geometries[-1] if geometries else {}
            coords = (latest.get("coordinates", [None, None])
                      if isinstance(latest, dict) else [None, None])
            sources = event.get("sources", []) or []
            out.append({
                "title": event.get("title", "Wildfire"),
                "location": _fire_place(event.get("title", "")),
                "date": latest.get("date", "") if isinstance(latest, dict) else "",
                "lat": coords[1] if len(coords) > 1 else None,
                "lon": coords[0] if len(coords) > 0 else None,
                "satellite": (sources[0].get("id", "") if sources else ""),
                "report_url": event.get("link", "https://eonet.gsfc.nasa.gov/"),
                "source": "NASA EONET",
                "status": "OFFICIAL third-party feed",
            })
        return out

    events = cached(FIRE_TTL, f"fires:{limit}", load)
    return {"events": events, "count": len(events),
            "data_type": "Official third-party feed (read-only)",
            "status": "LIVE", "source": "NASA EONET (MODIS/VIIRS detections)",
            "note": "Satellite hotspot detections, global. Verify with local authorities."}


def _fire_place(title: str) -> str:
    """EONET wildfire titles look like 'Wildfire X, County, State'."""
    parts = [p.strip() for p in title.split(",")]
    return ", ".join(parts[1:]) if len(parts) > 1 else title
