"""Ensemble spread service tests. No network calls."""

import pytest

import app.main as main_module
from app.main import app
from app.services import ensemble
from fastapi.testclient import TestClient

client = TestClient(app)


def _payload(combined: bool = True) -> dict:
    if combined:
        keys = {
            "temperature_2m_member01_ncep_gefs025": [20.0, 21.0, 22.0],
            "temperature_2m_member02_ncep_gefs025": [24.0, 25.0, 26.0],
            "temperature_2m_ncep_gefs025": [22.0, 23.0, 24.0],
            "precipitation_member01_ncep_gefs025": [0.0, 0.6, 0.0],
            "precipitation_member02_ncep_gefs025": [0.2, 0.8, 0.0],
            "precipitation_ncep_gefs025": [0.1, 0.7, 0.0],
            "temperature_2m_member01_ecmwf_ifs025_ensemble": [21.0, 22.0, 23.0],
            "temperature_2m_member02_ecmwf_ifs025_ensemble": [23.0, 24.0, 25.0],
            "precipitation_member01_ecmwf_ifs025_ensemble": [0.0, 0.5, 0.0],
            "precipitation_member02_ecmwf_ifs025_ensemble": [0.0, 0.9, 0.0],
        }
    else:
        keys = {
            "temperature_2m": [20.0, 21.0, 22.0],
            "temperature_2m_member01": [22.0, 23.0, 24.0],
            "precipitation": [0.0, 0.6, 0.0],
            "precipitation_member01": [0.2, 0.8, 0.0],
        }
    return {
        "timezone": "Asia/Kolkata",
        "generationtime_ms": 12.5,
        "hourly": {
            "time": ["2026-11-04T00:00", "2026-11-04T01:00", "2026-11-04T02:00"],
            **keys,
        },
    }


def _offline(monkeypatch, payload):
    monkeypatch.setattr(ensemble, "cached", lambda ttl, key, loader: loader())
    monkeypatch.setattr(ensemble, "_download", lambda lat, lon, days: payload)


def test_parses_combined_models_and_members(monkeypatch):
    _offline(monkeypatch, _payload(combined=True))
    result = ensemble.get_ensemble_forecast(16.51, 80.52, days=1)
    assert result["status"] == "LIVE"
    assert result["data_type"] == "ENSEMBLE_FORECAST"
    assert result["data_kind"] == "FORECAST"
    by_id = {model["id"]: model for model in result["models"]}
    assert by_id["ncep_gefs025"]["members"] == 3
    assert by_id["ecmwf_ifs025_ensemble"]["members"] == 2
    assert result["summary"]["member_count"] == 5
    assert result["summary"]["model_count"] == 2
    first = result["hours"][0]
    assert first["temperature_mean_c"] == 22.0
    assert first["temperature_spread_c"] == 4.0
    second = result["hours"][1]
    assert second["temperature_min_c"] == 21.0
    assert second["temperature_max_c"] == 25.0
    assert second["temperature_spread_c"] == 4.0
    assert second["temperature_std_c"] is not None
    assert second["precipitation_probability_pct"] == 100
    assert second["precipitation_mean_mm"] == 0.7
    assert second["precipitation_max_mm"] == 0.9
    assert "official" not in result["data_type"].lower()
    assert any("not an official" in line for line in result["limitations"])


def test_parses_single_model_without_suffix(monkeypatch):
    _offline(monkeypatch, _payload(combined=False))
    result = ensemble.get_ensemble_forecast(16.51, 80.52, days=1)
    assert result["status"] == "LIVE"
    assert result["models"] == [{"id": "primary", "label": "Primary", "members": 2}]
    assert result["summary"]["member_count"] == 2
    assert result["hours"][0]["temperature_spread_c"] == 2.0


def test_provider_failure_is_unavailable_and_never_substituted(monkeypatch):
    monkeypatch.setattr(ensemble, "cached", lambda ttl, key, loader: loader())
    monkeypatch.setattr(
        ensemble,
        "_download",
        lambda lat, lon, days: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    result = ensemble.get_ensemble_forecast(16.51, 80.52, days=1)
    assert result["status"] == "UNAVAILABLE"
    assert result["hours"] == []
    assert result["models"] == []
    assert result["error"] == "RuntimeError"
    assert result["source"] == ensemble.SOURCE
    assert result["limitations"]


def test_empty_payload_fails_closed(monkeypatch):
    _offline(monkeypatch, {"hourly": {"time": []}})
    result = ensemble.get_ensemble_forecast(16.51, 80.52, days=1)
    assert result["status"] == "UNAVAILABLE"


def test_endpoint_validates_bounds(monkeypatch):
    monkeypatch.setattr(
        main_module,
        "get_ensemble_forecast",
        lambda lat, lon, days: {"status": "LIVE", "lat": lat, "lon": lon, "days": days},
    )
    ok = client.get(
        "/api/ensemble/forecast", params={"lat": 16.51, "lon": 80.52, "days": 2}
    )
    assert ok.status_code == 200
    assert ok.json()["days"] == 2
    assert (
        client.get(
            "/api/ensemble/forecast", params={"lat": 999, "lon": 80.52}
        ).status_code
        == 422
    )
    assert (
        client.get(
            "/api/ensemble/forecast", params={"lat": 16.51, "lon": 80.52, "days": 9}
        ).status_code
        == 422
    )
    assert client.get("/api/ensemble/forecast").status_code == 422
