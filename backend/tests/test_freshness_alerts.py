"""P0 regression tests: data-age honesty and alert geographic relevance."""

import datetime

from app.models import CAPAlert, WeatherData
from app.services import alerts, weather

HEAVY_SAMPLE = {
    "available": True,
    "current_time": "2026-10-18T10:00",
    "temp": 28.0,
    "temp_max": 32.0,
    "temp_min": 22.0,
    "precip": 24.0,
    "rain_sum": 80.0,
    "rain_prob": 95,
    "wind": 12.0,
    "wind_max": 18.0,
    "code": 61,
    "humidity": 90,
}


def test_freshness_thresholds_never_guess():
    assert weather.freshness_from_age(None) == "UNKNOWN"
    assert weather.freshness_from_age(0) == "LIVE"
    assert weather.freshness_from_age(90) == "LIVE"
    assert weather.freshness_from_age(91) == "DELAYED"
    assert weather.freshness_from_age(360) == "DELAYED"
    assert weather.freshness_from_age(361) == "STALE"


def test_cached_weather_age_is_recomputed_and_not_live(monkeypatch):
    now = datetime.datetime.now(weather.IST)
    old_conditions = now - datetime.timedelta(hours=7)
    old_fetch = now - datetime.timedelta(hours=6, minutes=30)
    data = WeatherData(
        conditions_at_iso=old_conditions.isoformat(timespec="minutes"),
        fetched_at_iso=old_fetch.isoformat(timespec="minutes"),
        freshness="LIVE",
    )

    refreshed = weather._refresh_freshness(data)

    assert refreshed.data_age_minutes is not None
    assert refreshed.data_age_minutes >= 419
    assert refreshed.fetch_age_minutes is not None
    assert refreshed.fetch_age_minutes >= 389
    assert refreshed.freshness == "STALE"


def test_missing_conditions_timestamp_is_unknown_not_live():
    data = WeatherData(freshness="LIVE", conditions_at_iso="", fetched_at_iso="")

    refreshed = weather._refresh_freshness(data)

    assert refreshed.data_age_minutes is None
    assert refreshed.fetch_age_minutes is None
    assert refreshed.freshness == "UNKNOWN"


def test_haversine_distance_is_geographically_sane():
    mumbai_to_delhi = alerts.haversine_km(19.0760, 72.8777, 28.6139, 77.2090)
    assert 1100 < mumbai_to_delhi < 1200


def test_alerts_are_filtered_and_scoped_by_distance(monkeypatch):
    monkeypatch.setattr(alerts, "_sample", lambda *_: HEAVY_SAMPLE)

    results = alerts.active_alerts(lat=19.08, lon=72.88, radius_km=50)

    assert len(results) == 1
    alert = results[0]
    assert alert.district == "Mumbai"
    assert alert.distance_km is not None
    assert alert.distance_km < 5
    assert alert.scope == "LOCAL"


def test_far_location_does_not_receive_distant_station_alert(monkeypatch):
    def fail_if_called(*_args):
        raise AssertionError("No station should be sampled outside the radius")

    monkeypatch.setattr(alerts, "_sample", fail_if_called)

    assert alerts.active_alerts(lat=0.0, lon=0.0, radius_km=50) == []


def test_legacy_district_filter_still_works(monkeypatch):
    monkeypatch.setattr(alerts, "_sample", lambda *_: HEAVY_SAMPLE)

    results = alerts.active_alerts(district="Mumbai")

    assert len(results) == 1
    assert results[0].scope == "LOCAL"
    assert results[0].distance_km is None


def test_alert_model_carries_distance_and_scope():
    alert = CAPAlert(distance_km=42.5, scope="LOCAL")
    assert alert.distance_km == 42.5
    assert alert.scope == "LOCAL"
