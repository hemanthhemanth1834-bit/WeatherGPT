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
