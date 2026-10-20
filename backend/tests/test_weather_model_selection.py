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



@pytest.mark.parametrize(
    ("group", "field"),
    [
        ("hourly", "temperature_2m"),
        ("hourly", "precipitation_probability"),
        ("hourly", "wind_speed_10m"),
        ("hourly", "relative_humidity_2m"),
        ("daily", "temperature_2m_max"),
        ("daily", "temperature_2m_min"),
        ("daily", "precipitation_sum"),
        ("daily", "wind_speed_10m_max"),
        ("daily", "sunrise"),
        ("daily", "sunset"),
    ],
)
def test_incomplete_forecast_arrays_are_rejected(group, field):
    payload = {
        "current": {
            "temperature_2m": 28.3, "relative_humidity_2m": 79,
            "apparent_temperature": 32.9, "precipitation": 0.0,
            "weather_code": 3, "cloud_cover": 90, "surface_pressure": 1007.0,
            "wind_speed_10m": 11.9, "wind_direction_10m": 88,
        },
        "hourly": {
            "time": ["2026-10-14T20:00"], "temperature_2m": [28.3],
            "precipitation_probability": [18], "weather_code": [3],
            "wind_speed_10m": [11.9], "relative_humidity_2m": [79],
            "visibility": [None],
        },
        "daily": {
            "time": ["2026-10-14"], "weather_code": [3],
            "temperature_2m_max": [30.0], "temperature_2m_min": [24.0],
            "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
            "sunrise": ["2026-10-14T06:00"], "sunset": ["2026-10-14T17:45"],
            "uv_index_max": [None],
        },
    }
    payload[group].pop(field)

    with pytest.raises(ValueError, match=field):
        weather._from_api(
            payload, 16.5, 80.6, "Vijayawada", "Andhra Pradesh",
            "2026-10-14T20:00",
        )


def test_null_forecast_value_is_rejected_instead_of_rendered_as_zero():
    payload = {
        "current": {
            "temperature_2m": 28.3, "relative_humidity_2m": 79,
            "apparent_temperature": 32.9, "precipitation": 0.0,
            "weather_code": 3, "cloud_cover": 90, "surface_pressure": 1007.0,
            "wind_speed_10m": 11.9, "wind_direction_10m": 88,
        },
        "hourly": {
            "time": ["2026-10-14T20:00"], "temperature_2m": [28.3],
            "precipitation_probability": [None], "weather_code": [3],
            "wind_speed_10m": [11.9], "relative_humidity_2m": [79],
        },
        "daily": {
            "time": ["2026-10-14"], "weather_code": [3],
            "temperature_2m_max": [30.0], "temperature_2m_min": [24.0],
            "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
            "sunrise": ["2026-10-14T06:00"], "sunset": ["2026-10-14T17:45"],
        },
    }

    with pytest.raises(ValueError, match="precipitation_probability contains missing values"):
        weather._from_api(
            payload, 16.5, 80.6, "Vijayawada", "Andhra Pradesh",
            "2026-10-14T20:00",
        )


def test_icon_model_preserves_missing_rain_probability_as_unavailable():
    current = {
        "temperature_2m": 28.3, "relative_humidity_2m": 79,
        "apparent_temperature": 32.9, "precipitation": 0.0,
        "weather_code": 3, "cloud_cover": 90, "surface_pressure": 1007.0,
        "wind_speed_10m": 11.9, "wind_direction_10m": 88,
    }
    hourly = {
        "time": ["2026-10-14T20:00"], "temperature_2m": [28.3],
        "precipitation_probability": [None], "weather_code": [3],
        "wind_speed_10m": [11.9], "relative_humidity_2m": [79],
    }
    daily = {
        "time": ["2026-10-14"], "weather_code": [3],
        "temperature_2m_max": [30.0], "temperature_2m_min": [24.0],
        "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
        "sunrise": ["2026-10-14T06:00"], "sunset": ["2026-10-14T17:45"],
    }
    result = weather._from_api(
        {"current": current, "hourly": hourly, "daily": daily},
        16.5, 80.6, "Vijayawada", "Andhra Pradesh", "2026-10-14T20:00",
        "DWD ICON (via Open-Meteo)",
    )
    assert result.status == "LIVE"
    assert result.hourly[0].rain_prob is None


