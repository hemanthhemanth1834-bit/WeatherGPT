"""Tests for newer engine behavior: cloud cover, cold wave, intents."""
from app.models import WeatherQueryRequest
from app.services import alerts, chat
from app.services import weather as wx


def test_cloud_cover_field_defaults_and_parses():
    assert wx._fallback(10.0, 76.0, "X", "Y").cloud_cover >= 0
    sample = {
        "current": {"temperature_2m": 30.0, "relative_humidity_2m": 50,
                    "apparent_temperature": 32.0, "precipitation": 0.0,
                    "weather_code": 1, "cloud_cover": 42.0,
                    "surface_pressure": 1012.0, "wind_speed_10m": 10.0,
                    "wind_direction_10m": 90},
        "hourly": {"time": ["2026-09-30T00:00"], "temperature_2m": [30.0],
                   "precipitation_probability": [5], "weather_code": [1],
                   "wind_speed_10m": [10.0]},
        "daily": {"time": ["2026-09-30"], "weather_code": [1],
                  "temperature_2m_max": [33.0], "temperature_2m_min": [24.0],
                  "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
                  "sunrise": ["2026-09-30T06:05"], "sunset": ["2026-09-30T18:35"],
                  "uv_index_max": [7.0]},
    }
    parsed = wx._from_api(sample, 10.0, 76.0, "X", "Y", "2026-09-30T00:00")
    assert parsed.cloud_cover == 42.0


def test_cold_wave_alert(monkeypatch):
    def freezing(_lat, _lon):
        return {"temp": 4.0, "temp_max": 9.0, "temp_min": 3.0, "precip": 0.0,
                "rain_sum": 0.0, "rain_prob": 5, "wind": 8.0, "wind_max": 12.0,
                "code": 1, "humidity": 70}
    monkeypatch.setattr(alerts, "_sample", freezing)
    found = alerts.active_alerts(state=None, district="Ludhiana")
    assert any(a.event == "Cold Wave" for a in found)


def _offline_weather(monkeypatch):
    monkeypatch.setattr(chat, "get_weather", lambda *a: wx._fallback(16.5, 80.6, "Vijayawada", "Andhra Pradesh"))
    monkeypatch.setattr(chat, "active_alerts", lambda **k: [])


def test_climate_intent_appends_reference(monkeypatch):
    _offline_weather(monkeypatch)
    response = chat.answer(WeatherQueryRequest(query="Explain the monsoon trend and climate history"))
    assert "Climate reference" in response.markdown_response


def test_travel_intent_includes_risk(monkeypatch):
    _offline_weather(monkeypatch)
    response = chat.answer(WeatherQueryRequest(query="Is it safe to travel tomorrow?"))
    assert "Travel read" in response.markdown_response
    assert "ESTIMATED" in response.markdown_response


def test_disaster_persona_pulls_alerts(monkeypatch):
    _offline_weather(monkeypatch)
    seen = {}
    def fake_alerts(**kwargs):
        seen.update(kwargs)
        return []
    monkeypatch.setattr(chat, "active_alerts", fake_alerts)
    chat.answer(WeatherQueryRequest(query="Brief me", persona="disaster_manager"))
    assert seen, "disaster_manager persona should trigger an alert lookup"
