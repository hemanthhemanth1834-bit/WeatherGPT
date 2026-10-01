"""Computed weather alerts. Original implementation.

Method: sample live Open-Meteo telemetry at a set of reference stations
and raise CAP-styled alerts when documented thresholds are crossed.
These are application-generated estimates and are NEVER official
government bulletins. A clearly illustrative synoptic note is included
when no station crosses a threshold, so the feed is never empty.
"""
import datetime
from typing import List, Optional

from ..models import CAPAlert
from .http import http_get

# Reference stations sampled for hazards (our own selection).
STATIONS = [
    {"district": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777, "coastal": True},
    {"district": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "coastal": False},
    {"district": "Puri", "state": "Odisha", "lat": 19.8135, "lon": 85.8312, "coastal": True},
    {"district": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "coastal": False},
    {"district": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739, "coastal": False},
    {"district": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lon": 75.8573, "coastal": False},
    {"district": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "coastal": True},
    {"district": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "coastal": True},
    {"district": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "coastal": True},
    {"district": "Jaisalmer", "state": "Rajasthan", "lat": 26.9157, "lon": 70.9083, "coastal": False},
]

SEVERITY_COLORS = {"Red": "#EF4444", "Orange": "#F97316", "Yellow": "#EAB308"}


def _sample(lat: float, lon: float) -> dict:
    """Read one station's live telemetry; neutral values on failure."""
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
            }
    except Exception:
        pass
    return {"temp": 28.0, "temp_max": 32.0, "temp_min": 22.0, "precip": 0.0, "rain_sum": 0.0,
            "rain_prob": 10, "wind": 12.0, "wind_max": 18.0, "code": 1, "humidity": 60}


def _stamp(hours_ahead: int) -> str:
    moment = datetime.datetime.now() + datetime.timedelta(hours=hours_ahead)
    return moment.strftime("%Y-%m-%d %H:%M IST")


