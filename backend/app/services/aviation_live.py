"""Live METAR/TAF via NOAA Aviation Weather Center ADDS API.

Free, no key, official US source with global station coverage
(including Indian airports). Cached 30 minutes (METAR cadence).
Falls back to STATIC samples when unreachable — never labelled live.
"""
from typing import Any, Dict, List, Optional

import requests

from .cache import cached

BASE = "https://aviationweather.gov/api/data"
HEADERS = {"User-Agent": "WeatherGPT-SIH2026/2.0 (education project)"}
TTL = 1800

KNOWN = ("VIDP", "VABB", "VOBL", "VECC", "VOMM", "VOHS")


def _fetch(kind: str, icao: str) -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(f"{BASE}/{kind}", params={"ids": icao, "format": "json"},
                                headers=HEADERS, timeout=8)
        if response.status_code != 200:
            return None
        items = response.json()
        return items[0] if items else None
    except Exception:
        return None


def _visib_sm(metar: Dict[str, Any]) -> Optional[float]:
    try:
        value = float(metar.get("visib", ""))
        return value
    except (TypeError, ValueError):
        return None


def _ceiling_ft(metar: Dict[str, Any]) -> Optional[int]:
    """Lowest broken/overcast layer base in feet, if reported."""
    try:
        layers = metar.get("clouds") or []
        bases = [int(c.get("base", 0)) * 100 for c in layers
                 if str(c.get("cover", "")).upper() in ("BKN", "OVC", "VV")]
        return min(bases) if bases else None
    except (TypeError, ValueError):
        return None


def flight_category(metar: Dict[str, Any]) -> str:
    """US National Weather Service flight-category rules."""
    vis = _visib_sm(metar)
    ceiling = _ceiling_ft(metar)
    if vis is None and ceiling is None:
        return "UNKNOWN"
    if (vis is not None and vis < 1) or (ceiling is not None and ceiling < 500):
        return "LIFR"
    if (vis is not None and vis < 3) or (ceiling is not None and ceiling < 1000):
        return "IFR"
    if (vis is not None and vis <= 5) or (ceiling is not None and ceiling <= 3000):
        return "MVFR"
    return "VFR"


def live_briefing(icao: str) -> Optional[Dict[str, Any]]:
    """Live decoded briefing, or None when the feed is unreachable."""
    code = (icao or "VIDP").upper()
    if code not in KNOWN and len(code) != 4:
        code = "VIDP"
    metar = cached(TTL, f"metar:{code}", lambda: _fetch("metar", code))
    taf = cached(TTL, f"taf:{code}", lambda: _fetch("taf", code))
    if metar is None:
        return None
    hazards: List[str] = []
    vis = _visib_sm(metar)
    if vis is not None and vis < 3:
        hazards.append(f"Low visibility ({vis} SM)")
    ceiling = _ceiling_ft(metar)
    if ceiling is not None and ceiling < 1000:
        hazards.append(f"Low ceiling ({ceiling} ft)")
    wx = (metar.get("wxString") or "").strip()
    if wx:
        hazards.append(f"Present weather: {wx}")
    if not hazards:
        hazards.append("No significant hazards in latest report")
    return {
        "station_icao": metar.get("icaoId", code),
        "metar_raw": metar.get("rawOb", ""),
        "taf_raw": (taf or {}).get("rawTAF", "") if taf else "",
        "taf_issue": (taf or {}).get("issueTime", "") if taf else "",
        "observed_at": metar.get("reportTime", ""),
        "temperature_c": metar.get("temp"),
        "dewpoint_c": metar.get("dewp"),
        "wind_dir_deg": metar.get("wdir"),
        "wind_speed_kt": metar.get("wspd"),
        "wind_gust_kt": metar.get("wgst"),
        "visibility_sm": vis,
        "ceiling_ft": ceiling,
        "altimeter_hpa": metar.get("altim"),
        "flight_category": flight_category(metar),
        "hazards": hazards,
        "data_source": "NOAA Aviation Weather Center (ADDS)",
        "data_type": "Observation + TAF",
        "status": "LIVE",
    }
