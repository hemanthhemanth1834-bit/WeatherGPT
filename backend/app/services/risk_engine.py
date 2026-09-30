"""Deterministic weather risk engine (SIH 2026 addition).

Categories: LOW / MODERATE / HIGH / EXTREME
Risks: heat, rainfall, flood, wind, thunderstorm, cyclone.

Thresholds are documented below and are intentionally conservative and
transparent. They are NOT scientifically validated for operational use and
must not be presented as official IMD warnings. Official warnings always
take precedence.
"""
from typing import Dict, Any, List
from ..models import WeatherData

# Documented thresholds (conservative, transparent, non-validated)
THRESHOLDS = {
    "heat": {
        "description": "Based on ambient + feels-like temperature (°C).",
        "EXTREME": "temp >= 45 or feels_like >= 48",
        "HIGH": "temp >= 42 or feels_like >= 45",
        "MODERATE": "temp >= 38 or feels_like >= 41",
        "LOW": "otherwise",
    },
    "rainfall": {
        "description": "Based on current precipitation (mm/hr) and 24h rain sum (mm).",
        "EXTREME": "precip >= 25 or rain_sum_24h >= 70",
        "HIGH": "precip >= 10 or rain_sum_24h >= 35",
        "MODERATE": "precip >= 2 or rain_prob_peak >= 60",
        "LOW": "otherwise",
    },
    "wind": {
        "description": "Based on sustained wind speed (km/h).",
        "EXTREME": "wind >= 60",
        "HIGH": "wind >= 40",
        "MODERATE": "wind >= 25",
        "LOW": "otherwise",
    },
    "thunderstorm": {
        "description": "Based on WMO weather codes 95-99 and 80-82.",
        "EXTREME": "code in {96, 99}",
        "HIGH": "code in {95, 82}",
        "MODERATE": "code in {80, 81}",
        "LOW": "otherwise",
    },
}

RISK_ORDER = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "EXTREME": 3}


def _level(order_value: int) -> str:
    for name, rank in RISK_ORDER.items():
        if rank == order_value:
            return name
    return "LOW"


def assess_risk(weather: WeatherData) -> Dict[str, Any]:
    """Compute deterministic risk levels from observed/forecast weather data."""
    rain_sum_24h = weather.daily[0].rain_sum if weather.daily else weather.precipitation
    peak_prob = max([h.rain_prob for h in (weather.hourly[:12] or [])], default=0)
    code = weather.condition_code

    # Heat
    if weather.current_temp >= 45 or weather.feels_like >= 48:
        heat = "EXTREME"
    elif weather.current_temp >= 42 or weather.feels_like >= 45:
        heat = "HIGH"
    elif weather.current_temp >= 38 or weather.feels_like >= 41:
        heat = "MODERATE"
    else:
        heat = "LOW"

    # Rainfall
    if weather.precipitation >= 25 or rain_sum_24h >= 70:
        rainfall = "EXTREME"
    elif weather.precipitation >= 10 or rain_sum_24h >= 35:
        rainfall = "HIGH"
    elif weather.precipitation >= 2 or peak_prob >= 60:
        rainfall = "MODERATE"
    else:
        rainfall = "LOW"

    # Flood proxy (rainfall-driven, clearly labelled as estimated)
    flood = rainfall

    # Wind
    if weather.wind_speed >= 60:
        wind = "EXTREME"
    elif weather.wind_speed >= 40:
        wind = "HIGH"
    elif weather.wind_speed >= 25:
        wind = "MODERATE"
    else:
        wind = "LOW"

    # Thunderstorm
    if code in (96, 99):
        thunderstorm = "EXTREME"
    elif code in (95, 82):
        thunderstorm = "HIGH"
    elif code in (80, 81):
        thunderstorm = "MODERATE"
    else:
        thunderstorm = "LOW"

    # Cyclone risk is MODEL-DEPENDENT: only elevated when extreme wind + extreme rain coincide
    if wind == "EXTREME" and rainfall in ("HIGH", "EXTREME"):
        cyclone = "HIGH"
    elif wind in ("HIGH", "EXTREME") or rainfall == "EXTREME":
        cyclone = "MODERATE"
    else:
        cyclone = "LOW"

    levels = {
        "heat": heat,
        "rainfall": rainfall,
        "flood": flood,
        "wind": wind,
        "thunderstorm": thunderstorm,
        "cyclone": cyclone,
    }
    overall = max(levels.values(), key=lambda v: RISK_ORDER[v])

    advisories: List[str] = []
    if overall == "EXTREME":
        advisories.append("Extreme conditions possible. Follow official IMD/NDMA warnings; avoid non-essential travel.")
    elif overall == "HIGH":
        advisories.append("High risk. Limit outdoor exposure, secure loose objects, monitor official alerts.")
    elif overall == "MODERATE":
        advisories.append("Moderate risk. Stay alert for changing conditions, especially rain and wind.")
    else:
        advisories.append("Low risk based on current data. Normal activities may continue.")

    return {
        "location": weather.location,
        "state": weather.state,
        "overall": overall,
        "levels": levels,
        "thresholds": THRESHOLDS,
        "advisories": advisories,
        "data_type": "ESTIMATED",
        "disclaimer": (
            "Deterministic estimate from forecast values using documented thresholds. "
            "Not scientifically validated and not an official warning. "
            "Always follow IMD / NDMA / local authority instructions."
        ),
        "source": "WeatherGPT Risk Engine v1 (deterministic, local computation)",
    }