def test_icon_model_still_rejects_missing_probability_array():
    # An absent array is a malformed response, unlike a present array of nulls.
    with pytest.raises(ValueError, match="precipitation_probability is incomplete"):
        weather._from_api(
            {
                "current": {
                    "temperature_2m": 28.3, "relative_humidity_2m": 79,
                    "apparent_temperature": 32.9, "precipitation": 0.0,
                    "weather_code": 3, "cloud_cover": 90, "surface_pressure": 1007.0,
                    "wind_speed_10m": 11.9, "wind_direction_10m": 88,
                },
                "hourly": {
                    "time": ["2026-10-14T20:00"], "temperature_2m": [28.3],
                    "weather_code": [3], "wind_speed_10m": [11.9],
                    "relative_humidity_2m": [79],
                },
                "daily": {
                    "time": ["2026-10-14"], "weather_code": [3],
                    "temperature_2m_max": [30.0], "temperature_2m_min": [24.0],
                    "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
                    "sunrise": ["2026-10-14T06:00"], "sunset": ["2026-10-14T17:45"],
                },
            },
            16.5, 80.6, "Vijayawada", "Andhra Pradesh", "2026-10-14T20:00",
            "DWD ICON (via Open-Meteo)",
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
    assert "78 (heuristic estimate)" in markdown


def test_live_weather_summary_shows_live_aqi_without_estimate_suffix():
    from app.models import WeatherData
    from app.services.chat import _render_weather

    data = WeatherData(
        location="Vijayawada", state="Andhra Pradesh", status="LIVE",
        data_source="Open-Meteo", aqi=133, aqi_status="Moderate",
        aqi_source="Open-Meteo Air Quality (live measurement)",
        hourly=[], daily=[],
    )
    _, markdown = _render_weather("Vijayawada", "Andhra Pradesh", data, "en")
    assert "133" in markdown
    assert "heuristic" not in markdown


def _fake_cached_weather():
    from app.models import WeatherData
    return WeatherData(
        location="Pune", state="Maharashtra", status="LIVE",
        data_source="Open-Meteo", aqi=78, aqi_status="Satisfactory",
        aqi_source="State-level heuristic estimate (not a measurement)",
        hourly=[], daily=[],
    )


def test_live_aqi_is_merged_on_top_of_cached_weather(monkeypatch):
    fake = _fake_cached_weather()
    monkeypatch.setattr(weather, "cached", lambda ttl, key, loader: fake)
    monkeypatch.setattr(
        "app.services.air_quality.get_air_quality",
        lambda lat, lon: {"us_aqi": 133, "band": "Unhealthy for Sensitive Groups",
                          "observed_at": "2026-10-17T11:30"},
    )
    out = weather.get_weather(18.52, 73.85, "Pune", "Maharashtra")
    assert out.aqi == 133
    assert out.aqi_status == "Unhealthy for Sensitive Groups"
    assert "Open-Meteo Air Quality" in out.aqi_source


def test_aqi_failure_keeps_labelled_heuristic(monkeypatch):
    fake = _fake_cached_weather()
    monkeypatch.setattr(weather, "cached", lambda ttl, key, loader: fake)

    def boom(lat, lon):
        raise RuntimeError("aqi upstream down")

    monkeypatch.setattr("app.services.air_quality.get_air_quality", boom)
    out = weather.get_weather(18.52, 73.85, "Pune", "Maharashtra")
    assert out.aqi == 78
    assert "heuristic" in out.aqi_source



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


def test_unavailable_weather_fails_closed_without_synthetic_values():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        weather._fallback(16.5, 80.6, "Vijayawada", "Andhra Pradesh")

    assert exc.value.status_code == 503
    assert "No synthetic weather values" in exc.value.detail

