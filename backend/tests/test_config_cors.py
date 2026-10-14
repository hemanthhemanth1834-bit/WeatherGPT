"""CORS configuration regression tests for Vite dev and preview origins."""
from app.config import get_cors_origins


def test_default_cors_allows_vite_dev_and_preview(monkeypatch):
    monkeypatch.delenv("CORS_ALLOW_ORIGINS", raising=False)
    origins = get_cors_origins()
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5173" in origins
    assert "http://localhost:4173" in origins
    assert "http://127.0.0.1:4173" in origins
