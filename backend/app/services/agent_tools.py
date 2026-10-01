"""Explicit AI agent / tool-calling registry (SIH 2026 addition).

The conversational engine in chat.py routes intents to deterministic tools.
The LLM never invents numerical weather values; all numbers come from tools.
"""
from typing import Dict, Any, List

TOOL_REGISTRY: List[Dict[str, Any]] = [
    {"name": "weather_current", "description": "Live current conditions + 24h hourly + 7-day NWP for a location.", "source": "Open-Meteo (LIVE)", "handler": "weather.get_weather"},
    {"name": "weather_forecast", "description": "Hourly/daily NWP forecast slice for a location.", "source": "Open-Meteo (LIVE)", "handler": "weather.get_weather"},
    {"name": "weather_history", "description": "Multi-decadal climate normals/anomaly context.", "source": "STATIC reference series (labelled)", "handler": "advisories.climate_reference"},
    {"name": "weather_alerts", "description": "Active CAP-style alerts from live telemetry scan.", "source": "Computed LIVE from telemetry (not official bulletins)", "handler": "alerts.active_alerts"},
    {"name": "weather_map", "description": "GIS layers: radar tiles, alert polygons, cyclone track.", "source": "RainViewer LIVE + DEMO overlays", "handler": "frontend MapPanel + /api/alerts/cyclone-track"},
    {"name": "air_quality", "description": "Estimated AQI band bundled with current weather.", "source": "ESTIMATED heuristic (labelled)", "handler": "weather.estimate_aqi"},
    {"name": "climate_analysis", "description": "Decadal temperature/monsoon departure series.", "source": "STATIC reference (labelled OBSERVED/ESTIMATED)", "handler": "advisories.climate_reference"},
    {"name": "location_search", "description": "Geocode + autocomplete across the gazetteer and live geocoding.", "source": "Local gazetteer + Open-Meteo geocoding (LIVE)", "handler": "geo.geocode/geo.autocomplete"},
    {"name": "risk_analysis", "description": "Deterministic LOW/MODERATE/HIGH/EXTREME risk from thresholds.", "source": "Local computation (ESTIMATED)", "handler": "risk_engine.assess_risk"},
    {"name": "agriculture_advisory", "description": "Crop-specific Agromet guidance (informational only).", "source": "Rule-based on live weather (DEMO-grade advice)", "handler": "advisories.crop_advisory"},
    {"name": "satellite_information", "description": "Satellite imagery/service pointers with acquisition time.", "source": "NASA GIBS LIVE links + MOSDAC NOT CONFIGURED", "handler": "satellite_service.get_satellite_info"},
    {"name": "air_quality_live", "description": "Live US AQI + PM2.5/PM10/NO2/O3/SO2/CO.", "source": "Open-Meteo Air Quality (LIVE)", "handler": "air_quality.get_air_quality"},
    {"name": "travel_safety", "description": "LOW/MODERATE/HIGH trip read with drivers.", "source": "Weather + risk + alerts (ESTIMATED)", "handler": "travel.travel_safety"},
    {"name": "earthquake_watch", "description": "Recent USGS earthquakes, largest first.", "source": "USGS (OFFICIAL third-party)", "handler": "disasters.earthquakes"},
    {"name": "wildfire_watch", "description": "Open NASA EONET wildfire detections.", "source": "NASA EONET (OFFICIAL third-party)", "handler": "disasters.wildfires"},
    {"name": "provider_health", "description": "Live status/latency of every provider.", "source": "Runtime probes", "handler": "providers.health_snapshot"},
]


def list_tools() -> Dict[str, Any]:
    return {
        "architecture": "Intent router (chat.answer) -> deterministic tool -> templated multilingual response. Numerical values always originate from tools. Optional LLM layer activates only with configured credentials (see /api/agent/engine).",
        "tools": TOOL_REGISTRY,
    }
