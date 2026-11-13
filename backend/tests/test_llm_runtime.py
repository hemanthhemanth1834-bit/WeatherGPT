"""LLM runtime: health codes, latency/tokens and numeric grounding."""

import requests
from fastapi.testclient import TestClient

import app.main as main_module
import app.services.llm as llm
from app.main import app
from .weather_fixtures import make_test_weather

client = TestClient(app)

PROVIDER_ENV = (
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "OPENROUTER_API_KEY",
    "OLLAMA_HOST",
    "AI_PROVIDER",
    "OPENAI_MODEL",
)


def clear_providers(monkeypatch):
    for name in PROVIDER_ENV:
        monkeypatch.delenv(name, raising=False)


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            error = requests.HTTPError(f"HTTP {self.status_code}")
            error.response = self
            raise error

    def json(self):
        return self._payload


def test_health_check_without_configuration(monkeypatch):
    clear_providers(monkeypatch)
    status = llm.health_check()
    assert status["status"] == "NOT_CONFIGURED"
    assert status["provider"] is None
    assert status["latency_ms"] is None


def test_health_check_unconfigured_provider(monkeypatch):
    clear_providers(monkeypatch)
    status = llm.health_check("openai-compatible")
    assert status["status"] == "NOT_CONFIGURED"
    assert status["configured"] is False


def test_health_check_reports_latency_and_auth(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")
    monkeypatch.setattr(
        "requests.request",
        lambda *args, **kwargs: FakeResponse(status_code=401, payload={}),
    )
    status = llm.health_check()
    assert status["status"] == "AUTH"
    assert status["http_status"] == 401
    assert isinstance(status["latency_ms"], int)


def test_exception_classification():
    assert llm._classify_exception(requests.Timeout("slow")).code == "TIMEOUT"
    auth = requests.HTTPError("denied")
    auth.response = FakeResponse(status_code=403)
    assert llm._classify_exception(auth).code == "AUTH"
    assert (
        llm._classify_exception(RuntimeError("HTTP 429 for provider")).code
        == "RATE_LIMIT"
    )
    assert llm._classify_exception(KeyError("choices")).code == "BAD_RESPONSE"


def test_grounded_explanation_without_provider(monkeypatch):
    clear_providers(monkeypatch)
    result = llm.explain_grounded("rain", {"rain_prob": 80, "temp_c": 24.5})
    assert result["status"] == "NOT_CONFIGURED"
    assert result["engine"] == "RULE-BASED (deterministic)"
    assert result["grounded"] is True
    assert "80" in result["explanation"]


def test_grounded_explanation_accepts_only_known_numbers(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")
    payload = {
        "choices": [
            {"message": {"content": "Rain probability is 80 percent at 24.5 degrees."}}
        ],
        "usage": {"total_tokens": 42},
    }
    monkeypatch.setattr(
        "requests.request", lambda *args, **kwargs: FakeResponse(payload=payload)
    )
    result = llm.explain_grounded("rain", {"rain_prob": 80, "temp_c": 24.5})
    assert result["status"] == "OK"
    assert result["engine"] == "LLM (openai-compatible)"
    assert result["grounded"] is True
    assert result["tokens"] == 42
    assert isinstance(result["latency_ms"], int)


def test_grounded_explanation_rejects_invented_numbers(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")
    payload = {
        "choices": [
            {
                "message": {
                    "content": "Temperature will reach 31.2C with 99 percent rain."
                }
            }
        ],
        "usage": {"total_tokens": 20},
    }
    monkeypatch.setattr(
        "requests.request", lambda *args, **kwargs: FakeResponse(payload=payload)
    )
    result = llm.explain_grounded("rain", {"rain_prob": 80, "temp_c": 24.5})
    assert result["status"] == "GROUNDING_FAILED"
    assert result["grounded"] is False
    assert result["engine"] == "RULE-BASED (deterministic)"
    assert "31.2" in result["rejected_numbers"]
    assert "99" in result["rejected_numbers"]


def test_grounded_explanation_timeout_falls_back(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")

    def timeout(*args, **kwargs):
        raise requests.Timeout("simulated timeout")

    monkeypatch.setattr("requests.request", timeout)
    result = llm.explain_grounded("rain", {"rain_prob": 80})
    assert result["status"] == "TIMEOUT"
    assert result["engine"] == "RULE-BASED (deterministic)"
    assert result["grounded"] is True
    assert "80" in result["explanation"]


def test_provider_status_live_uses_classified_health(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_PROVIDER", "openai-compatible")
    monkeypatch.setattr(
        "requests.request",
        lambda *args, **kwargs: FakeResponse(status_code=401, payload={}),
    )
    status = llm.provider_status(check_live=True)
    assert status["health"] == "AUTH"
    assert status["health_detail"]["http_status"] == 401
    assert status["active_inference"] == "DETERMINISTIC"


def test_explain_endpoint_returns_status_and_latency(monkeypatch):
    clear_providers(monkeypatch)
    monkeypatch.setattr(
        main_module,
        "get_weather",
        lambda lat, lon, place, state: make_test_weather(lat, lon, place, state),
    )
    body = client.post(
        "/api/assistant/explain",
        json={"topic": "rain", "location": "Pune"},
    ).json()
    assert body["status"] == "NOT_CONFIGURED"
    assert body["grounded"] is True
    assert "provider" in body
    assert "latency_ms" in body
    assert "tokens" in body
