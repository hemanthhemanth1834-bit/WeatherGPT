"""Hardening regression tests: retries, fallbacks, validation, rate limits,
hallucination prevention. Offline-safe except where marked."""
import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.services import chat, http, weather
from app.models import WeatherQueryRequest

client = TestClient(app, raise_server_exceptions=False)


def test_http_retries_then_succeeds(monkeypatch):
    calls = {"n": 0}

    class Resp:
        status_code = 200

    def flaky(*a, **k):
        calls["n"] += 1
        if calls["n"] == 1:
            raise ConnectionError("boom")
        return Resp()

    monkeypatch.setattr("requests.request", flaky)
    out = http.http_get("https://example.invalid/x", timeout=1, backoff=0)
    assert out.status_code == 200
    assert calls["n"] == 2


def test_http_gives_up_after_retries(monkeypatch):
    def always_fail(*a, **k):
        raise TimeoutError("down")

    monkeypatch.setattr("requests.request", always_fail)
    with pytest.raises(TimeoutError):
        http.http_get("https://example.invalid/x", timeout=1, retries=1, backoff=0)


def test_http_5xx_retried():
    class Resp:
        def __init__(self, code):
            self.status_code = code

    calls = {"n": 0}

    def seq(*a, **k):
        calls["n"] += 1
        return Resp(503 if calls["n"] == 1 else 200)

    import requests
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("requests.request", seq)
    try:
        out = http.http_get("https://example.invalid/x", timeout=1, backoff=0)
        assert out.status_code == 200
    finally:
        monkeypatch.undo()


def test_chat_never_500s_on_tool_failure(monkeypatch):
    def broken(*a, **k):
        raise RuntimeError("upstream exploded")

    monkeypatch.setattr(chat, "get_weather", broken)
    response = client.post("/api/chat/query",
                           json={"query": "weather in Pune", "language": "en"})
    assert response.status_code == 200
    body = response.json()
    assert "unavailable" in body["markdown_response"].lower()
    assert body["structured_weather"] is None


def test_query_length_validated():
    response = client.post("/api/chat/query",
                           json={"query": "x" * 501, "language": "en"})
    assert response.status_code == 422


def test_rate_limit_kicks_in(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "100000")
    import importlib
    import app.main as reloaded
    importlib.reload(reloaded)
    from fastapi.testclient import TestClient as TC
    limited = TC(reloaded.app, raise_server_exceptions=False)
    try:
        codes = {limited.get("/api/health").status_code for _ in range(3)}
        assert codes == {200}
    finally:
        importlib.reload(main_module)


def test_rate_limit_blocks_when_tiny(monkeypatch):
    import importlib
    import app.main as reloaded
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "2")
    importlib.reload(reloaded)
    from fastapi.testclient import TestClient as TC
    limited = TC(reloaded.app, raise_server_exceptions=False)
    try:
        assert limited.get("/api/health").status_code == 200
        assert limited.get("/api/health").status_code == 200
        blocked = limited.get("/api/health")
        assert blocked.status_code == 429
        assert blocked.headers.get("Access-Control-Allow-Origin") == "*"
    finally:
        monkeypatch.delenv("RATE_LIMIT_PER_MINUTE", raising=False)
        importlib.reload(main_module)


def test_no_hallucinated_numbers(monkeypatch):
    """Every temperature figure in the reply must come from the tool payload."""
    data = weather._fallback(16.5, 80.6, "Vijayawada", "Andhra Pradesh")
    monkeypatch.setattr(chat, "get_weather", lambda *a: data)
    response = chat.answer(WeatherQueryRequest(query="weather in Vijayawada",
                                               language="en"))
    assert "Vijayawada" in response.markdown_response
    assert str(data.current_temp) in response.markdown_response
    assert str(data.feels_like) in response.markdown_response
    import re
    temps = {float(t) for t in re.findall(r"(\d+(?:\.\d+)?)\s*°C", response.markdown_response)}
    known = {data.current_temp, data.feels_like}
    known |= {h.temp for h in data.hourly[:1]}
    if data.daily:
        known |= {data.daily[0].temp_max, data.daily[0].temp_min}
    assert temps <= known, f"unexplained figures: {temps - known}"


def test_no_unsupported_place_invention(monkeypatch):
    """Unknown places resolve through geocode/fallback, never invented coords."""
    from app.services import geo
    lat, lon, name, state = geo.geocode("Xyzzyplugh Nonexistent")
    assert isinstance(lat, float) and isinstance(lon, float)
    assert -90 <= lat <= 90 and -180 <= lon <= 180


def test_tiered_limits_chat_stricter_than_default(monkeypatch):
    import importlib
    import app.main as reloaded
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "100000")
    monkeypatch.setenv("RATE_LIMIT_CHAT_PER_MINUTE", "2")
    importlib.reload(reloaded)
    from fastapi.testclient import TestClient as TC
    limited = TC(reloaded.app, raise_server_exceptions=False)
    try:
        assert limited.get("/api/health").status_code == 200
        assert limited.get("/api/health").status_code == 200
        chat = limited.post("/api/chat/query", json={"query": "hi", "language": "en"})
        assert chat.status_code == 200
        assert limited.post("/api/chat/query", json={"query": "hi", "language": "en"}).status_code == 200
        blocked = limited.post("/api/chat/query", json={"query": "hi", "language": "en"})
        assert blocked.status_code == 429
        assert blocked.headers.get("Retry-After") == "30"
        # default tier untouched by chat usage
        assert limited.get("/api/health").status_code == 200
    finally:
        monkeypatch.delenv("RATE_LIMIT_PER_MINUTE", raising=False)
        monkeypatch.delenv("RATE_LIMIT_CHAT_PER_MINUTE", raising=False)
        importlib.reload(main_module)


def test_wrf_adapter_off_by_default(monkeypatch):
    from app.services import wrf_adapter
    for var in ("WRF_ENABLED", "WRF_GRIB_PATH", "WRF_NC_PATH"):
        monkeypatch.delenv(var, raising=False)
    status = wrf_adapter.wrf_status()
    assert status["status"] == "NOT CONFIGURED"
    assert "never labelled WRF" in status["note"] or "GFS" in status["note"]


def test_wrf_adapter_needs_real_file(monkeypatch, tmp_path):
    from app.services import wrf_adapter
    monkeypatch.setenv("WRF_ENABLED", "true")
    monkeypatch.setenv("WRF_GRIB_PATH", str(tmp_path / "missing.grib2"))
    assert wrf_adapter.wrf_status()["status"] == "NOT CONFIGURED"
    real = tmp_path / "wrfout_d01"
    real.write_bytes(b"fake-bytes-are-not-parsed")
    monkeypatch.setenv("WRF_GRIB_PATH", str(real))
    assert wrf_adapter.wrf_status()["status"] == "CONFIGURED (local file)"
