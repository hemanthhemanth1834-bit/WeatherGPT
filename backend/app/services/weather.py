"""Live weather retrieval (Open-Meteo) with caching. Original implementation.

Every payload carries source transparency fields. If the upstream API is
unreachable, a clearly labelled SIMULATED estimate is returned instead of
an error, so the UI never crashes — but it is never presented as observed.
"""
import datetime
from typing import List

import requests

from ..config import WEATHER_CACHE_TTL_SECONDS
from ..models import DailyPoint, HourlyPoint, WeatherData
from .cache import cached

# WMO weather-code interpretation. Codes themselves are the WMO standard;
# labels below are our own short descriptions.
WMO_LABELS = {
    0: ("Clear Sky", "Sun"),
    1: ("Mainly Clear", "SunMedium"),
    2: ("Partly Cloudy", "CloudSun"),
    3: ("Overcast", "Cloud"),
    45: ("Fog", "CloudFog"),
    48: ("Icy Fog", "CloudFog"),
    51: ("Light Drizzle", "CloudDrizzle"),
    53: ("Drizzle", "CloudDrizzle"),
    55: ("Heavy Drizzle", "CloudDrizzle"),
    61: ("Light Rain", "CloudRain"),
    63: ("Moderate Rain", "CloudRain"),
    65: ("Heavy Rain", "CloudRainWind"),
    71: ("Light Snow", "Snowflake"),
    73: ("Snow", "Snowflake"),
    75: ("Heavy Snow", "Snowflake"),
    80: ("Light Showers", "CloudRain"),
    81: ("Showers", "CloudRain"),
    82: ("Violent Showers", "CloudLightning"),
    95: ("Thunderstorm", "CloudLightning"),
    96: ("Storm with Hail", "CloudHail"),
    99: ("Severe Storm with Hail", "CloudHail"),
}

_COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def ist_now_label() -> str:
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    return datetime.datetime.now(ist).strftime("%d %b %Y, %H:%M IST")


def compass(degrees: float) -> str:
    try:
        return _COMPASS[int((float(degrees) + 11.25) / 22.5) % 16]
    except (TypeError, ValueError):
        return "—"


def aqi_band(aqi: int) -> str:
    for limit, label in ((50, "Good"), (100, "Satisfactory"), (200, "Moderate"),
                         (300, "Poor"), (400, "Very Poor")):
        if aqi <= limit:
            return label
    return "Severe"


def estimate_aqi(state: str) -> int:
    """Placeholder AQI heuristic until a licensed feed is connected."""
    lowered = (state or "").lower()
    if "delhi" in lowered:
        return 145
    if "kerala" in lowered or "goa" in lowered:
        return 68
    return 78


def get_weather(lat: float, lon: float, place: str, state: str) -> WeatherData:
    """Cached entry point used by routes and the chat engine."""
    key = f"wx:{round(lat, 3)}:{round(lon, 3)}:{place}:{state}"
    return cached(WEATHER_CACHE_TTL_SECONDS, key,
                  lambda: _download(lat, lon, place, state))


def _download(lat: float, lon: float, place: str, state: str) -> WeatherData:
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    current_hour = datetime.datetime.now(ist).strftime("%Y-%m-%dT%H:00")
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
            "precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m"
            "&hourly=temperature_2m,precipitation_probability,precipitation,"
            "weather_code,wind_speed_10m"
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max"
            "&timezone=Asia%2FKolkata"
        )
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return _from_api(response.json(), lat, lon, place, state, current_hour)
    except Exception:
        pass
    return _fallback(lat, lon, place, state)


