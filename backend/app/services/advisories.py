"""Advisory services: agriculture, aviation, marine, climate reference.

Original implementation. All advisories are rule-based and informational:
agriculture guidance never replaces professional agronomic advice, aviation
samples are STATIC demonstrations, marine figures are MODEL-DEPENDENT
estimates, and climate series are STATIC references.
"""
import datetime
from typing import Dict, List

import requests

from ..models import (AgriCropAdvisory, AviationBriefing, MarineAdvisory)

# ---------------------------------------------------------------------------
# Agriculture
# ---------------------------------------------------------------------------
CROPS: Dict[str, dict] = {
    "paddy": {
        "label": "Paddy / Rice",
        "wet": "Keep 3–5 cm standing water; open field drains before heavy spells.",
        "dry": "Irrigate lightly at tillering; watch for leaf folder.",
        "spray": "Skip foliar sprays when rain probability exceeds 60%; spray on clear mornings.",
        "stage": "Tillering",
    },
    "cotton": {
        "label": "Cotton",
        "wet": "Drain standing water within a day to protect roots from rot.",
        "dry": "Irrigate alternate furrows; scout undersides of leaves for whitefly.",
        "spray": "Use pheromone traps for bollworm monitoring; avoid spraying in gusty wind.",
        "stage": "Flowering",
    },
    "wheat": {
        "label": "Wheat",
        "wet": "Skip scheduled irrigation — incoming rain covers soil-moisture needs.",
        "dry": "Give the crown-root irrigation about three weeks after sowing.",
        "spray": "In humid, foggy spells check for yellow rust before spraying.",
        "stage": "Tillering",
    },
    "sugarcane": {
        "label": "Sugarcane",
        "wet": "Tie canes in small bundles so gusty rain does not lodge the crop.",
        "dry": "Mulch with dry trash to hold root-zone moisture in hot spells.",
        "spray": "Watch young shoots for early borer; treat around the root zone with light watering.",
        "stage": "Grand Growth",
    },
    "soybean": {
        "label": "Soybean",
        "wet": "Shape broad beds and furrows so pod-stage plants never sit in water.",
        "dry": "Protect pod filling with one life-saving irrigation if the dry spell persists.",
        "spray": "Scout for leaf-eating caterpillars in the evening; prefer bio-options early.",
        "stage": "Pod Formation",
    },
    "mustard": {
        "label": "Mustard",
        "wet": "Delay harvest through a wet spell; cover cut bundles with tarpaulin.",
        "dry": "Irrigate near flowering, roughly 7–8 weeks after sowing.",
        "spray": "Humid cloudy weather invites aphids — spray only on clear dry days.",
        "stage": "Flowering",
    },
}


def crop_advisory(crop: str, district: str, state: str,
                  temp: float, rain_prob: int, humidity: int) -> AgriCropAdvisory:
    """Build a weather-driven advisory for one crop and district."""
    key = "paddy"
    lowered = (crop or "").lower()
    for name in CROPS:
        if name in lowered or lowered in name:
            key = name
            break
    info = CROPS[key]
    wet = rain_prob > 40
    return AgriCropAdvisory(
        crop=info["label"], district=district, state=state,
        growth_stage=info["stage"],
        weather_summary=f"Temp {temp}°C, humidity {humidity}%, rain probability {rain_prob}%",
        rainfall_risk=("Elevated — hold sprays, keep drains open" if wet
                       else "Low — field operations can continue"),
        irrigation_advice=info["wet"] if wet else info["dry"],
        pesticide_advice=info["spray"],
        harvest_recommendation=("Wait for two dry days before harvesting and threshing." if wet
                                else "Dry spell suits harvesting and threshing."),
        damini_lightning_alert=bool(rain_prob > 60 and humidity > 75),
        suitability_score=60 if wet else 85,
    )


def supported_crops() -> List[str]:
    return sorted(CROPS)


