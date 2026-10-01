"""Tests for the deterministic language analyzer (offline)."""
from fastapi.testclient import TestClient

from app.main import app
from app.services import langid

client = TestClient(app, raise_server_exceptions=False)


def test_native_scripts():
    assert langid.detect_language("मौसम कैसा है?") == "hi"
    assert langid.detect_language("పుణె వాతావరణం?") == "te"
    assert langid.detect_language("சென்னை வானிலை?") == "ta"
    assert langid.detect_language("ಹವಾಮಾನ ಹೇಗಿದೆ?") == "kn"
    assert langid.detect_language("കാലാവസ്ഥ എങ്ങനെ?") == "ml"
    assert langid.detect_language("ପାଣିପାଗ କିପରି?") == "or"
    assert langid.detect_language("আবহাওয়া কেমন?") == "bn"
    assert langid.detect_language("હવામાન કેવું?") == "gu"
    assert langid.detect_language("ਮੌਸਮ ਕਿਵੇਂ?") == "pa"
    assert langid.detect_language("पुण्यात पाऊस पडेल का?") == "mr"


def test_romanized_queries():
    assert langid.detect_language("baarish kab hogi") == "hi"
    assert langid.detect_language("kal mausam kaisa rahega") == "hi"
    assert langid.detect_language("hyderabad mein baarish hogi kya") == "hi"
    assert langid.detect_language("vijayawada lo weather ela undi") == "te"
    assert langid.detect_language("varsham eppudu padutundi") == "te"
    assert langid.detect_language("naaku weather cheppandi") == "te"
    assert langid.detect_language("mazhai eppo varum") == "ta"
    assert langid.detect_language("kal barish hogi kya") == "hi"
    assert langid.detect_language("paus kadhi padel") == "mr"
    assert langid.detect_language("male eppudu barutte") in ("kn", "te", "hi")


def test_mixed_and_ambiguous():
    assert langid.detect_language("What is the weather today?") == "en"
    assert langid.detect_language("weather in Vijayawada today") == "en"
    out = langid.analyze_query("hello")
    assert out["language"] == "en" and out["confidence"] <= 0.6
    assert langid.analyze_query("")["normalized_query"] == ""


def test_analyze_shape_and_intent():
    out = langid.analyze_query("baarish kab hogi Mumbai mein?")
    assert out["language"] == "hi"
    assert out["script"] == "latin"
    assert out["detected_intent"] == "rain"
    assert out["normalized_query"] == "baarish kab hogi mumbai mein?"
    assert 0.0 <= out["confidence"] <= 1.0
    assert langid.analyze_query("compare Mumbai vs Delhi")["detected_intent"] == "compare"
    assert langid.analyze_query("Is it safe to travel?")["detected_intent"] == "travel"


def test_analyze_endpoint():
    body = client.post("/api/language/analyze", json={"text": "mazhai eppo varum?"}).json()
    assert body["language"] == "ta"
    assert body["script"] == "latin"
    assert body["detected_intent"] == "rain"


def test_chat_uses_romanized_language():
    from app.models import WeatherQueryRequest
    from app.services import chat, weather
    fake = weather._fallback(28.0, 77.0, "Delhi", "Delhi")
    import unittest.mock as mock
    with mock.patch.object(chat, "get_weather", return_value=fake):
        response = chat.answer(WeatherQueryRequest(query="Dilli mein baarish hogi kya?",
                                                   language="auto"))
    assert response.detected_language == "hi"
