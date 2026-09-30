"""Security/config tests: CORS must never combine wildcard origins with credentials."""
import importlib

import app.config as config


def test_wildcard_origins_disable_credentials(monkeypatch):
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "*")
    importlib.reload(config)
    origins = config.get_cors_origins()
    assert origins == ["*"]
    assert config.allow_credentials_for_origins(origins) is False


def test_explicit_origins_allow_credentials(monkeypatch):
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "https://weathergpt.example,http://localhost:5173")
    importlib.reload(config)
    origins = config.get_cors_origins()
    assert origins == ["https://weathergpt.example", "http://localhost:5173"]
    assert config.allow_credentials_for_origins(origins) is True
