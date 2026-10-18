"""Regression tests for honest, computed weather-alert behaviour."""
from app.services import alerts


def _sample(**overrides):
    sample = {
        "available": True,
        "current_time": "2026-10-18T10:00",
        "temp": 28.0,
        "temp_max": 32.0,
        "temp_min": 22.0,
        "precip": 0.0,
        "rain_sum": 0.0,
        "rain_prob": 10,
        "wind": 12.0,
        "wind_max": 18.0,
        "code": 1,
        "humidity": 60,
    }
    sample.update(overrides)
    return sample


def test_incomplete_provider_payload_is_unavailable(monkeypatch):
    class Response:
        status_code = 200
        def json(self):
            return {"current": {"temperature_2m": 30}, "daily": {}}

    monkeypatch.setattr(alerts, "http_get", lambda *args, **kwargs: Response())
    assert alerts._sample(19.0, 72.0) == {"available": False}


def test_provider_failure_does_not_create_synthetic_alert(monkeypatch):
    monkeypatch.setattr(alerts, "_sample", lambda *_: {"available": False})
    assert alerts.active_alerts(district="Mumbai") == []


def test_rain_probability_and_humidity_alone_do_not_raise_heavy_rain_alert(monkeypatch):
    monkeypatch.setattr(
        alerts, "_sample",
        lambda *_: _sample(rain_prob=95, humidity=95, precip=0.0, rain_sum=0.0, code=1),
    )
    results = alerts.active_alerts(district="Mumbai")
    assert not any(a.event == "Modelled Heavy Rain Risk" for a in results)


def test_heavy_rain_is_explicitly_labelled_as_computed_estimate(monkeypatch):
    monkeypatch.setattr(
        alerts, "_sample",
        lambda *_: _sample(precip=22.0, rain_sum=70.0, rain_prob=90, humidity=90),
    )
    results = alerts.active_alerts(district="Mumbai")
    heavy = [a for a in results if a.event == "Modelled Heavy Rain Risk"]
    assert len(heavy) == 1
    assert heavy[0].headline.startswith("COMPUTED ")
    assert "not an official bulletin" in heavy[0].sender_name
    assert heavy[0].urgency == "Expected"
    assert heavy[0].certainty == "Likely"



def test_moderate_daily_rainfall_does_not_trigger_heavy_rain_category(monkeypatch):
    monkeypatch.setattr(
        alerts, "_sample",
        lambda *_: _sample(precip=0.0, rain_sum=35.0, rain_prob=100, humidity=95),
    )
    results = alerts.active_alerts(district="Mumbai")
    assert not any(a.event == "Modelled Heavy Rain Risk" for a in results)


def test_imd_heavy_rainfall_threshold_is_used_for_daily_accumulation(monkeypatch):
    monkeypatch.setattr(
        alerts, "_sample",
        lambda *_: _sample(precip=0.0, rain_sum=64.5, rain_prob=95, humidity=90),
    )
    results = alerts.active_alerts(district="Mumbai")
    assert any(a.event == "Modelled Heavy Rain Risk" for a in results)


def test_rain_showers_are_not_labelled_as_thunderstorms(monkeypatch):
    monkeypatch.setattr(
        alerts, "_sample",
        lambda *_: _sample(code=80, rain_prob=90, wind_max=40.0, precip=0.0, rain_sum=0.0),
    )
    results = alerts.active_alerts(district="Mumbai")
    assert not any(a.event == "Modelled Thunderstorm Risk" for a in results)

def test_alert_timestamps_are_explicitly_india_standard_time():
    stamp = alerts._stamp(0)
    assert stamp.endswith(" IST")
