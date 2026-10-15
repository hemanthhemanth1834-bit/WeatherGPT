"""Regression tests for model routing and malformed upstream weather payloads."""
import pytest

from app.services import weather


def test_get_weather_preserves_supported_model_selection(monkeypatch):
    monkeypatch.setattr(weather, "cached", lambda ttl, key, loader: loader())
    observed = []
    monkeypatch.setattr(
        weather, "_download",
        lambda lat, lon, place, state, model="auto": observed.append(model) or model,
    )

    for model in ("auto", "gfs", "ecmwf", "icon"):
        assert weather.get_weather(16.5, 80.6, "Vijayawada", "Andhra Pradesh", model) == model
    assert weather.get_weather(16.5, 80.6, "Vijayawada", "Andhra Pradesh", "unknown") == "auto"
    assert observed == ["auto", "gfs", "ecmwf", "icon", "auto"]


def test_incomplete_open_meteo_payload_is_rejected_not_marked_live():
    with pytest.raises(ValueError, match="missing current data"):
        weather._from_api(
            {"current": {}, "hourly": {}, "daily": {}},
            16.5, 80.6, "Vijayawada", "Andhra Pradesh", "2026-10-14T12:00",
        )



def test_live_weather_summary_marks_heuristic_aqi_as_estimated():
    from app.models import WeatherData
    from app.services.chat import _render_weather

    data = WeatherData(
        location="Vijayawada", state="Andhra Pradesh", status="LIVE",
        data_source="Open-Meteo", aqi=78, aqi_status="Satisfactory",
        hourly=[], daily=[],
    )
    _, markdown = _render_weather("Vijayawada", "Andhra Pradesh", data, "en")
    assert "78 (estimated)" in markdown



def test_live_model_with_missing_optional_fields_stays_live_and_labels_estimates():
    current = {
        "time": "2026-10-14T20:00", "temperature_2m": 28.3,
        "relative_humidity_2m": 79, "apparent_temperature": 32.9,
        "precipitation": 0.0, "weather_code": 3, "cloud_cover": 90,
        "surface_pressure": 1007.0, "wind_speed_10m": 11.9, "wind_direction_10m": 88,
    }
    hourly = {
        "time": ["2026-10-14T20:00"], "temperature_2m": [28.3],
        "precipitation_probability": [18], "precipitation": [0.0],
        "weather_code": [3], "wind_speed_10m": [11.9],
        "relative_humidity_2m": [79], "visibility": [None],
    }
    daily = {
        "time": ["2026-10-14"], "weather_code": [3],
        "temperature_2m_max": [30.0], "temperature_2m_min": [24.0],
        "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
        "sunrise": ["2026-10-14T06:00"], "sunset": ["2026-10-14T17:45"],
        "uv_index_max": [None],
    }
    result = weather._from_api(
        {"current": current, "hourly": hourly, "daily": daily},
        16.5, 80.6, "Vijayawada", "Andhra Pradesh", "2026-10-14T20:00",
        "ECMWF IFS (via Open-Meteo)",
    )
    assert result.status == "LIVE"
    assert result.nwp_model == "ECMWF IFS (via Open-Meteo)"
    assert result.uv_index_source.startswith("Estimated")
    assert result.visibility_source.startswith("Estimated")
