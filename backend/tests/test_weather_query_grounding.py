"""Regression tests for truthful, query-specific forecast answers."""
from app.models import DailyPoint, WeatherData, WeatherQueryRequest
from app.services import chat


def test_tomorrow_question_uses_tomorrow_daily_forecast(monkeypatch):
    data = WeatherData(
        location="Vijayawada",
        state="Andhra Pradesh",
        current_temp=29.0,
        hourly=[],
        daily=[
            DailyPoint(date="2026-10-14", day="Today", temp_max=33, temp_min=25,
                       condition="Clear Sky", rain_sum=0, wind_max=12),
            DailyPoint(date="2026-10-15", day="Thu", temp_max=30, temp_min=24,
                       condition="Moderate Rain", rain_sum=8.4, wind_max=22),
        ],
    )
    monkeypatch.setattr(chat.geo, "geocode",
                        lambda place: (16.5062, 80.6480, "Vijayawada", "Andhra Pradesh"))
    monkeypatch.setattr(chat, "get_weather", lambda *args, **kwargs: data)

    result = chat.answer(WeatherQueryRequest(query="Will it rain tomorrow in Vijayawada?"))
    assert "2026-10-15" in result.markdown_response
    assert "8.4 mm" in result.markdown_response
    assert "30°C / 24°C" in result.markdown_response
    assert "model forecast" in result.markdown_response
