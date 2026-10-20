"""Tests for live free providers + engines. Live calls skip gracefully offline."""
from .weather_fixtures import make_test_weather
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
    response = client.get("/api/air-quality", params={"location": "Vijayawada"})
    assert response.status_code == 200
    body = response.json()
    assert body["standard"] == "US AQI (EPA)"
    assert body["status"] in ("LIVE", "FALLBACK", "UNAVAILABLE")
    if body["status"] == "LIVE":
        assert isinstance(body["us_aqi"], int) and body["us_aqi"] >= 0
        assert body["pm2_5"] is not None
    elif body["status"] == "UNAVAILABLE":
        # Provider outages must remain explicit; never substitute a made-up AQI.
        assert body["us_aqi"] is None
        assert body["pm2_5"] is None
        assert body["data_type"] == "Unavailable"


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
    data = make_test_weather(28.6, 77.2, "Delhi", "Delhi")
    out = tv.travel_safety(data)
    assert out["safety"] in ("LOW", "MODERATE", "HIGH")
    stormy = make_test_weather(19.0, 72.8, "Mumbai", "Maharashtra")
    stormy.precipitation = 30.0
    stormy.visibility = 1.0
    out2 = tv.travel_safety(stormy)
    assert out2["score"] < out["score"]


def test_provider_health_shape():
    body = client.get("/api/providers/health", params={"live": False}).json()
    by_name = {p["provider"]: p["status"] for p in body["providers"]}
    assert "Open-Meteo Air Quality" in by_name
    assert "WRF feed" in by_name
    assert by_name["WRF feed"] == "NOT_CONFIGURED"
    assert by_name["IMD Portal"] == "PORTAL_ONLY"
    assert by_name["MOSDAC / ISRO"] == "REQUIRES_CREDENTIALS"
    assert by_name["INCOIS"] == "PORTAL_ONLY"
    assert "evaluated_not_used" in body


def test_provider_health_live():
    needs_network()

    # The endpoint reports actual upstream status; CI must not require every
    # third-party service to be healthy at the exact moment this test runs.
    # One snapshot also avoids re-probing every provider repeatedly (the
    # probes are sequential and can make this test take several minutes).
    response = client.get("/api/providers/health", params={"live": True})
    assert response.status_code == 200
    body = response.json()
    by_name = {p["provider"]: p for p in body["providers"]}

    forecast = by_name["Open-Meteo Forecast"]
    air_quality = by_name["Open-Meteo Air Quality"]
    assert by_name["WRF feed"]["status"] == "NOT_CONFIGURED"

    # Validate the health contract even when an upstream is temporarily down.
    for provider in (forecast, air_quality):
        assert provider["status"] in ("LIVE", "ERROR")
        if provider["status"] == "ERROR":
            assert provider.get("error"), (
                f"{provider['provider']} reported ERROR without a reason"
            )

    unavailable = [
        f"{provider['provider']}: {provider.get('error', 'probe failed')}"
        for provider in (forecast, air_quality)
        if provider["status"] != "LIVE"
    ]
    if unavailable:
        pytest.skip("Live provider unavailable during CI; health endpoint correctly "
                    "reported the failure: " + "; ".join(unavailable))


def test_india_alert_layer_shape():
    body = client.get("/api/alerts/india").json()
    assert body["status"] == "LIVE"
    assert isinstance(body["items"], list)
    for item in body["items"]:
        for field in ("source", "source_type", "official", "event", "severity",
                      "headline", "area", "geometry", "confidence"):
            assert field in item, f"missing {field}"
        assert isinstance(item["official"], bool)


def test_india_layer_never_invents_official():
    body = client.get("/api/alerts/india", params={"state": "Maharashtra"}).json()
    official = [i for i in body["items"] if i["official"]]
    assert all("IMD" not in i["source"] and "NDMA" not in i["source"] for i in official)


def test_engine_status():
    body = client.get("/api/agent/engine").json()
    assert "RULE-BASED" in body["engine"]
    assert body["fallback"].startswith("deterministic")


def test_climate_history_live():
    needs_network()
    response = client.get("/api/climate/history", params={"location": "Pune", "years": 2})
    if response.status_code in (429, 502):
        # CI can hit transient provider throttling or upstream archive outages.
        # The API must expose an honest non-200 state rather than fabricate data.
        detail = response.json().get("detail", "")
        assert response.status_code == 429 or "Archive unavailable" in detail
        return

    assert response.status_code == 200
    body = response.json()
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
    blend_response = client.get("/api/weather/current", params={"location": "Pune"})
    if blend_response.status_code == 503:
        assert "unavailable" in blend_response.json()["detail"].lower()
        return
    assert blend_response.status_code == 200
    blend = blend_response.json()
    gfs_response = client.get("/api/weather/current",
                              params={"location": "Pune", "model": "gfs"})
    if gfs_response.status_code == 503:
        assert "unavailable" in gfs_response.json()["detail"].lower()
        return
    assert gfs_response.status_code == 200
    gfs = gfs_response.json()

    # A provider outage is explicitly unavailable; successful values keep their model provenance.
    assert blend["nwp_model"]
    assert "blend" in blend["nwp_model"].lower() or "Open-Meteo" in blend["nwp_model"]
    assert "GFS" in gfs["nwp_model"]
    assert isinstance(gfs["current_temp"], (int, float))


def test_earthquakes_live():
    needs_network()
    body = client.get("/api/disasters/earthquakes",
                      params={"min_magnitude": 4.5, "days": 7}).json()
    assert body["status"] == "LIVE"
    assert body["count"] >= 0
    assert "USGS" in body["source"]
    if body["events"]:
        assert body["events"][0]["magnitude"] >= 4.5


def test_wildfires_live():
    needs_network()
    body = client.get("/api/disasters/wildfires", params={"limit": 10}).json()
    assert body["status"] == "LIVE"
    assert "EONET" in body["source"]


def test_quake_feature_normalize_pure():
    from app.services.disasters import _quake_feature
    out = _quake_feature({"properties": {"mag": 6.1, "place": "Nicobar Islands",
                                         "time": 1790000000000, "felt": 12, "tsunami": 1,
                                         "url": "https://example.invalid/x"},
                          "geometry": {"coordinates": [93.0, 7.0, 10.0]}})
    assert out["magnitude"] == 6.1
    assert out["depth_km"] == 10.0
    assert out["tsunami"] is True
    assert out["status"] == "OFFICIAL third-party feed"
