"""Live air quality via the Open-Meteo Air Quality API (free, no key).

Standard: US AQI (EPA breakpoints via the provider's us_aqi field).
Pollutant units come from the provider and are passed through.
"""
import datetime
from typing import Any, Dict

import requests

from .cache import cached

FIELDS = ("us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,"
          "us_aqi_pm2_5,us_aqi_pm10,us_aqi_nitrogen_dioxide,us_aqi_ozone")

BANDS = [(50, "Good"), (100, "Moderate"), (150, "Unhealthy for Sensitive Groups"),
         (200, "Unhealthy"), (300, "Very Unhealthy"), (500, "Hazardous")]


def aqi_band(us_aqi: int) -> str:
    for limit, label in BANDS:
        if us_aqi <= limit:
            return label
    return "Beyond Index"


def dominant_pollutant(current: Dict[str, Any]) -> str:
    """Name the pollutant with the highest sub-index, if reported."""
    candidates = {k.replace("us_aqi_", ""): current.get(k)
                  for k in ("us_aqi_pm2_5", "us_aqi_pm10",
                            "us_aqi_nitrogen_dioxide", "us_aqi_ozone")
                  if isinstance(current.get(k), (int, float))}
    if not candidates:
        return "—"
    return max(candidates, key=candidates.get)


def get_air_quality(lat: float, lon: float) -> Dict[str, Any]:
    """Cached live AQI payload. Raises RuntimeError when unavailable."""
    return cached(1800, f"aqi:{round(lat, 3)}:{round(lon, 3)}",
                  lambda: _download(lat, lon))


def _download(lat: float, lon: float) -> Dict[str, Any]:
    url = ("https://air-quality-api.open-meteo.com/v1/air-quality"
           f"?latitude={lat}&longitude={lon}&current={FIELDS}"
           "&timezone=Asia%2FKolkata")
    response = requests.get(url, timeout=5)
    if response.status_code != 200:
        raise RuntimeError(f"AQI upstream HTTP {response.status_code}")
    current = response.json().get("current", {})
    if "us_aqi" not in current or current.get("us_aqi") is None:
        raise RuntimeError("AQI upstream returned no index")
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    return {
        "us_aqi": int(current["us_aqi"]),
        "band": aqi_band(int(current["us_aqi"])),
        "standard": "US AQI (EPA)",
        "pm2_5": current.get("pm2_5"),
        "pm10": current.get("pm10"),
        "nitrogen_dioxide": current.get("nitrogen_dioxide"),
        "ozone": current.get("ozone"),
        "sulphur_dioxide": current.get("sulphur_dioxide"),
        "carbon_monoxide": current.get("carbon_monoxide"),
        "dominant_pollutant": dominant_pollutant(current),
        "observed_at": current.get("time", ""),
        "data_source": "Open-Meteo Air Quality",
        "data_type": "Observation",
        "status": "LIVE",
    }


def uv_guidance(uv: float) -> Dict[str, str]:
    """Protection tiers for a UV index value (standard public-health bands)."""
    if uv >= 11:
        return {"level": "Extreme", "advice": "Avoid midday sun; SPF 50+, hat, sunglasses, shade."}
    if uv >= 8:
        return {"level": "Very High", "advice": "Minimize 10am–4pm exposure; SPF 30+, reapply often."}
    if uv >= 6:
        return {"level": "High", "advice": "Seek shade midday; SPF 30+, hat and sunglasses."}
    if uv >= 3:
        return {"level": "Moderate", "advice": "Protection recommended around midday."}
    return {"level": "Low", "advice": "No protection needed under normal activity."}
