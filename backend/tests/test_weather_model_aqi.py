import pytest

from app.services import air_quality, weather


@pytest.mark.parametrize(
    ("requested", "expected"),
    [
        ("auto", "auto"),
        ("gfs", "gfs"),
        ("ecmwf", "ecmwf"),
        ("icon", "icon"),
        ("ECMWF", "ecmwf"),
        ("unsupported", "auto"),
    ],
)
def test_get_weather_preserves_supported_model(monkeypatch, requested, expected):
    captured = {}

    monkeypatch.setattr(weather, "cached", lambda _ttl, _key, fn: fn())

    def fake_download(_lat, _lon, _place, _state, model):
        captured["model"] = model
        return object()

    monkeypatch.setattr(weather, "_download", fake_download)
    weather.get_weather(18.52, 73.85, "Pune", "Maharashtra", model=requested)

    assert captured["model"] == expected


def _minimal_weather_payload():
    return {
        "current": {
            "temperature_2m": 28,
            "apparent_temperature": 29,
            "relative_humidity_2m": 60,
            "weather_code": 2,
            "precipitation": 0,
            "cloud_cover": 20,
            "surface_pressure": 1012,
            "wind_speed_10m": 10,
            "wind_direction_10m": 270,
        },
        "hourly": {"time": [], "weather_code": []},
        "daily": {
            "time": [],
            "sunrise": ["2026-10-11T06:00"],
            "sunset": ["2026-10-11T18:00"],
            "uv_index_max": [5],
        },
    }


def test_weather_uses_live_aqi_and_exposes_provenance(monkeypatch):
    monkeypatch.setattr(
        air_quality,
        "get_air_quality",
        lambda _lat, _lon: {
            "us_aqi": 42,
            "band": "Good",
            "data_source": "Open-Meteo Air Quality",
            "data_type": "Observation",
            "observed_at": "2026-10-11T12:00",
        },
    )

    result = weather._from_api(
        _minimal_weather_payload(), 18.52, 73.85, "Pune", "Maharashtra",
        "2026-10-11T12:00",
    )

    assert result.aqi == 42
    assert result.aqi_status == "Good"
    assert result.aqi_source == "Open-Meteo Air Quality"
    assert result.aqi_data_type == "Observation"
    assert result.aqi_observed_at == "2026-10-11T12:00"


def test_weather_labels_aqi_estimate_when_provider_fails(monkeypatch):
    monkeypatch.setattr(
        air_quality,
        "get_air_quality",
        lambda _lat, _lon: (_ for _ in ()).throw(RuntimeError("upstream unavailable")),
    )

    result = weather._from_api(
        _minimal_weather_payload(), 18.52, 73.85, "Pune", "Maharashtra",
        "2026-10-11T12:00",
    )

    assert result.aqi_data_type == "ESTIMATED"
    assert "provider unavailable" in result.aqi_source.lower()
    assert result.aqi_observed_at == ""
