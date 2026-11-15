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
        response = http_get(
            f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}",
            timeout=6,
        )
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


def _sum_hour_rain(hours: List[Any], count: int) -> float | None:
    """Sum the next N hourly forecast amounts, or None if any hour is missing."""
    if count <= 0 or len(hours) < count:
        return None
    values = [hour.rain_mm for hour in hours[:count]]
    if any(value is None for value in values):
        return None
    return round(sum(float(value) for value in values), 1)


def _sum_day_rain(days: List[Any], count: int) -> float | None:
    """Sum the next N daily forecast amounts, or None if any day is missing."""
    if count <= 0 or len(days) < count:
        return None
    values = [day.rain_sum for day in days[:count]]
    if any(value is None for value in values):
        return None
    return round(sum(float(value) for value in values), 1)


def flood_risk(lat: float, lon: float, place: str, state: str) -> Dict[str, Any]:
    """Score flood susceptibility from rain + elevation. COMPUTED."""
    from .weather import get_weather

    data = get_weather(lat, lon, place, state)
    rain_now = float(data.precipitation or 0.0)
    peak_prob = max(
        [h.rain_prob for h in (data.hourly[:12] or []) if h.rain_prob is not None],
        default=0,
    )
    week_rain = _sum_day_rain(list(data.daily or []), 7)
    accumulations = {
        "1h": _sum_hour_rain(list(data.hourly or []), 1),
        "3h": _sum_hour_rain(list(data.hourly or []), 3),
        "6h": _sum_hour_rain(list(data.hourly or []), 6),
        "24h": _sum_hour_rain(list(data.hourly or []), 24),
        "72h": _sum_day_rain(list(data.daily or []), 3),
    }
    rain_24h = accumulations["24h"]
    rain_score = rain_24h or 0.0
    week_score = week_rain or 0.0
    elev = elevation_m(lat, lon)

    score = 0
    drivers: List[str] = []
    if rain_score >= 25 or week_score >= 70:
        score += 40
        drivers.append(
            f"heavy rain (next 24h {rain_24h if rain_24h is not None else 'unavailable'} mm, "
            f"next 7d {week_rain if week_rain is not None else 'unavailable'} mm)"
        )
    elif rain_score >= 10 or week_score >= 35 or peak_prob >= 70:
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
        {"time": h.time, "rain_prob": h.rain_prob, "rain_mm": h.rain_mm}
        for h in (data.hourly[:24] or [])
    ]
    return {
        "location": data.location,
        "state": data.state,
        "risk": level,
        "score": score,
        "drivers": drivers or ["no major flood drivers in current data"],
        "elevation_m": elev,
        "rain_now_mm": round(rain_now, 1),
        "rain_24h_mm": rain_24h,
        "rain_72h_mm": accumulations["72h"],
        "week_rain_mm": week_rain,
        "accumulations_mm": accumulations,
        "timeline_24h": timeline,
        "data_type": "COMPUTED proxy (rain + elevation only)",
        "status": "COMPUTED",
        "source": "WeatherGPT flood proxy (Open-Meteo rain + elevation)",
        "limits": "No hydrological model, rivers, soil, drainage, or tides. "
        "Not an official flood warning.",
        "conditions_at_ist": data.conditions_at_ist,
        "freshness": data.freshness,
        "updated_at_ist": data.updated_at_ist,
    }
