"""Explicit synthetic weather fixture for unit tests only; never used by app code."""
import datetime

from app.models import DailyPoint, HourlyPoint, WeatherData


def make_test_weather(lat: float, lon: float, place: str, state: str) -> WeatherData:
    now = datetime.datetime(2026, 10, 18, 12, 0)
    hourly = [
        HourlyPoint(time=f"{(12 + i) % 24:02d}:00", temp=27.0, rain_prob=15,
                    condition="Partly Cloudy", icon="CloudSun",
                    wind_speed=12.0, humidity=65)
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
        precipitation=0.0, cloud_cover=25.0, pressure=1011.0, uv_index=6.0,
        uv_index_source="Local estimate (upstream unreachable)", visibility=8.0,
        visibility_source="Local estimate (upstream unreachable)",
        aqi=80, aqi_status="Satisfactory", sunrise="06:05", sunset="18:35",
        hourly=hourly, daily=daily, nwp_model="Unavailable — local estimate",
        data_source="Local estimate (upstream unreachable)", data_type="Estimated",
        status="SIMULATED", updated_at_ist="",
        confidence="Test-only fixture; not real weather data",
    )
