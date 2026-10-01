"""Unified India alert layer. Original implementation.

Fuses, without mixing provenance:
  - computed station alerts (COMPUTED, unofficial),
  - GDACS events touching India (OFFICIAL third-party),
  - USGS tsunami-flagged quakes in the India window (OFFICIAL third-party).
Each item carries source, source_type, official flag, timestamps, geometry.
"""
from typing import Any, Dict, List

from .alerts import active_alerts
from .gdacs import global_disasters

INDIA_LAT = (4.0, 36.0)
INDIA_LON = (64.0, 96.0)


def _in_india_window(lat: Any, lon: Any) -> bool:
    try:
        return (INDIA_LAT[0] <= float(lat) <= INDIA_LAT[1]
                and INDIA_LON[0] <= float(lon) <= INDIA_LON[1])
    except (TypeError, ValueError):
        return False


def india_alert_layer(state: str | None = None) -> Dict[str, Any]:
    """Build the India-focused feed. Never raises for provider trouble."""
    items: List[Dict[str, Any]] = []

    try:
        computed = active_alerts(state=state)
    except Exception:
        computed = []
    for alert in computed:
        items.append({
            "source": alert.sender_name,
            "source_type": "COMPUTED",
            "official": False,
            "event": alert.event,
            "severity": alert.severity,
            "headline": alert.headline,
            "area": alert.area_desc,
            "issued_at": alert.effective,
            "expires_at": alert.expires,
            "geometry": {"lat": alert.lat, "lon": alert.lon},
            "confidence": alert.certainty,
            "instruction": alert.instruction,
        })

    try:
        gdacs = global_disasters("india").get("events", [])
    except Exception:
        gdacs = []
    for event in gdacs:
        items.append({
            "source": "GDACS (UN JRC)",
            "source_type": "OFFICIAL third-party",
            "official": True,
            "event": event.get("event_label", ""),
            "severity": event.get("alert_level", ""),
            "headline": event.get("name", ""),
            "area": event.get("countries", ""),
            "issued_at": event.get("from", ""),
            "expires_at": event.get("to", ""),
            "geometry": {"lat": event.get("lat"), "lon": event.get("lon")},
            "confidence": "reported",
            "instruction": "",
            "report_url": event.get("report_url", ""),
        })

    try:
        from .disasters import earthquakes
        quakes = earthquakes(5.0, 7).get("events", [])
    except Exception:
        quakes = []
    for quake in quakes:
        if not _in_india_window(quake.get("lat"), quake.get("lon")):
            continue
        if not quake.get("tsunami"):
            continue
        items.append({
            "source": "USGS Earthquake Hazards Program",
            "source_type": "OFFICIAL third-party",
            "official": True,
            "event": "Tsunami-flagged earthquake",
            "severity": "Red" if (quake.get("magnitude") or 0) >= 7 else "Orange",
            "headline": f"M{quake.get('magnitude')} {quake.get('place')} (tsunami flag — see USGS)",
            "area": quake.get("place", ""),
            "issued_at": quake.get("time_ms", ""),
            "expires_at": "",
            "geometry": {"lat": quake.get("lat"), "lon": quake.get("lon")},
            "confidence": "reported",
            "instruction": "Tsunami potential is evaluated by ocean agencies, not by magnitude alone. Follow INCOIS/NDMA channels.",
            "report_url": quake.get("url", ""),
        })

    order = {"Red": 0, "Orange": 1, "Yellow": 2, "Green": 3}
    items.sort(key=lambda item: order.get(str(item.get("severity", "")).capitalize(), 4))
    return {
        "items": items,
        "count": len(items),
        "region": state or "India",
        "data_type": "Fused alert layer (provenance per item)",
        "status": "LIVE",
        "source": "WeatherGPT India layer: computed + GDACS + USGS",
        "disclaimer": "COMPUTED items are unofficial estimates. OFFICIAL items are "
                      "third-party global feeds, not IMD/NDMA bulletins.",
    }
