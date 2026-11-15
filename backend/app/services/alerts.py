"""Computed weather alerts. Original implementation.

Method: sample live Open-Meteo telemetry at a set of reference stations
and raise CAP-styled alerts when documented thresholds are crossed.
These are application-generated estimates and are NEVER official
government bulletins. The feed stays empty when no threshold is crossed
or the upstream provider data is unavailable.
"""

import datetime
import math
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from ..models import CAPAlert
from .http import http_get

# Reference stations sampled for hazards (our own selection).
STATIONS = [
    {
        "district": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lon": 72.8777,
        "coastal": True,
    },
    {
        "district": "Nagpur",
        "state": "Maharashtra",
        "lat": 21.1458,
        "lon": 79.0882,
        "coastal": False,
    },
    {
        "district": "Puri",
        "state": "Odisha",
        "lat": 19.8135,
        "lon": 85.8312,
        "coastal": True,
    },
    {
        "district": "New Delhi",
        "state": "Delhi",
        "lat": 28.6139,
        "lon": 77.2090,
        "coastal": False,
    },
    {
        "district": "Varanasi",
        "state": "Uttar Pradesh",
        "lat": 25.3176,
        "lon": 82.9739,
        "coastal": False,
    },
    {
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.9010,
        "lon": 75.8573,
        "coastal": False,
    },
    {
        "district": "Kolkata",
        "state": "West Bengal",
        "lat": 22.5726,
        "lon": 88.3639,
        "coastal": True,
    },
    {
        "district": "Chennai",
        "state": "Tamil Nadu",
        "lat": 13.0827,
        "lon": 80.2707,
        "coastal": True,
    },
    {
        "district": "Kochi",
        "state": "Kerala",
        "lat": 9.9312,
        "lon": 76.2673,
        "coastal": True,
    },
    {
        "district": "Jaisalmer",
        "state": "Rajasthan",
        "lat": 26.9157,
        "lon": 70.9083,
        "coastal": False,
    },
]

SEVERITY_COLORS = {"Red": "#EF4444", "Orange": "#F97316", "Yellow": "#EAB308"}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two points."""
    radius = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def scope_for_distance(distance_km: float) -> str:
    if distance_km <= 50:
        return "LOCAL"
    if distance_km <= 150:
        return "REGIONAL"
    return "NATIONAL"


def _sample(lat: float, lon: float) -> dict:
    """Read one station's model-derived weather data; failures are unavailable, not calm weather."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,precipitation,"
            "weather_code,wind_speed_10m"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
            "precipitation_probability_max,wind_speed_10m_max"
            "&timezone=Asia%2FKolkata"
        )
        response = http_get(url, timeout=4)
        if response.status_code == 200:
            data = response.json()
            current = data.get("current", {})
            daily = data.get("daily", {})
            required_current = (
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
            )
            required_daily = (
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "precipitation_probability_max",
                "wind_speed_10m_max",
            )
            if (
                not isinstance(current, dict)
                or not isinstance(daily, dict)
                or any(current.get(key) is None for key in required_current)
                or any(
                    not isinstance(daily.get(key), list)
                    or not daily[key]
                    or daily[key][0] is None
                    for key in required_daily
                )
            ):
                return {"available": False}
            first = lambda key, default: (daily.get(key, [default]) or [default])[0]
            return {
                "temp": float(current.get("temperature_2m", 28.0)),
                "temp_max": float(first("temperature_2m_max", 32.0)),
                "temp_min": float(first("temperature_2m_min", 22.0)),
                "precip": float(current.get("precipitation", 0.0)),
                "rain_sum": float(first("precipitation_sum", 0.0)),
                "rain_prob": int(first("precipitation_probability_max", 10)),
                "wind": float(current.get("wind_speed_10m", 12.0)),
                "wind_max": float(first("wind_speed_10m_max", 18.0)),
                "code": int(current.get("weather_code", 1)),
                "humidity": int(current.get("relative_humidity_2m", 60)),
                "available": True,
                "current_time": str(current.get("time", "")),
            }
    except Exception:
        pass
    return {"available": False}


def _stamp(hours_ahead: int) -> str:
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    moment = datetime.datetime.now(ist) + datetime.timedelta(hours=hours_ahead)
    return moment.strftime("%Y-%m-%d %H:%M IST")


