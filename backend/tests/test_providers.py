"""Tests for live free providers + engines. Live calls skip gracefully offline."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import air_quality as aq
from app.services import geo, weather
from app.services import travel as tv

client = TestClient(app)


def needs_network():
    import requests
    try:
        requests.get("https://api.open-meteo.com/v1/forecast?latitude=20&longitude=78"
                     "&current=temperature_2m", timeout=8)
    except Exception:
        pytest.skip("no network for live provider test")


def test_aqi_bands_and_dominant():
    assert aq.aqi_band(30) == "Good"
    assert aq.aqi_band(120) == "Unhealthy for Sensitive Groups"
    assert aq.aqi_band(600) == "Beyond Index"
    assert aq.dominant_pollutant({"us_aqi_pm2_5": 80, "us_aqi_pm10": 40}) == "pm2_5"
    assert aq.dominant_pollutant({}) == "—"


def test_uv_guidance_tiers():
    assert aq.uv_guidance(1.5)["level"] == "Low"
    assert aq.uv_guidance(6.5)["level"] == "High"
    assert aq.uv_guidance(12)["level"] == "Extreme"


def test_live_aqi_endpoint():
    needs_network()
    body = client.get("/api/air-quality", params={"location": "Vijayawada"}).json()
    assert body["standard"] == "US AQI (EPA)"
    assert body["status"] in ("LIVE", "FALLBACK")
    if body["status"] == "LIVE":
        assert isinstance(body["us_aqi"], int) and body["us_aqi"] >= 0
        assert body["pm2_5"] is not None


def test_live_marine_endpoint():
    needs_network()
    body = client.get("/api/marine/advisory", params={"location": "Chennai"}).json()
    assert body["wave_height_m"] > 0
    assert "provenance" in body
    if body["provenance"].startswith("LIVE"):
        assert body["wave_period_s"] is not None
        assert body["sea_surface_temp_c"] is not None


def test_travel_safety_contract():
    needs_network()
    body = client.get("/api/travel/safety", params={"location": "Pune"}).json()
    assert body["safety"] in ("LOW", "MODERATE", "HIGH")
    assert body["drivers"] and body["advice"]
    assert body["data_type"] == "ESTIMATED"


def test_travel_scoring_pure():
    data = weather._fallback(28.6, 77.2, "Delhi", "Delhi")
    out = tv.travel_safety(data)
    assert out["safety"] in ("LOW", "MODERATE", "HIGH")
    stormy = weather._fallback(19.0, 72.8, "Mumbai", "Maharashtra")
    stormy.precipitation = 30.0
    stormy.visibility = 1.0
    out2 = tv.travel_safety(stormy)
    assert out2["score"] < out["score"]


def test_provider_health_shape():
    body = client.get("/api/providers/health", params={"live": False}).json()
    names = {p["provider"] for p in body["providers"]}
    assert "Open-Meteo Air Quality" in names
    assert "WRF feed" in names
    assert all(p["status"] == "NOT_CONFIGURED" for p in body["providers"])
    assert "evaluated_not_used" in body


def test_provider_health_live():
    needs_network()
    body = client.get("/api/providers/health", params={"live": True}).json()
    by_name = {p["provider"]: p for p in body["providers"]}
    assert by_name["Open-Meteo Forecast"]["status"] == "LIVE"
    assert by_name["Open-Meteo Air Quality"]["status"] == "LIVE"
    assert by_name["WRF feed"]["status"] == "NOT_CONFIGURED"


def test_engine_status():
    body = client.get("/api/agent/engine").json()
    assert "RULE-BASED" in body["engine"]
    assert body["fallback"].startswith("deterministic")


def test_climate_history_live():
    needs_network()
    body = client.get("/api/climate/history", params={"location": "Pune", "years": 2}).json()
    assert body["status"] == "LIVE"
    assert "OBSERVED" in body["data_type"]
    assert len(body["years"]) >= 1
    assert "mean_max_c" in body["years"][0]


def test_uv_endpoint():
    needs_network()
    body = client.get("/api/uv", params={"location": "Pune"}).json()
    assert body["level"] in ("Low", "Moderate", "High", "Very High", "Extreme")
    assert body["advice"]


def test_gdacs_normalize_pure():
    from app.services import gdacs
    feature = {"geometry": {"coordinates": [80.0, 15.0]},
               "properties": {"eventtype": "TC", "name": "Cyclone over Bay of Bengal",
                              "country": "India", "iso3": "IND", "alertlevel": "Orange",
                              "fromdate": "2026-09-01", "todate": "", "iscurrent": True,
                              "url": {"report": "https://www.gdacs.org/x"}}}
    out = gdacs.normalize(feature)
    assert out["event_label"] == "Tropical Cyclone"
    assert out["near_india"] is True
    assert out["status"] == "OFFICIAL third-party feed"


def test_gdacs_endpoint_live():
    needs_network()
    body = client.get("/api/disasters/global", params={"region": "world"}).json()
    assert body["status"] == "LIVE"
    assert body["count"] >= 0
    assert body["source"].startswith("GDACS")


def test_gfs_model_label():
    needs_network()
    blend = client.get("/api/weather/current", params={"location": "Pune"}).json()
    gfs = client.get("/api/weather/current",
                     params={"location": "Pune", "model": "gfs"}).json()
    assert "blend" in blend["nwp_model"].lower() or "Open-Meteo" in blend["nwp_model"]
    assert gfs["nwp_model"].startswith("GFS")
    assert isinstance(gfs["current_temp"], (int, float))
