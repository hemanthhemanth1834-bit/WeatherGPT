"""Executable tool registry tests: allowlist, validation, trace and context."""

import pytest

from app.agent.context import ConversationContext
from app.agent.tool_executor import execute_tool, trace_entry
from app.agent.tool_registry import TOOLS, list_registered_tools
from .weather_fixtures import make_test_weather


def test_registry_exposes_validated_executable_tools():
    names = {tool["name"] for tool in list_registered_tools()}
    assert {
        "get_current_weather",
        "get_official_warnings",
        "get_provider_health",
    } <= names
    for tool in list_registered_tools():
        assert tool["input_schema"]["type"] == "object"
        assert tool["timeout_seconds"] > 0


def test_unknown_tool_is_rejected():
    result = execute_tool("run_shell", {"command": "whoami"})
    assert result.ok is False
    assert result.status == "UNKNOWN_TOOL"
    assert not result.data


def test_invalid_input_is_rejected_without_execution():
    result = execute_tool(
        "get_current_weather",
        {"lat": 999, "lon": 0, "place": "Pune"},
    )
    assert result.ok is False
    assert result.status == "INVALID_INPUT"
    assert "lat" in (result.error or "")


def test_current_weather_tool_returns_fixture(monkeypatch):
    monkeypatch.setattr(
        "app.services.weather.get_weather",
        lambda lat, lon, place, state, model="auto": make_test_weather(
            24.5, 80.6, place, state or "Maharashtra"
        ),
    )
    result = execute_tool(
        "get_current_weather",
        {"lat": 18.5, "lon": 73.8, "place": "Pune", "state": "Maharashtra"},
    )
    assert result.ok is True
    assert result.status == "OK"
    assert result.data["weather"]["location"] == "Pune"
    assert result.duration_ms >= 0
    trace = trace_entry(result)
    assert trace == {
        "tool": "get_current_weather",
        "status": "OK",
        "duration_ms": result.duration_ms,
        "source": "Open-Meteo",
    }
    assert "lat" not in trace


def test_official_warning_tool_never_invents_matches(monkeypatch):
    monkeypatch.setattr(
        "app.services.imd_rss.get_imd_rss_warnings",
        lambda limit=25: {
            "status": "LIVE",
            "source": "https://mausam.imd.gov.in/test",
            "items": [
                {
                    "title": "Thunderstorm warning for Vijayawada",
                    "description": "Thunderstorm likely in Vijayawada, Andhra Pradesh.",
                    "link": "https://mausam.imd.gov.in/test-item",
                    "published": "02 Nov 2026",
                    "source": "India Meteorological Department",
                    "source_type": "OFFICIAL",
                    "official": True,
                }
            ],
        },
    )
    matched = execute_tool(
        "get_official_warnings",
        {"state": "Andhra Pradesh", "district": "Vijayawada"},
    )
    assert matched.ok is True
    assert matched.data["status"] == "MATCHED"
    assert matched.data["items"][0]["official"] is True
    no_match = execute_tool("get_official_warnings", {"state": "Kerala"})
    assert no_match.data["status"] == "NO_MATCH"
    assert no_match.data["items"] == []


def test_provider_health_tool_without_configuration(monkeypatch):
    for name in (
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "GROQ_API_KEY",
        "OPENROUTER_API_KEY",
        "OLLAMA_HOST",
        "AI_PROVIDER",
    ):
        monkeypatch.delenv(name, raising=False)
    result = execute_tool("get_provider_health", {})
    assert result.ok is True
    assert result.data["active_inference"] == "DETERMINISTIC"
    assert result.data["health"] == "NOT_CONFIGURED"


def test_conversation_context_is_immutable_and_bounded():
    first = ConversationContext(location="Vijayawada", state="Andhra Pradesh")
    second = first.update(location="Hyderabad", last_intent="forecast", ignored="x")
    assert first.location == "Vijayawada"
    assert second.location == "Hyderabad"
    assert second.last_intent == "forecast"
    assert second.updated_at
    assert "ignored" not in second.as_dict()
