"""Localized tomorrow-forecast labels keep values from the weather tool."""

import pytest

from app.models import WeatherQueryRequest
from app.services import chat
from app.services.chat_i18n import TOMORROW_TEXT, tomorrow_text

from .weather_fixtures import make_test_weather

LANGUAGES = ("en", "hi", "mr", "ta", "te", "bn", "gu", "pa", "kn", "ml", "or")


@pytest.mark.parametrize("language", LANGUAGES)
def test_tomorrow_labels_exist_and_format(language):
    labels = tomorrow_text(language)
    assert labels is not None
    for key in (
        "title",
        "speech",
        "condition",
        "high_low",
        "rain",
        "wind",
        "rain_yes",
        "rain_no",
        "source",
        "note",
    ):
        assert labels[key].strip()
    assert "{place}" in labels["title"]
    formatted = labels["speech"].format(
        place="Vijayawada", cond="Rain", tmax=30, tmin=24, rain=12.5
    )
    assert "Vijayawada" in formatted


def test_telugu_tomorrow_reply_uses_telugu_labels(monkeypatch):
    weather = make_test_weather(16.5, 80.6, "Vijayawada", "Andhra Pradesh")
    monkeypatch.setattr(
        chat.geo,
        "resolve_candidates",
        lambda place, limit=5: [
            {
                "name": "Vijayawada",
                "state": "Andhra Pradesh",
                "country": "India",
                "lat": 16.5,
                "lon": 80.6,
                "confidence": 0.99,
                "source": "gazetteer",
            }
        ],
    )
    monkeypatch.setattr(
        chat.geo,
        "resolve",
        lambda place: (16.5, 80.6, "Vijayawada", "Andhra Pradesh", True),
    )
    monkeypatch.setattr(chat, "get_weather", lambda *args, **kwargs: weather)

    response = chat.answer(
        WeatherQueryRequest(
            query="రేపు విజయవాడలో వర్షం పడుతుందా?",
            language="auto",
            location_name="",
        )
    )

    assert response.detected_language == "te"
    assert "రేపటి పూర్వానుమానం" in response.markdown_response
    assert "Tomorrow's forecast" not in response.markdown_response
    assert "రేపు" in response.speech_text
    assert response.structured_weather is not None
