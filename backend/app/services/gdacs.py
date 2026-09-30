"""Global disaster events via the public GDACS API (UN JRC cooperation).

Free, no key. Read-only polling with a 30-minute cache. Entries are passed
through with their official alert levels and report links — never altered
into IMD bulletins. India-relevant items are flagged, not fabricated.
"""
from typing import Any, Dict, List

import requests

from .cache import cached

API = ("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH")
HEADERS = {"User-Agent": "WeatherGPT-SIH2026/2.0 (education project)"}
TTL = 1800

TYPE_LABELS = {
    "TC": "Tropical Cyclone", "FL": "Flood", "DR": "Drought",
    "EQ": "Earthquake", "VO": "Volcano", "WF": "Wild Fire",
}

INDIA_ISO = {"IND"}
INDIA_WORDS = ("india", "bay of bengal", "arabian sea", "andaman", "nicobar")


def _near_india(props: Dict[str, Any]) -> bool:
    iso = str(props.get("iso3", "")).upper()
    if iso in INDIA_ISO:
        return True
    blob = f"{props.get('name', '')} {props.get('country', '')} " \
           f"{props.get('affectedcountries', '')}".lower()
    return any(w in blob for w in INDIA_WORDS)


def normalize(feature: Dict[str, Any]) -> Dict[str, Any]:
    """Pick the stable fields we display from one GDACS feature."""
    props = feature.get("properties", {}) or {}
    geometry = feature.get("geometry", {}) or {}
    coords = geometry.get("coordinates", [None, None])
    urls = props.get("url", {}) or {}
    severity = props.get("severitydata", {}) or {}
    return {
        "event_type": props.get("eventtype", "?"),
        "event_label": TYPE_LABELS.get(props.get("eventtype", ""), props.get("eventtype", "?")),
        "name": props.get("name", "Unnamed event"),
        "countries": props.get("country", ""),
        "alert_level": props.get("alertlevel", "Green"),
        "severity": (severity.get("severity") if isinstance(severity, dict) else None) or props.get("episodealertlevel", ""),
        "from": props.get("fromdate", ""),
        "to": props.get("todate", ""),
        "is_current": bool(props.get("iscurrent", False)),
        "near_india": _near_india(props),
        "lat": coords[1] if len(coords) > 1 else None,
        "lon": coords[0] if len(coords) > 0 else None,
        "report_url": urls.get("report", "https://www.gdacs.org/"),
        "source": "GDACS (UN JRC)",
        "status": "OFFICIAL third-party feed",
    }


def _download() -> List[Dict[str, Any]]:
    response = requests.get(API, timeout=12, headers=HEADERS)
    if response.status_code != 200:
        raise RuntimeError(f"GDACS HTTP {response.status_code}")
    features = response.json().get("features", [])
    return [normalize(f) for f in features]


def global_disasters(region: str = "world") -> Dict[str, Any]:
    """Recent global events; region=india filters to India-relevant ones."""
    events = cached(TTL, "gdacs:events", _download)
    if region.lower() == "india":
        events = [e for e in events if e["near_india"]]
    return {
        "events": events,
        "count": len(events),
        "region": region,
        "data_type": "Official third-party feed (read-only)",
        "status": "LIVE",
        "source": "GDACS (UN JRC) public API",
        "disclaimer": "Global events for context; Indian official warnings come only from IMD/NDMA.",
    }
