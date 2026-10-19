"""Regression tests for fail-closed handling of unresolved weather locations."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_unknown_explicit_location_does_not_silently_return_default_city(monkeypatch):
    import app.main as main_module

    monkeypatch.setattr(
        main_module.geo,
        "resolve",
        lambda _place: (18.5204, 73.8567, "Pune", "Maharashtra", False),
    )

    def should_not_fetch_weather(*_args, **_kwargs):
        raise AssertionError("weather fetch must not run for an unresolved place")

    monkeypatch.setattr(main_module, "get_weather", should_not_fetch_weather)
    response = client.get("/api/weather/current?location=DefinitelyNotARealPlace123")

    assert response.status_code == 422
    assert "could not be resolved" in response.json()["detail"]
    assert "no default-city weather was substituted" in response.json()["detail"]


def test_location_resolution_failure_is_not_reported_as_weather_provider_failure(monkeypatch):
    import app.main as main_module

    monkeypatch.setattr(
        main_module.geo,
        "resolve",
        lambda _place: (18.5204, 73.8567, "Pune", "Maharashtra", False),
    )
    response = client.get("/api/weather/current?location=UnknownTownForWeatherGPT")
    assert response.status_code == 422
    assert response.status_code != 503
