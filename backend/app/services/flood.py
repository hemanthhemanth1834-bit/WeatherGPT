"""Computed flood-risk proxy. Original implementation.

Inputs actually available: 24 h rain accumulation (hourly precipitation),
7-day rain sums (daily), and ground elevation (Open-Meteo elevation API).
No hydrological model, no river data — documented limits, COMPUTED only.
Never an official flood warning.
"""
from typing import Any, Dict, List

from .cache import cached


def elevation_m(lat: float, lon: float) -> float | None:
    """Ground elevation in metres (Open-Meteo elevation, free, no key)."""
    from .http import http_get

    def load() -> float | None:
        response = http_get("https://api.open-meteo.com/v1/elevation"
                            f"?latitude={lat}&longitude={lon}", timeout=6)
        if response.status_code != 200:
            return None
        values = response.json().get("elevation")
        if isinstance(values, list):
            return float(values[0]) if values else None
        return float(values) if values is not None else None

    try:
        return cached(86400, f"elev:{round(lat, 2)}:{round(lon, 2)}", load)
    except Exception:
        return None


def flood_risk(lat: float, lon: float, place: str, state: str) -> Dict[str, Any]:
    """Score flood susceptibility from rain + elevation. COMPUTED."""
    from .weather import get_weather

    data = get_weather(lat, lon, place, state)
    rain_24h = float(data.precipitation or 0.0)
    peak_prob = max([h.rain_prob for h in (data.hourly[:12] or [])], default=0)
    week_rain = sum(d.rain_sum for d in (data.daily or []))
    elev = elevation_m(lat, lon)

    score = 0
    drivers: List[str] = []
    if rain_24h >= 25 or week_rain >= 70:
        score += 40
        drivers.append(f"heavy rain ({rain_24h} mm now, {week_rain:.1f} mm/7d)")
    elif rain_24h >= 10 or week_rain >= 35 or peak_prob >= 70:
        score += 25
        drivers.append(f"significant rain ({peak_prob}% peak probability)")
    elif peak_prob >= 40:
        score += 10
        drivers.append(f"moderate rain chance ({peak_prob}%)")
    if elev is not None and elev < 10:
        score += 20
        drivers.append(f"low elevation ({elev:.0f} m) — poor drainage")
    elif elev is not None and elev < 50:
        score += 8
        drivers.append(f"low-lying ground ({elev:.0f} m)")

    score = max(0, min(100, score))
    level = "HIGH" if score >= 50 else ("MODERATE" if score >= 25 else "LOW")
    timeline = [
        {"time": h.time, "rain_prob": h.rain_prob}
        for h in (data.hourly[:24] or [])
    ]
    return {
        "location": data.location,
        "state": data.state,
        "risk": level,
        "score": score,
        "drivers": drivers or ["no major flood drivers in current data"],
        "elevation_m": elev,
        "rain_24h_mm": rain_24h,
        "week_rain_mm": round(week_rain, 1),
        "timeline_24h": timeline,
        "data_type": "COMPUTED proxy (rain + elevation only)",
        "status": "COMPUTED",
        "source": "WeatherGPT flood proxy (Open-Meteo rain + elevation)",
        "limits": "No hydrological model, rivers, soil, drainage, or tides. "
                  "Not an official flood warning.",
        "updated_at_ist": data.updated_at_ist,
    }
