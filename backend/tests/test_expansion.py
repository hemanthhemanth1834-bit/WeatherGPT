"""Tests for places, flood proxy, solar estimate (offline-safe + live)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import flood, places, solar

client = TestClient(app, raise_server_exceptions=False)


def needs_network():
    import requests
    try:
        requests.get("https://api.open-meteo.com/v1/forecast?latitude=20&longitude=78"
                     "&current=temperature_2m", timeout=8)
    except Exception:
        pytest.skip("no network for live provider test")


def test_haversine_pure():
    assert places._haversine_km(16.5, 80.6, 16.5, 80.6) == 0.0
    dist = places._haversine_km(16.5, 80.6, 17.38, 78.48)
    assert 200 < dist < 300


def test_places_live():
    needs_network()
    response = client.get("/api/places/emergency", params={"lat": 16.5, "lon": 80.6})
    if response.status_code == 502:
        assert "unavailable" in response.json()["detail"]
        return
    body = response.json()
    assert body["status"] == "LIVE"
    assert "OpenStreetMap" in body["source"]
    assert body["count"] >= 0
    assert set(body["facilities"]) == {"hospital", "police", "fire_station", "assembly_point"}


def test_places_rejects_bad_coords():
    assert client.get("/api/places/emergency", params={"lat": 999, "lon": 0}).status_code == 422


def test_flood_proxy_pure_levels():
    from app.models import WeatherData
    calm = WeatherData(location="X", state="Y", hourly=[], daily=[],
                       precipitation=0.0, current_temp=30.0)
    import unittest.mock as mock
    with mock.patch("app.services.weather.get_weather", return_value=calm):
        with mock.patch("app.services.flood.elevation_m", return_value=500.0):
            out = flood.flood_risk(10.0, 76.0, "X", "Y")
    assert out["status"] == "COMPUTED"
    assert out["risk"] == "LOW"
    assert "unofficial" in out["limits"].lower() or "official" in out["limits"].lower()


def test_flood_live():
    needs_network()
    body = client.get("/api/flood/risk", params={"location": "Mumbai"}).json()
    assert body["status"] == "COMPUTED"
    assert body["risk"] in ("LOW", "MODERATE", "HIGH")
    assert isinstance(body["timeline_24h"], list)


def test_solar_formula_pure():
    clear = solar.solar_estimate(9.0, 5.0, "06:00", "18:30", 1.0)
    cloudy = solar.solar_estimate(9.0, 90.0, "06:00", "18:30", 1.0)
    night = solar.solar_estimate(0.0, 0.0, "06:00", "18:30", 1.0)
    assert clear["status"] == "ESTIMATED"
    assert clear["daily_kwh"] > cloudy["daily_kwh"] >= 0
    assert night["daily_kwh"] == 0.0
    assert "formula" in clear


def test_solar_endpoint():
    body = client.get("/api/solar/estimate", params={"location": "Pune"}).json()
    assert body["status"] == "ESTIMATED"
    assert body["daily_kwh"] >= 0


def test_flood_shelter_solar_chat_intents():
    from app.models import WeatherQueryRequest
    from app.services import chat, weather
    fake = weather._fallback(28.0, 77.0, "Delhi", "Delhi")
    import unittest.mock as mock
    with mock.patch.object(chat, "get_weather", return_value=fake):
        flood_resp = chat.answer(WeatherQueryRequest(query="Is there flood risk here?",
                                                     language="en"))
        assert "Flood proxy" in flood_resp.markdown_response
        solar_resp = chat.answer(WeatherQueryRequest(query="Rooftop solar potential?",
                                                     language="en"))
        assert "ESTIMATED" in solar_resp.markdown_response
