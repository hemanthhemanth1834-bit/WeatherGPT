"""Unit tests for the chat engine's offline logic (no network required)."""
from app.models import WeatherQueryRequest
from app.services import chat
from app.services import weather


def test_detect_english_telugu_hindi_marathi():
    assert chat.detect_language("What is the weather today?") == "en"
    assert chat.detect_language("రేపు వర్షం పడుతుందా?") == "te"
    assert chat.detect_language("मौसम कैसा है?") == "hi"
    assert chat.detect_language("पुण्यात पाऊस पडेल का?") == "mr"
    assert chat.detect_language("சென்னையில் மழை பெய்யுமா?") == "ta"


def test_extract_place_from_english_and_native():
    assert chat.extract_place("weather in Vijayawada today", None) == "Vijayawada"
    assert chat.extract_place("ପୁରୀରେ ବର୍ଷା ହେବ କି?", None) == "Puri"
    assert chat.extract_place("tell me something", "Pune") == "Pune"


def test_extract_pair():
    assert chat.extract_pair("compare Mumbai vs Delhi") == ("Mumbai", "Delhi")


def test_weather_mapping_pure_helpers():
    assert weather.compass(90) == "E"
    assert weather.compass(270) == "W"
    assert weather.aqi_band(30) == "Good"
    assert weather.aqi_band(500) == "Severe"
    assert weather.estimate_aqi("Delhi") > weather.estimate_aqi("Kerala")


def test_render_uses_tool_numbers_not_invention():
    data = weather._fallback(16.5, 80.6, "Vijayawada", "Andhra Pradesh")
    speech, markdown = chat._render_weather("Vijayawada", "Andhra Pradesh", data, "en")
    assert "27.0" in speech
    assert "Open-Meteo" not in markdown  # fallback labels its own source
    assert "Local estimate" in markdown


def test_answer_compare_contract_without_network(monkeypatch):
    from app.models import WeatherData
    fake = WeatherData(location="A", state="S", hourly=[], daily=[])
    monkeypatch.setattr(chat, "get_weather", lambda *a: fake)
    response = chat.answer(WeatherQueryRequest(query="compare A vs B"))
    assert response.comparison_data is not None
    assert response.structured_weather is not None


def test_aqi_intent_labels_source(monkeypatch):
    from app.models import WeatherData
    fake = WeatherData(location="Pune", state="Maharashtra", hourly=[], daily=[])
    monkeypatch.setattr(chat, "get_weather", lambda *a: fake)
    monkeypatch.setattr(
        "app.services.air_quality.get_air_quality",
        lambda *a: {"standard": "US AQI (EPA)", "us_aqi": 88, "band": "Moderate",
                    "pm2_5": 30.0, "pm10": 55.0, "dominant_pollutant": "pm2_5"},
    )
    response = chat.answer(WeatherQueryRequest(query="What is the AQI and air quality?"))
    assert "Air quality (LIVE" in response.markdown_response
    assert "88" in response.markdown_response
