"""Increment 3/5 contract tests: provenance, official warnings, no substitution."""

from app.models import WeatherQueryRequest
from app.services import chat
from .weather_fixtures import make_test_weather

CANDIDATE = {
    "name": "Vijayawada",
    "state": "Andhra Pradesh",
    "country": "India",
    "lat": 16.5,
    "lon": 80.6,
    "confidence": 0.99,
    "source": "gazetteer",
}


def _candidate(*_args, **_kwargs):
    return [dict(CANDIDATE)]


def _weather(*_args, **_kwargs):
    return make_test_weather(16.5, 80.6, "Vijayawada", "Andhra Pradesh")


def test_weather_answer_carries_provenance(monkeypatch):
    monkeypatch.setattr(chat.geo, "resolve_candidates", _candidate)
    monkeypatch.setattr(chat, "get_weather", _weather)

    response = chat.answer(
        WeatherQueryRequest(query="Weather in Vijayawada", location_name="Vijayawada")
    )

    assert response.structured_weather is not None
    assert response.provenance is not None
    assert response.provenance["sources"] == response.sources
    assert response.provenance["source"]["type"] in {"PROVIDER", "OFFICIAL"}
    assert response.data_type
    assert response.freshness in {"FRESH", "DELAYED", "STALE", "UNKNOWN", "UNAVAILABLE"}
    assert isinstance(response.limitations, list)
    assert response.tool_trace
    assert response.tool_trace[0]["tool"] == "get_weather"
    assert response.official_alert_status == "NOT_REQUESTED"


def test_greeting_has_no_weather_or_provenance(monkeypatch):
    monkeypatch.setattr(
        chat,
        "get_weather",
        lambda *_a, **_k: (_ for _ in ()).throw(
            AssertionError("weather must not be called")
        ),
    )

    response = chat.answer(
        WeatherQueryRequest(query="hello", location_name="Vijayawada")
    )

    assert response.structured_weather is None
    assert response.provenance is None
    assert response.official_alert_status == "NOT_REQUESTED"
    assert "WeatherGPT" in response.markdown_response


def _official_feed(items, status="LIVE"):
    return {
        "status": status,
        "source": "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php",
        "items": items,
        "error": None if status == "LIVE" else "offline",
    }


def test_official_warning_matched_and_separate(monkeypatch):
    monkeypatch.setattr(chat.geo, "resolve_candidates", _candidate)
    monkeypatch.setattr(
        chat,
        "get_imd_rss_warnings",
        lambda **_kwargs: _official_feed(
            [
                {
                    "title": "Heavy rainfall warning for Vijayawada, Andhra Pradesh",
                    "description": "Heavy rainfall likely in Vijayawada, Andhra Pradesh.",
                    "link": "https://mausam.imd.gov.in/example",
                    "published": "02 Nov 2026 10:00 IST",
                    "source": "India Meteorological Department",
                    "source_type": "OFFICIAL",
                    "official": True,
                }
            ]
        ),
    )

    response = chat.answer(
        WeatherQueryRequest(
            query="What is the official heavy rainfall warning for Vijayawada?",
            location_name="Vijayawada",
        )
    )

    assert response.official_alert_status == "MATCHED"
    assert len(response.official_alerts) == 1
    assert response.official_alerts[0]["source_type"] == "OFFICIAL"
    assert response.data_type == "OFFICIAL_WARNING"
    assert response.structured_weather is None
    assert response.provenance is not None
    assert response.provenance["source"]["type"] == "OFFICIAL"
    assert "Official source" in response.markdown_response


def test_official_warning_unavailable_is_explicit(monkeypatch):
    monkeypatch.setattr(chat.geo, "resolve_candidates", _candidate)
    monkeypatch.setattr(
        chat,
        "get_imd_rss_warnings",
        lambda **_kwargs: _official_feed([], status="UNAVAILABLE"),
    )

    response = chat.answer(
        WeatherQueryRequest(
            query="Any IMD warning for Vijayawada?", location_name="Vijayawada"
        )
    )

    assert response.official_alert_status == "UNAVAILABLE"
    assert response.official_alerts == []
    assert response.structured_weather is None
    assert "not substituting" in response.markdown_response.lower()
    assert "inventing a warning" in response.markdown_response.lower()


def test_official_warning_no_match_does_not_invent(monkeypatch):
    monkeypatch.setattr(chat.geo, "resolve_candidates", _candidate)
    monkeypatch.setattr(
        chat,
        "get_imd_rss_warnings",
        lambda **_kwargs: _official_feed(
            [
                {
                    "title": "Thunderstorm warning for Kolkata, West Bengal",
                    "description": "Thunderstorm likely in Kolkata.",
                    "link": "https://mausam.imd.gov.in/example2",
                    "published": "02 Nov 2026 10:00 IST",
                    "source": "India Meteorological Department",
                    "source_type": "OFFICIAL",
                    "official": True,
                }
            ]
        ),
    )

    response = chat.answer(
        WeatherQueryRequest(
            query="What is the official warning for Vijayawada?",
            location_name="Vijayawada",
        )
    )

    assert response.official_alert_status == "NO_MATCH"
    assert response.official_alerts == []
    assert "does not prove" in response.markdown_response.lower()
    assert "Thunderstorm warning for Kolkata" not in response.markdown_response
