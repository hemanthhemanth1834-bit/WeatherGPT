"""Tests for GPS reverse-geocode, live aviation, monthly climate, LLM adapters."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import geo
from app.services import llm

client = TestClient(app)


def test_reverse_live():
    import requests
    try:
        requests.get("https://api.bigdatacloud.net/data/reverse-geocode-client"
                     "?latitude=18.5&longitude=73.8&localityLanguage=en", timeout=8)
    except Exception:
        pytest.skip("no network for reverse-geocode test")
    out = geo.reverse(18.5204, 73.8567)
    assert out["status"] in ("LIVE", "FALLBACK")
    if out["status"] == "LIVE":
        assert "Pune" in out["city"] or "Pune" in str(out)


def test_reverse_endpoint():
    body = client.get("/api/locations/reverse", params={"lat": 16.5, "lon": 80.6}).json()
    assert body["status"] in ("LIVE", "FALLBACK")
    assert body["lat"] == 16.5


def test_live_aviation_endpoint():
    import requests
    try:
        requests.get("https://aviationweather.gov/api/data/metar?ids=VIDP&format=json",
                     timeout=10)
    except Exception:
        pytest.skip("no network for ADDS test")
    body = client.get("/api/aviation/briefing", params={"airport": "VIDP"}).json()
    assert body["station_icao"] == "VIDP"
    prov = body["metar_decoded"].get("provenance", "")
    assert prov in ("LIVE (NOAA ADDS)", "STATIC sample")
    if prov.startswith("LIVE"):
        assert body["flight_category"] in ("VFR", "MVFR", "IFR", "LIFR", "UNKNOWN")
        assert "VIDP" in body["metar_raw"]


def test_aviation_category_rules():
    from app.services.aviation_live import flight_category
    assert flight_category({"visib": "0.5", "clouds": []}) == "LIFR"
    assert flight_category({"visib": "2", "clouds": []}) == "IFR"
    assert flight_category({"visib": "4", "clouds": []}) == "MVFR"
    assert flight_category({"visib": "10", "clouds": [{"cover": "FEW", "base": 30}]}) == "VFR"
    assert flight_category({"visib": "10", "clouds": [{"cover": "OVC", "base": 8}]}) == "IFR"


def test_monthly_history_live():
    import requests
    try:
        requests.get("https://archive-api.open-meteo.com/v1/archive?latitude=20&longitude=78"
                     "&start_date=2020-01-01&end_date=2020-01-02&daily=temperature_2m_max",
                     timeout=10)
    except Exception:
        pytest.skip("no network for archive test")
    body = client.get("/api/climate/monthly",
                      params={"location": "Pune", "year": 2024}).json()
    assert body["status"] == "LIVE"
    assert body["year"] == 2024
    assert len(body["months"]) >= 10
    assert "mean_max_c" in body["months"][0]


def test_llm_fallback_without_keys(monkeypatch):
    for var in ("OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY",
                "OPENROUTER_API_KEY", "OLLAMA_HOST", "AI_PROVIDER"):
        monkeypatch.delenv(var, raising=False)
    assert llm.configured_providers() == []
    out = llm.explain("test topic", "25C, clear, live context")
    assert out["engine"] == "RULE-BASED (deterministic)"
    assert "25C" in out["explanation"]


def test_llm_uses_mocked_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")
    import app.services.llm as llm_module

    class FakeResp:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "Mocked clear explanation."}}]}

    monkeypatch.setattr("requests.request", lambda *a, **k: FakeResp())
    out = llm_module.explain("heat", "42C heatwave context")
    assert out["engine"] == "LLM (openai-compatible)"
    assert "Mocked" in out["explanation"]


def test_explain_endpoint_without_keys():
    body = client.post("/api/assistant/explain",
                       json={"topic": "rain", "location": "Pune"}).json()
    assert body["grounded"] is True
    assert body["engine"] in ("RULE-BASED (deterministic)",) or body["engine"].startswith("LLM")