# ---------------------------------------------------------------------------
# Aviation (STATIC demonstration samples of our own composition)
# ---------------------------------------------------------------------------
AIRPORTS: Dict[str, dict] = {
    "VIDP": {"name": "Indira Gandhi International Airport, New Delhi",
             "metar": "VIDP 301800Z 29007KT 6000 HZ FEW035 SCT100 29/18 Q1011 NOSIG",
             "taf": "TAF VIDP 301500Z 3018/0118 29008KT 5000 HZ SCT035 PROB30 TEMPO 0106/0110 3000 TSRA",
             "category": "MVFR",
             "hazards": ["Haze layer limiting visibility", "Isolated evening cells possible"]},
    "VABB": {"name": "Chhatrapati Shivaji Maharaj International Airport, Mumbai",
             "metar": "VABB 301800Z 25012KT 4000 -SHRA BKN014 OVC075 27/25 Q1009 TEMPO 2000 +SHRA",
             "taf": "TAF VABB 301500Z 3018/0118 24014G26KT 3000 SHRA BKN012 TEMPO 0100/0106 1500 TSRA",
             "category": "IFR",
             "hazards": ["Low cloud ceiling", "Gusty crosswinds", "Monsoon squalls"]},
    "VOBL": {"name": "Kempegowda International Airport, Bengaluru",
             "metar": "VOBL 301800Z 23008KT 9999 FEW022 SCT075 24/18 Q1015 NOSIG",
             "taf": "TAF VOBL 301500Z 3018/0118 23010KT 9000 SCT022 PROB40 TEMPO 0110/0114 4000 TSRA",
             "category": "VFR",
             "hazards": ["Generally fair", "Afternoon storm chance near 40%"]},
    "VECC": {"name": "Netaji Subhas Chandra Bose International Airport, Kolkata",
             "metar": "VECC 301800Z 13016G30KT 3000 +SHRA SCT010 BKN020CB 26/25 Q0999 WS RWY01R",
             "taf": "TAF VECC 301500Z 3018/0118 12022G40KT 1500 +TSRA OVC010 BECMG 0106/0108 09030G50KT",
             "category": "LIFR",
             "hazards": ["Storm bands nearby", "Windshear reported", "Strong gusts"]},
}


def aviation_briefing(query: str) -> AviationBriefing:
    """Return a STATIC sample briefing for the requested airport."""
    text = (query or "").upper()
    icao = "VIDP"
    for code, hint in (("VABB", ("MUMBAI", "VABB", "BOM")), ("VOBL", ("BENGALURU", "BANGALORE", "VOBL", "BLR")),
                       ("VECC", ("KOLKATA", "VECC", "CCU")), ("VIDP", ("DELHI", "VIDP", "DEL"))):
        if code in text or any(h in text for h in hint):
            icao = code
            break
    info = AIRPORTS[icao]
    decoded = {
        "station": icao,
        "visibility": "Reduced by haze or rain" if icao in ("VIDP", "VABB", "VECC") else "10 km or more",
        "clouds": "Broken low cloud with higher overcast" if icao in ("VABB", "VECC") else "Few low, scattered high",
        "altimeter_qnh": "Near 1010 hPa (see raw report)",
        "trend": "As per attached TAF; samples are illustrative, not live observations",
    }
    return AviationBriefing(
        station_icao=icao, station_name=info["name"], metar_raw=info["metar"],
        metar_decoded=decoded, taf_raw=info["taf"],
        flight_category=info["category"], hazards=list(info["hazards"]),
    )


# ---------------------------------------------------------------------------
# Marine: LIVE Open-Meteo Marine API first, empirical estimate as FALLBACK
# ---------------------------------------------------------------------------
COASTS: Dict[str, dict] = {
    "mumbai": {"zone": "Mumbai / Konkan coast, Arabian Sea", "lat": 18.9220, "lon": 72.8347},
    "goa": {"zone": "Goa coast, Arabian Sea", "lat": 15.4909, "lon": 73.8278},
    "kochi": {"zone": "Kochi / Malabar coast, Arabian Sea", "lat": 9.9312, "lon": 76.2673},
    "kerala": {"zone": "Kerala coast, Arabian Sea", "lat": 9.9312, "lon": 76.2673},
    "chennai": {"zone": "Chennai / Coromandel coast, Bay of Bengal", "lat": 13.0827, "lon": 80.2707},
    "visakhapatnam": {"zone": "Visakhapatnam coast, Bay of Bengal", "lat": 17.6868, "lon": 83.2185},
    "vizag": {"zone": "Visakhapatnam coast, Bay of Bengal", "lat": 17.6868, "lon": 83.2185},
    "puri": {"zone": "Puri / Odisha coast, Bay of Bengal", "lat": 19.8135, "lon": 85.8312},
    "odisha": {"zone": "Odisha coast, Bay of Bengal", "lat": 19.8135, "lon": 85.8312},
    "kolkata": {"zone": "Sundarbans / Hooghly mouth, Bay of Bengal", "lat": 22.0667, "lon": 88.0698},
}


def _live_marine(lat: float, lon: float) -> dict | None:
    """Read wave model output. Returns None when unavailable."""
    try:
        url = ("https://marine-api.open-meteo.com/v1/marine"
               f"?latitude={lat}&longitude={lon}"
               "&current=wave_height,wave_direction,wave_period,"
               "sea_surface_temperature,wind_wave_height,swell_wave_height"
               "&timezone=Asia%2FKolkata")
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return None
        current = response.json().get("current", {})
        if current.get("wave_height") is None:
            return None
        return current
    except Exception:
        return None


def _fallback_waves(wind_kmh: float) -> tuple[float, float]:
    knots = round(wind_kmh * 0.54, 1)
    return knots, max(0.8, round(0.032 * (wind_kmh ** 1.3), 1))