def active_alerts(
    state: Optional[str] = None,
    district: Optional[str] = None,
    severity: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 300.0,
) -> List[CAPAlert]:
    """Evaluate live telemetry against documented thresholds.

    When caller coordinates are supplied, only reference stations inside
    ``radius_km`` are evaluated and every alert carries its distance and a
    LOCAL/REGIONAL/NATIONAL scope. Without coordinates the legacy state/
    district filter is preserved for existing clients and tests.
    """
    now = _stamp(0)
    alerts: List[CAPAlert] = []

    has_origin = (
        isinstance(lat, (int, float))
        and isinstance(lon, (int, float))
        and math.isfinite(float(lat))
        and math.isfinite(float(lon))
        and -90 <= float(lat) <= 90
        and -180 <= float(lon) <= 180
    )
    try:
        search_radius = max(25.0, min(float(radius_km), 1000.0))
    except (TypeError, ValueError):
        search_radius = 300.0

    origin_lat = float(lat) if isinstance(lat, (int, float)) else 0.0
    origin_lon = float(lon) if isinstance(lon, (int, float)) else 0.0

    if has_origin:
        # Coordinates are authoritative. Do not also apply a state/district
        # substring filter, which could silently hide a genuinely nearby alert.
        stations = [
            station
            for station in STATIONS
            if haversine_km(origin_lat, origin_lon, station["lat"], station["lon"])
            <= search_radius
        ]
    else:
        stations = [
            station
            for station in STATIONS
            if not state or state.lower() in station["state"].lower()
            if not district or district.lower() in station["district"].lower()
        ]
    if not stations:
        return alerts

    with ThreadPoolExecutor(max_workers=min(5, len(stations))) as pool:
        samples = list(
            pool.map(
                lambda station: _sample(station["lat"], station["lon"]),
                stations,
            )
        )

    for station, sample in zip(stations, samples):
        # Never derive a warning from fallback/default numbers after a provider failure.
        if not sample.get("available"):
            continue
        tag = f"{station['district'][:3].upper()}-{datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime('%d%H')}"

        # Probability and humidity alone indicate possible rain, not heavy rainfall.
        # Use conservative India rainfall screening thresholds: >=20 mm in the
        # current hour is an intense spell; >=64.5 mm daily is the IMD heavy-rain
        # category. These remain app-computed estimates, never official warnings.
        heavy_rain = sample["precip"] >= 20.0 or sample["rain_sum"] >= 64.5
        # WMO 80–82 are rain showers, not thunderstorms. Do not infer a
        # thunderstorm from rain probability and wind alone.
        storm = sample["code"] in (95, 96, 99)
        heat = sample["temp"] >= 40.0 or sample["temp_max"] >= 41.5
        cold = sample["temp"] <= 7.0 or sample["temp_min"] <= 5.0
        coastal_wind = station["coastal"] and (
            sample["wind"] > 22.0 or sample["wind_max"] > 32.0
        )

        if heavy_rain:
            extreme = sample["precip"] >= 30.0 or sample["rain_sum"] >= 115.6
            level = "Red" if extreme else "Orange"
            alerts.append(
                CAPAlert(
                    id=f"WG-HR-{tag}",
                    headline=f"COMPUTED {level.upper()} HEAVY-RAIN RISK near {station['district']}",
                    event="Modelled Heavy Rain Risk",
                    severity=level,
                    urgency="Expected",
                    certainty="Likely",
                    area_desc=f"{station['district']} district and nearby low-lying areas, {station['state']}",
                    district=station["district"],
                    state=station["state"],
                    lat=station["lat"],
                    lon=station["lon"],
                    effective=now,
                    expires=_stamp(24),
                    instruction=(
                        f"Open-Meteo model indicates {sample['precip']} mm current-hour precipitation "
                        f"and {sample['rain_sum']} mm daily accumulation, with {sample['rain_prob']}% "
                        "maximum daily rain probability. This is a computed estimate, not an official warning. "
                        "Avoid flooded underpasses if flooding occurs and check official bulletins."
                    ),
                    sender_name="WeatherGPT computed estimate (Open-Meteo; not an official bulletin)",
                    color=SEVERITY_COLORS[level],
                )
            )
        elif storm:
            alerts.append(
                CAPAlert(
                    id=f"WG-TS-{tag}",
                    headline=f"COMPUTED ORANGE THUNDERSTORM RISK near {station['district']}",
                    event="Modelled Thunderstorm Risk",
                    severity="Orange",
                    urgency="Expected",
                    certainty="Likely",
                    area_desc=f"{station['district']}, {station['state']} and adjoining blocks",
                    district=station["district"],
                    state=station["state"],
                    lat=station["lat"],
                    lon=station["lon"],
                    effective=now,
                    expires=_stamp(24),
                    instruction=(
                        f"Forecast thunderstorm signal with winds up to {sample['wind_max']} km/h. "
                        "This is a model-based estimate, not an official warning. Follow official bulletins."
                    ),
                    sender_name="WeatherGPT computed estimate (Open-Meteo; not an official bulletin)",
                    color=SEVERITY_COLORS["Orange"],
                )
            )
        elif heat:
            severe = sample["temp"] >= 43.0 or sample["temp_max"] >= 44.0
            level = "Red" if severe else "Orange"
            alerts.append(
                CAPAlert(
                    id=f"WG-HW-{tag}",
                    headline=f"COMPUTED {level.upper()} HEAT-RISK ESTIMATE near {station['district']}",
                    event="Heat Wave",
                    severity=level,
                    urgency="Expected",
                    certainty="Likely",
                    area_desc=f"{station['district']} and surrounding blocks, {station['state']}",
                    district=station["district"],
                    state=station["state"],
                    lat=station["lat"],
                    lon=station["lon"],
                    effective=now,
                    expires=_stamp(36),
                    instruction=(
                        f"Modelled temperature {sample['temp']}°C (forecast daily max {sample['temp_max']}°C). "
                        "Hydrate often and avoid midday sun; follow official health advisories."
                    ),
                    sender_name="WeatherGPT computed estimate (Open-Meteo; not an official bulletin)",
                    color=SEVERITY_COLORS[level],
                )
            )
        elif cold:
            alerts.append(
                CAPAlert(
                    id=f"WG-CW2-{tag}",
                    headline=(
                        f"COMPUTED YELLOW COLD-RISK ESTIMATE near {station['district']} "
                        f"({sample['temp']}°C)"
                    ),
                    event="Cold Wave",
                    severity="Yellow",
                    urgency="Expected",
                    certainty="Likely",
                    area_desc=f"{station['district']} and surrounding blocks, {station['state']}",
                    district=station["district"],
                    state=station["state"],
                    lat=station["lat"],
                    lon=station["lon"],
                    effective=now,
                    expires=_stamp(36),
                    instruction=(
                        f"Modelled daily minimum near {sample['temp_min']}°C. Layer clothing and "
                        "follow official cold-wave advisories; this is not an official warning."
                    ),
                    sender_name="WeatherGPT computed estimate (Open-Meteo; not an official bulletin)",
                    color="#38BDF8",
                )
            )
        elif coastal_wind:
            alerts.append(
                CAPAlert(
                    id=f"WG-CW-{tag}",
                    headline=(
                        f"COMPUTED YELLOW COASTAL-WIND RISK near {station['district']} "
                        f"({sample['wind']} km/h)"
                    ),
                    event="Coastal Wind / Sea Surge",
                    severity="Yellow",
                    urgency="Expected",
                    certainty="Likely",
                    area_desc=f"Coast adjoining {station['district']}, {station['state']}",
                    district=station["district"],
                    state=station["state"],
                    lat=station["lat"],
                    lon=station["lon"],
                    effective=now,
                    expires=_stamp(24),
                    instruction=(
                        f"Modelled winds {sample['wind']} km/h with forecast maximum {sample['wind_max']} km/h. "
                        "Check official marine bulletins before making safety decisions."
                    ),
                    sender_name="WeatherGPT computed estimate (Open-Meteo; not an official bulletin)",
                    color=SEVERITY_COLORS["Yellow"],
                )
            )

    # An empty list is preferable to inventing a warning when no station crosses
    # a threshold or every provider request fails.

    if has_origin:
        for alert in alerts:
            distance = haversine_km(origin_lat, origin_lon, alert.lat, alert.lon)
            alert.distance_km = round(distance, 1)
            alert.scope = scope_for_distance(distance)
    else:
        default_scope = "LOCAL" if district else "REGIONAL" if state else "NATIONAL"
        for alert in alerts:
            alert.scope = default_scope

    if severity and severity.lower() != "all":
        alerts = [a for a in alerts if a.severity.lower() == severity.lower()]
    return alerts