def _from_api(payload: dict, lat: float, lon: float, place: str,
              state: str, current_hour: str) -> WeatherData:
    current = payload.get("current", {})
    hourly_raw = payload.get("hourly", {})
    daily_raw = payload.get("daily", {})

    code = int(current.get("weather_code", 1))
    label, icon = WMO_LABELS.get(code, ("Clear Sky", "Sun"))
    rain_now = float(current.get("precipitation", 0.0) or 0.0)

    times = hourly_raw.get("time", [])
    start = next((i for i, t in enumerate(times) if t >= current_hour), 0)

    hourly: List[HourlyPoint] = []
    for offset in range(min(24, len(times) - start)):
        i = start + offset
        hcode = (hourly_raw.get("weather_code", []) + [1])[i] if i < len(hourly_raw.get("weather_code", [])) else 1
        hlabel, hicon = WMO_LABELS.get(int(hcode), ("Clear Sky", "Sun"))
        temps = hourly_raw.get("temperature_2m", [])
        probs = hourly_raw.get("precipitation_probability", [])
        winds = hourly_raw.get("wind_speed_10m", [])
        stamp = times[i]
        hourly.append(HourlyPoint(
            time=stamp.split("T")[1] if "T" in stamp else stamp,
            temp=round(float(temps[i]), 1) if i < len(temps) else 25.0,
            rain_prob=int(probs[i]) if i < len(probs) and probs[i] is not None else 0,
            condition=hlabel, icon=hicon,
            wind_speed=round(float(winds[i]), 1) if i < len(winds) else 10.0,
        ))

    daily: List[DailyPoint] = []
    dates = daily_raw.get("time", [])
    for i in range(min(7, len(dates))):
        dcode_list = daily_raw.get("weather_code", [])
        dcode = int(dcode_list[i]) if i < len(dcode_list) else 1
        dlabel, dicon = WMO_LABELS.get(dcode, ("Clear Sky", "Sun"))
        day = datetime.date.fromisoformat(dates[i])
        tmax = daily_raw.get("temperature_2m_max", [])
        tmin = daily_raw.get("temperature_2m_min", [])
        rsum = daily_raw.get("precipitation_sum", [])
        wmax = daily_raw.get("wind_speed_10m_max", [])
        daily.append(DailyPoint(
            date=dates[i], day="Today" if i == 0 else day.strftime("%a"),
            temp_max=round(float(tmax[i]), 1) if i < len(tmax) else 32.0,
            temp_min=round(float(tmin[i]), 1) if i < len(tmin) else 22.0,
            condition=dlabel, icon=dicon,
            rain_sum=round(float(rsum[i]), 1) if i < len(rsum) else 0.0,
            wind_max=round(float(wmax[i]), 1) if i < len(wmax) else 15.0,
        ))

    aqi = estimate_aqi(state)
    rise = (daily_raw.get("sunrise", ["06:05"]) or ["06:05"])[0]
    fall = (daily_raw.get("sunset", ["18:35"]) or ["18:35"])[0]
    uv_list = daily_raw.get("uv_index_max", [6.0]) or [6.0]
    return WeatherData(
        location=place, state=state, country="India", lat=lat, lon=lon,
        current_temp=round(float(current.get("temperature_2m", 28.0)), 1),
        feels_like=round(float(current.get("apparent_temperature", 30.0)), 1),
        condition=label, condition_code=code,
        humidity=int(current.get("relative_humidity_2m", 60)),
        wind_speed=round(float(current.get("wind_speed_10m", 12.0)), 1),
        wind_direction=compass(current.get("wind_direction_10m", 270)),
        precipitation=rain_now,
        pressure=round(float(current.get("surface_pressure", 1012.0)), 1),
        uv_index=round(float(uv_list[0]), 1),
        visibility=9.0, aqi=aqi, aqi_status=aqi_band(aqi),
        sunrise=rise.split("T")[1] if "T" in rise else rise,
        sunset=fall.split("T")[1] if "T" in fall else fall,
        hourly=hourly, daily=daily,
        nwp_model="Open-Meteo NWP blend (GFS + ICON + ECMWF HRES)",
        data_source="Open-Meteo", data_type="Forecast", status="LIVE",
        updated_at_ist=ist_now_label(), confidence="Provider/model dependent",
    )


def _fallback(lat: float, lon: float, place: str, state: str) -> WeatherData:
    """Labelled estimate used only when the upstream API is unreachable."""
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now = datetime.datetime.now(ist)
    hourly = [
        HourlyPoint(time=f"{(now.hour + i) % 24:02d}:00", temp=27.0,
                    rain_prob=15, condition="Partly Cloudy",
                    icon="CloudSun", wind_speed=12.0)
        for i in range(24)
    ]
    daily = [
        DailyPoint(date=(now + datetime.timedelta(days=i)).strftime("%Y-%m-%d"),
                   day="Today" if i == 0 else (now + datetime.timedelta(days=i)).strftime("%a"),
                   temp_max=31.0, temp_min=23.0, condition="Partly Cloudy",
                   icon="CloudSun", rain_sum=0.5, wind_max=15.0)
        for i in range(7)
    ]
    return WeatherData(
        location=place, state=state, country="India", lat=lat, lon=lon,
        current_temp=27.0, feels_like=29.0, condition="Partly Cloudy",
        condition_code=2, humidity=65, wind_speed=12.0, wind_direction="W",
        precipitation=0.0, pressure=1011.0, uv_index=6.0, visibility=8.0,
        aqi=80, aqi_status="Satisfactory", sunrise="06:05", sunset="18:35",
        hourly=hourly, daily=daily,
        nwp_model="Unavailable — local estimate",
        data_source="Local estimate (upstream unreachable)",
        data_type="Estimated", status="SIMULATED",
        updated_at_ist=ist_now_label(),
        confidence="Low — upstream API unreachable; not an observation",
    )
