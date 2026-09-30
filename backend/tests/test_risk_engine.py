"""Unit tests for the deterministic risk engine (no network required)."""
from app.schemas.models import (
    WeatherData, HourlyForecast, DailyForecast,
)
from app.services.risk_engine import assess_risk


def _make_weather(temp=30.0, feels=32.0, precip=0.0, wind=10.0, code=1, rain_prob=10):
    hourly = [
        HourlyForecast(time=f"{h:02d}:00", temp=temp, rain_prob=rain_prob,
                       condition="Clear", icon="Sun", wind_speed=wind)
        for h in range(12)
    ]
    daily = [
        DailyForecast(date="2026-09-30", day="Today", temp_max=temp + 3,
                      temp_min=temp - 3, condition="Clear", icon="Sun",
                      rain_sum=precip, wind_max=wind)
    ]
    return WeatherData(
        location="Testville", state="Test State", lat=18.5, lon=73.8,
        current_temp=temp, feels_like=feels, condition="Clear",
        condition_code=code, humidity=60, wind_speed=wind,
        wind_direction="W", precipitation=precip, pressure=1012.0,
        uv_index=6.0, visibility=9.0, aqi=80, aqi_status="Satisfactory",
        sunrise="06:05", sunset="18:35", hourly=hourly, daily=daily,
    )


def test_low_risk_calm_day():
    result = assess_risk(_make_weather())
    assert result["overall"] == "LOW"
    assert result["levels"]["heat"] == "LOW"
    assert result["data_type"] == "ESTIMATED"


def test_extreme_heat():
    result = assess_risk(_make_weather(temp=46.0, feels=49.0))
    assert result["levels"]["heat"] == "EXTREME"
    assert result["overall"] == "EXTREME"


def test_extreme_rainfall():
    result = assess_risk(_make_weather(precip=30.0, rain_prob=90))
    assert result["levels"]["rainfall"] == "EXTREME"


def test_extreme_wind():
    result = assess_risk(_make_weather(wind=65.0))
    assert result["levels"]["wind"] == "EXTREME"


def test_thunderstorm_codes():
    result = assess_risk(_make_weather(code=96))
    assert result["levels"]["thunderstorm"] == "EXTREME"