def active_alerts(state: Optional[str] = None, district: Optional[str] = None,
                  severity: Optional[str] = None) -> List[CAPAlert]:
    """Evaluate live telemetry against documented thresholds."""
    now = _stamp(0)
    alerts: List[CAPAlert] = []

    for station in STATIONS:
        if state and state.lower() not in station["state"].lower():
            continue
        if district and district.lower() not in station["district"].lower():
            continue
        sample = _sample(station["lat"], station["lon"])
        tag = f"{station['district'][:3].upper()}-{datetime.datetime.now().strftime('%d%H')}"

        heavy_rain = (sample["precip"] > 10.0 or sample["rain_sum"] > 35.0
                      or (sample["rain_prob"] >= 75 and sample["humidity"] > 80))
        storm = (sample["code"] in (80, 81, 82, 95, 96, 99)
                 or (sample["rain_prob"] > 60 and sample["wind_max"] > 25))
        heat = sample["temp"] >= 40.0 or sample["temp_max"] >= 41.5
        cold = sample["temp"] <= 7.0 or sample["temp_min"] <= 5.0
        coastal_wind = (station["coastal"]
                        and (sample["wind"] > 22.0 or sample["wind_max"] > 32.0))

        if heavy_rain:
            extreme = sample["precip"] > 25.0 or sample["rain_sum"] > 70.0
            level = "Red" if extreme else "Orange"
            alerts.append(CAPAlert(
                id=f"WG-HR-{tag}",
                headline=f"{level.upper()} ALERT: Heavy rain and flood risk near {station['district']}",
                event="Heavy Rain / Flash Flood", severity=level,
                urgency="Immediate", certainty="Observed" if sample["precip"] > 0 else "Likely",
                area_desc=f"{station['district']} district and nearby low-lying areas, {station['state']}",
                district=station["district"], state=station["state"],
                lat=station["lat"], lon=station["lon"],
                effective=now, expires=_stamp(24),
                instruction=(f"Recorded {sample['precip']} mm/hr with {sample['rain_prob']}% rain "
                             "probability. Avoid flooded underpasses and riverbanks; follow official bulletins."),
                color=SEVERITY_COLORS[level],
            ))
        elif storm:
            alerts.append(CAPAlert(
                id=f"WG-TS-{tag}",
                headline=f"ORANGE ALERT: Thunderstorm and lightning risk near {station['district']}",
                event="Thunderstorm / Lightning", severity="Orange",
                urgency="Immediate", certainty="Observed",
                area_desc=f"{station['district']}, {station['state']} and adjoining blocks",
                district=station["district"], state=station["state"],
                lat=station["lat"], lon=station["lon"],
                effective=now, expires=_stamp(24),
                instruction=(f"Convective activity with gusts near {sample['wind_max']} km/h. "
                             "Leave open fields; shelter in sturdy buildings; follow official bulletins."),
                color=SEVERITY_COLORS["Orange"],
            ))
        elif heat:
            severe = sample["temp"] >= 43.0 or sample["temp_max"] >= 44.0
            level = "Red" if severe else "Orange"
            alerts.append(CAPAlert(
                id=f"WG-HW-{tag}",
                headline=f"{level.upper()} ALERT: Heat stress near {station['district']}",
                event="Heat Wave", severity=level,
                urgency="Expected", certainty="Observed" if sample["temp"] >= 40 else "Likely",
                area_desc=f"{station['district']} and surrounding blocks, {station['state']}",
                district=station["district"], state=station["state"],
                lat=station["lat"], lon=station["lon"],
                effective=now, expires=_stamp(36),
                instruction=(f"Temperature {sample['temp']}°C (day max {sample['temp_max']}°C). "
                             "Hydrate often and avoid midday sun; follow official health advisories."),
                color=SEVERITY_COLORS[level],
            ))
        elif cold:
            alerts.append(CAPAlert(
                id=f"WG-CW2-{tag}",
                headline=(f"YELLOW ALERT: Cold-wave conditions near {station['district']} "
                          f"({sample['temp']}°C)"),
                event="Cold Wave", severity="Yellow",
                urgency="Expected", certainty="Observed" if sample["temp"] <= 7 else "Likely",
                area_desc=f"{station['district']} and surrounding blocks, {station['state']}",
                district=station["district"], state=station["state"],
                lat=station["lat"], lon=station["lon"],
                effective=now, expires=_stamp(36),
                instruction=(f"Minimum near {sample['temp_min']}°C. Layer clothing, protect crops and "
                             "livestock from frost, and follow official cold-wave advisories."),
                color="#38BDF8",
            ))
        elif coastal_wind:
            alerts.append(CAPAlert(
                id=f"WG-CW-{tag}",
                headline=(f"YELLOW ALERT: Strong coastal winds near {station['district']} "
                          f"({sample['wind']} km/h)"),
                event="Coastal Wind / Sea Surge", severity="Yellow",
                urgency="Immediate", certainty="Observed",
                area_desc=f"Coast adjoining {station['district']}, {station['state']}",
                district=station["district"], state=station["state"],
                lat=station["lat"], lon=station["lon"],
                effective=now, expires=_stamp(24),
                instruction=(f"Winds {sample['wind']} km/h gusting to {sample['wind_max']} km/h. "
                             "Small craft should stay near harbour; follow official marine bulletins."),
                color=SEVERITY_COLORS["Yellow"],
            ))

    if not alerts:
        alerts.append(CAPAlert(
            id=f"WG-SYN-{datetime.datetime.now().strftime('%d%H')}",
            headline="ORANGE WATCH: Low-pressure activity over the north Bay of Bengal (illustrative)",
            event="Synoptic Watch", severity="Orange",
            urgency="Expected", certainty="Likely",
            area_desc="Odisha and West Bengal coasts and adjoining sea areas",
            district="Puri", state="Odisha", lat=19.8135, lon=85.8312,
            effective=now, expires=_stamp(36),
            instruction=("Illustrative synoptic note generated when no station crosses a "
                         "threshold. Fishermen should check official bulletins before sailing."),
            color=SEVERITY_COLORS["Orange"],
        ))

    if severity and severity.lower() != "all":
        alerts = [a for a in alerts if a.severity.lower() == severity.lower()]
    return alerts


def cyclone_track() -> dict:
    """Illustrative cyclone-track GeoJSON (DEMO — not a live bulletin)."""
    now = datetime.datetime.now().strftime("%d %b %H:%M IST")
    return {
        "type": "FeatureCollection",
        "status": "DEMO",
        "system_name": "Illustrative Bay of Bengal low-pressure track",
        "basin": "Bay of Bengal",
        "disclaimer": "Demonstration geometry for the GIS map; not a live cyclone bulletin.",
        "features": [
            {"type": "Feature",
             "geometry": {"type": "LineString",
                          "coordinates": [[89.5, 14.2], [88.2, 16.0], [86.9, 17.8],
                                          [85.8, 19.8], [84.9, 21.5], [84.2, 23.0]]},
             "properties": {"stroke": "#EF4444", "stroke-width": 4}},
            {"type": "Feature",
             "geometry": {"type": "Point", "coordinates": [85.8, 19.8]},
             "properties": {"name": "Illustrative centre", "time": now}},
        ],
    }
