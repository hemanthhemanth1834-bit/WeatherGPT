"""Estimated rooftop solar potential. Original implementation.

A transparent textbook-style estimate from live UV index and cloud cover:
peak sun hours ≈ daylight scaled by UV and clear-sky fraction, times array
rating. ESTIMATED unless the user supplies real panel specs — never metered output.
"""
from typing import Any, Dict


def solar_estimate(uv_index: float, cloud_cover_pct: float,
                   sunrise: str = "", sunset: str = "",
                   rated_kw: float = 1.0) -> Dict[str, Any]:
    """Estimate daily yield for a reference array. All inputs live or defaulted."""
    try:
        uv = max(0.0, float(uv_index))
    except (TypeError, ValueError):
        uv = 0.0
    try:
        cloud = min(100.0, max(0.0, float(cloud_cover_pct)))
    except (TypeError, ValueError):
        cloud = 50.0
    daylight_h = 12.0
    try:
        rise_h, rise_m = [int(x) for x in str(sunrise).split(":")[:2]]
        set_h, set_m = [int(x) for x in str(sunset).split(":")[:2]]
        daylight_h = max(0.0, (set_h + set_m / 60) - (rise_h + rise_m / 60))
    except (ValueError, AttributeError):
        pass
    # Peak-sun-hours proxy: UV/10 scaled by clear-sky fraction, over daylight.
    psh = round(daylight_h * min(1.2, uv / 10.0) * (1.0 - cloud / 140.0), 2)
    psh = max(0.0, psh)
    try:
        rated = max(0.1, float(rated_kw))
    except (TypeError, ValueError):
        rated = 1.0
    daily_kwh = round(psh * rated, 2)
    return {
        "peak_sun_hours": psh,
        "daily_kwh_per_kw": round(psh, 2),
        "daily_kwh": daily_kwh,
        "rated_kw": rated,
        "daylight_hours": round(daylight_h, 1),
        "inputs": {"uv_index": uv, "cloud_cover_pct": cloud,
                   "sunrise": sunrise, "sunset": sunset},
        "formula": "PSH = daylight × min(1.2, UV/10) × (1 − cloud/140); kWh = PSH × kW",
        "data_type": "ESTIMATED (textbook proxy)",
        "status": "ESTIMATED",
        "source": "WeatherGPT solar proxy (live UV + cloud)",
    }
