"""Travel weather-risk engine. Original implementation.

This is a transparent, deterministic weather-risk score — not a road-safety
guarantee. Every deduction is returned as a factor with its observed value and
the threshold that triggered it, so the assistant can explain “why this score”
instead of printing an unexplained number.
"""

from typing import Any, Dict, List, Optional

from .alerts import active_alerts
from .risk_engine import assess_risk
from ..models import WeatherData


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def assess_travel(
    data: WeatherData, alerts: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """Return score, level, named factors, limitations and provenance type."""
    risk = assess_risk(data)
    factors: List[Dict[str, Any]] = []
    score = 100

    rain_prob = _num(data.hourly[0].rain_prob if data.hourly else None)
    precipitation = _num(data.precipitation)
    if precipitation >= 10 or rain_prob >= 70:
        score -= 30
        factors.append(
            {
                "name": "Heavy rain",
                "value": f"{precipitation:g} mm now / {rain_prob:g}% chance",
                "threshold": ">=10 mm or >=70% chance",
                "deduction": -30,
                "evidence": "Provider current precipitation and hourly rain probability",
            }
        )
    elif precipitation >= 2 or rain_prob >= 40:
        score -= 12
        factors.append(
            {
                "name": "Passing showers",
                "value": f"{precipitation:g} mm now / {rain_prob:g}% chance",
                "threshold": ">=2 mm or >=40% chance",
                "deduction": -12,
                "evidence": "Provider current precipitation and hourly rain probability",
            }
        )

    if str(data.visibility_source or "").startswith("Open-Meteo"):
        visibility = _num(data.visibility, 10.0)
        if visibility < 2:
            score -= 30
            factors.append(
                {
                    "name": "Poor visibility",
                    "value": f"{visibility:g} km",
                    "threshold": "<2 km",
                    "deduction": -30,
                    "evidence": "Provider visibility",
                }
            )
        elif visibility < 5:
            score -= 10
            factors.append(
                {
                    "name": "Hazy visibility",
                    "value": f"{visibility:g} km",
                    "threshold": "<5 km",
                    "deduction": -10,
                    "evidence": "Provider visibility",
                }
            )

    wind = _num(data.wind_speed)
    if wind >= 40:
        score -= 25
        factors.append(
            {
                "name": "Strong wind",
                "value": f"{wind:g} km/h",
                "threshold": ">=40 km/h",
                "deduction": -25,
                "evidence": "Provider current wind speed",
            }
        )
    elif wind >= 25:
        score -= 10
        factors.append(
            {
                "name": "Breezy",
                "value": f"{wind:g} km/h",
                "threshold": ">=25 km/h",
                "deduction": -10,
                "evidence": "Provider current wind speed",
            }
        )

    temp = _num(data.current_temp)
    if temp >= 42:
        score -= 15
        factors.append(
            {
                "name": "Extreme heat",
                "value": f"{temp:g}°C",
                "threshold": ">=42°C",
                "deduction": -15,
                "evidence": "Provider current temperature",
            }
        )
    elif temp <= 7:
        score -= 15
        factors.append(
            {
                "name": "Cold conditions",
                "value": f"{temp:g}°C",
                "threshold": "<=7°C",
                "deduction": -15,
                "evidence": "Provider current temperature",
            }
        )

    if alerts is None:
        try:
            alerts = active_alerts(state=data.state, district=data.location)
        except Exception:
            alerts = []
    if any(getattr(a, "severity", "") == "Red" for a in alerts):
        score -= 25
        factors.append(
            {
                "name": "Red computed alert",
                "value": "1+ red alert",
                "threshold": "Any red WeatherGPT computed alert",
                "deduction": -25,
                "evidence": "WeatherGPT computed alert layer (not an official bulletin)",
            }
        )
    elif alerts:
        score -= 10
        factors.append(
            {
                "name": "Computed alerts",
                "value": f"{len(alerts)} alert(s)",
                "threshold": "1+ computed alert",
                "deduction": -10,
                "evidence": "WeatherGPT computed alert layer (not an official bulletin)",
            }
        )

    score = max(5, min(100, score))
    level = "LOW" if score >= 80 else ("MODERATE" if score >= 55 else "HIGH")
    advice = {
        "LOW": "Weather conditions look suitable for travel. Recheck before long trips.",
        "MODERATE": "Travel possible with caution — allow extra time and monitor alerts.",
        "HIGH": "Consider postponing non-essential travel; follow official advisories.",
    }[level]
    return {
        "location": data.location,
        "state": data.state,
        "safety": level,
        "score": score,
        "risk_overall": risk["overall"],
        "drivers": [f"{f['name']}: {f['value']}" for f in factors]
        or ["No major weather hazard in current data"],
        "factors": factors,
        "time_window": "Current conditions through the next 24 hours",
        "advice": advice,
        "active_alerts": len(alerts),
        "data_type": "ESTIMATED",
        "source": "WeatherGPT travel engine (weather + risk + computed alerts)",
        "limitations": [
            "Weather risk only; it does not assess road condition, traffic, infrastructure or personal health.",
            "Computed alerts are not official warnings; check IMD/NDMA for official instructions.",
        ],
    }


def travel_safety(data: WeatherData) -> Dict[str, Any]:
    """Backward-compatible wrapper used by existing callers."""
    return assess_travel(data)
