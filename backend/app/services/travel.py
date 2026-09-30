"""Travel safety engine. Original implementation.

Combines live weather, deterministic risk, and computed alerts into a
LOW / MODERATE / HIGH trip read with named drivers. ESTIMATED, unofficial.
"""
from typing import Any, Dict, List

from .alerts import active_alerts
from .risk_engine import assess_risk
from ..models import WeatherData


def travel_safety(data: WeatherData) -> Dict[str, Any]:
    """Score one place for travel right now."""
    risk = assess_risk(data)
    drivers: List[str] = []
    score = 100

    rain_prob = data.hourly[0].rain_prob if data.hourly else 0
    if data.precipitation >= 10 or rain_prob >= 70:
        score -= 30
        drivers.append(f"heavy rain ({data.precipitation} mm, {rain_prob}% chance)")
    elif data.precipitation >= 2 or rain_prob >= 40:
        score -= 12
        drivers.append(f"passing showers ({rain_prob}% chance)")

    if data.visibility < 2:
        score -= 30
        drivers.append(f"poor visibility ({data.visibility} km)")
    elif data.visibility < 5:
        score -= 10
        drivers.append(f"hazy visibility ({data.visibility} km)")

    if data.wind_speed >= 40:
        score -= 25
        drivers.append(f"strong wind ({data.wind_speed} km/h)")
    elif data.wind_speed >= 25:
        score -= 10
        drivers.append(f"breezy ({data.wind_speed} km/h)")

    if data.current_temp >= 42:
        score -= 15
        drivers.append(f"extreme heat ({data.current_temp}°C)")
    elif data.current_temp <= 7:
        score -= 15
        drivers.append(f"cold wave ({data.current_temp}°C)")

    try:
        alerts = active_alerts(state=data.state, district=data.location)
    except Exception:
        alerts = []
    if any(a.severity == "Red" for a in alerts):
        score -= 25
        drivers.append("red computed alert in force")
    elif alerts:
        score -= 10
        drivers.append(f"{len(alerts)} computed alert(s) in force")

    score = max(5, min(100, score))
    level = "LOW" if score >= 80 else ("MODERATE" if score >= 55 else "HIGH")
    advice = {
        "LOW": "Conditions look suitable for travel. Recheck before long trips.",
        "MODERATE": "Travel possible with caution — allow extra time and monitor alerts.",
        "HIGH": "Consider postponing non-essential travel; follow official advisories.",
    }[level]
    return {
        "location": data.location,
        "state": data.state,
        "safety": level,
        "score": score,
        "risk_overall": risk["overall"],
        "drivers": drivers or ["no major hazards in current data"],
        "advice": advice,
        "active_alerts": len(alerts),
        "data_type": "ESTIMATED",
        "source": "WeatherGPT travel engine (weather + risk + computed alerts)",
    }