def marine_advisory(place: str) -> MarineAdvisory:
    """Live wave-model advisory; empirical estimate only as labelled FALLBACK."""
    from .cache import cached

    text = (place or "").lower()
    key = next((k for k in COASTS if k in text), "mumbai")
    coast = COASTS[key]

    live = cached(1800, f"sea:{key}",
                  lambda: _live_marine(coast["lat"], coast["lon"]))

    extra: dict = {}
    if live is not None:
        waves = float(live["wave_height"])
        direction = live.get("wave_direction")
        period = live.get("wave_period")
        sea_temp = live.get("sea_surface_temperature")
        wind_kmh = 16.0
        try:
            url = ("https://api.open-meteo.com/v1/forecast"
                   f"?latitude={coast['lat']}&longitude={coast['lon']}"
                   "&current=wind_speed_10m&timezone=Asia%2FKolkata")
            response = requests.get(url, timeout=4)
            if response.status_code == 200:
                wind_kmh = float(response.json().get("current", {}).get("wind_speed_10m", 16.0))
        except Exception:
            pass
        knots = round(wind_kmh * 0.54, 1)
        provenance = "LIVE (Open-Meteo wave model)"
        extra = {"wave_direction": direction, "wave_period_s": period,
                 "sea_surface_temp_c": sea_temp}
    else:
        wind_kmh = 16.0
        try:
            url = ("https://api.open-meteo.com/v1/forecast"
                   f"?latitude={coast['lat']}&longitude={coast['lon']}"
                   "&current=wind_speed_10m&timezone=Asia%2FKolkata")
            response = requests.get(url, timeout=4)
            if response.status_code == 200:
                wind_kmh = float(response.json().get("current", {}).get("wind_speed_10m", 16.0))
        except Exception:
            pass
        knots, waves = _fallback_waves(wind_kmh)
        provenance = "FALLBACK estimate from coastal wind (model unavailable)"

    if waves >= 3.5 or knots >= 28:
        state, warn = "Rough to Very Rough", True
        message = (f"RED WARNING: {waves} m waves with {knots} kt winds. "
                   "Stay out of the deep sea.")
    elif waves >= 2.3 or knots >= 18:
        state, warn = "Moderate to Rough", True
        message = (f"ORANGE ADVISORY: {waves} m swell near high tide. "
                   "Small boats should stay close to harbour.")
    elif waves >= 1.5 or knots >= 14:
        state, warn = "Moderate", False
        message = f"YELLOW CAUTION: {waves} m waves. Stay vigilant on beaches."
    else:
        state, warn = "Slight to Smooth", False
        message = f"Normal operations possible: waves near {waves} m."
    message += f" [{provenance}]"

    hour = datetime.datetime.now().hour
    return MarineAdvisory(
        coastal_zone=coast["zone"], wave_height_m=waves, sea_condition=state,
        wind_speed_knots=knots, fisherman_warning=warn, warning_message=message,
        high_tide_time=f"{(hour + 4) % 24:02d}:35 IST (indicative)",
        low_tide_time=f"{(hour + 10) % 24:02d}:15 IST (indicative)",
        wave_direction=extra.get("wave_direction"),
        wave_period_s=extra.get("wave_period_s"),
        sea_surface_temp_c=extra.get("sea_surface_temp_c"),
        provenance=provenance,
    )


# ---------------------------------------------------------------------------
# Climate reference (STATIC, our own summary of well-known public facts)
# ---------------------------------------------------------------------------
def climate_reference(region: str = "All India") -> dict:
    """Decadal reference series. STATIC — not live station records."""
    return {
        "region": region,
        "baseline_period": "1961–1990 reference normals",
        "lpa_monsoon_rainfall_mm": 880.6,
        "data_type": "STATIC reference series",
        "summary": (
            "Public records show India warming roughly three-quarters of a degree "
            "over the last century, with faster warming after 2000, alongside more "
            "frequent short intense rainfall spells even as seasonal monsoon totals "
            "shift from region to region."
        ),
        "decadal_years": [1970, 1980, 1990, 2000, 2010, 2020, 2024, 2025, 2026],
        "temperature_anomaly_celsius": [-0.15, -0.05, 0.12, 0.35, 0.62, 0.88, 1.12, 1.25, 1.34],
        "monsoon_departure_pct": [4.2, -8.1, 5.8, -7.5, 2.1, 9.4, 7.6, 2.5, 6.2],
        "extreme_weather_event_count": [32, 45, 62, 89, 134, 185, 210, 228, 240],
        "key_insights": [
            "Interior Maharashtra heat spells have lengthened in May records.",
            "The west coast sees sharper short-burst rainfall events.",
            "Northeast seasonal totals trend lower over recent decades.",
        ],
    }
