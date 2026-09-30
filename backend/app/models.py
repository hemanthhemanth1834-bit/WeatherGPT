"""Pydantic data contracts for the WeatherGPT SIH 2026 API.

Original implementation for this project. Field names form the public
JSON contract consumed by the frontend and tests.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HourlyPoint(BaseModel):
    time: str = Field(description="Local HH:MM label, Asia/Kolkata")
    temp: float = 25.0
    rain_prob: int = Field(default=0, ge=0, le=100)
    condition: str = "Clear Sky"
    icon: str = "Sun"
    wind_speed: float = 10.0


class DailyPoint(BaseModel):
    date: str = ""
    day: str = ""
    temp_max: float = 32.0
    temp_min: float = 22.0
    condition: str = "Clear Sky"
    icon: str = "Sun"
    rain_sum: float = 0.0
    wind_max: float = 15.0


class WeatherData(BaseModel):
    """Current conditions plus hourly/daily outlook for one place."""

    location: str = "Pune"
    state: str = "Maharashtra"
    country: str = "India"
    lat: float = 18.5204
    lon: float = 73.8567
    current_temp: float = 28.0
    feels_like: float = 30.0
    condition: str = "Clear Sky"
    condition_code: int = 1
    humidity: int = 60
    wind_speed: float = 12.0
    wind_direction: str = "W"
    precipitation: float = 0.0
    pressure: float = 1012.0
    uv_index: float = 6.0
    visibility: float = 9.0
    aqi: int = 80
    aqi_status: str = "Satisfactory"
    sunrise: str = "06:05"
    sunset: str = "18:35"
    hourly: List[HourlyPoint] = Field(default_factory=list)
    daily: List[DailyPoint] = Field(default_factory=list)
    nwp_model: str = "Open-Meteo NWP blend (GFS + ICON + ECMWF HRES)"
    # Source transparency: every weather payload identifies its origin.
    data_source: str = "Open-Meteo"
    data_type: str = "Forecast"
    status: str = "LIVE"
    updated_at_ist: str = ""
    confidence: str = "Provider/model dependent"


class CAPAlert(BaseModel):
    """Application-computed alert styled on the CAP data model.

    These are generated from live telemetry against documented thresholds.
    They are NOT official government bulletins.
    """

    id: str = ""
    headline: str = ""
    event: str = ""
    severity: str = "Yellow"
    urgency: str = "Expected"
    certainty: str = "Likely"
    area_desc: str = ""
    district: str = ""
    state: str = ""
    lat: float = 0.0
    lon: float = 0.0
    effective: str = ""
    expires: str = ""
    instruction: str = ""
    sender_name: str = "WeatherGPT computed alerts (not an official bulletin)"
    color: str = "#EAB308"


class AgriCropAdvisory(BaseModel):
    crop: str = ""
    district: str = ""
    state: str = ""
    growth_stage: str = ""
    weather_summary: str = ""
    rainfall_risk: str = ""
    irrigation_advice: str = ""
    pesticide_advice: str = ""
    harvest_recommendation: str = ""
    damini_lightning_alert: bool = False
    suitability_score: int = 70


class AviationBriefing(BaseModel):
    station_icao: str = "VIDP"
    station_name: str = ""
    metar_raw: str = ""
    metar_decoded: Dict[str, Any] = Field(default_factory=dict)
    taf_raw: str = ""
    flight_category: str = "VFR"
    hazards: List[str] = Field(default_factory=list)


class MarineAdvisory(BaseModel):
    coastal_zone: str = ""
    wave_height_m: float = 1.0
    sea_condition: str = "Slight"
    wind_speed_knots: float = 10.0
    fisherman_warning: bool = False
    warning_message: str = ""
    high_tide_time: str = ""
    low_tide_time: str = ""


class HealthPersonas(BaseModel):
    athletes: str = ""
    asthma_patients: str = ""
    children_schools: str = ""
    elderly: str = ""


class CityComparisonData(BaseModel):
    city1: WeatherData
    city2: WeatherData
    temp_diff: float = 0.0
    temp_warmer_city: str = ""
    humidity_diff: int = 0
    aqi_better_city: str = ""
    rain_risk_city: str = ""
    travel_safety_score: int = 90
    travel_advisory: str = ""
    health_advisory: HealthPersonas = Field(default_factory=HealthPersonas)


class WeatherQueryRequest(BaseModel):
    query: str = ""
    persona: Optional[str] = "general"
    language: Optional[str] = "auto"
    location_name: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class ChatResponse(BaseModel):
    query: str = ""
    detected_language: str = "en"
    persona: str = "general"
    speech_text: str = ""
    markdown_response: str = ""
    structured_weather: Optional[WeatherData] = None
    comparison_data: Optional[CityComparisonData] = None
    alerts: Optional[List[CAPAlert]] = None
    agri_advisory: Optional[AgriCropAdvisory] = None
    aviation_briefing: Optional[AviationBriefing] = None
    marine_advisory: Optional[MarineAdvisory] = None
    quick_suggestions: List[str] = Field(default_factory=list)
    suggested_actions: List[Dict[str, str]] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    location: str = ""
    state: str = ""
    overall: str = "LOW"
    levels: Dict[str, str] = Field(default_factory=dict)
    thresholds: Dict[str, Any] = Field(default_factory=dict)
    advisories: List[str] = Field(default_factory=list)
    data_type: str = "ESTIMATED"
    disclaimer: str = ""
    source: str = "WeatherGPT Risk Engine v1"


class DeveloperMeta(BaseModel):
    name: str = "Muchakarla Hemanth Kumar"
    degree: str = "B.Tech"
    branch: str = "CSE – AI/ML"
    institution: str = "SRK Institute of Technology (SRKIT)"
    academic_period: str = "2024–2028"
    event: str = "Smart India Hackathon 2026 (SIH 2026)"
    project: str = "WeatherGPT — AI Weather Intelligence"
    project_type: str = (
        "AI-powered conversational weather intelligence and decision-support platform"
    )
    github: str = "https://github.com/hemanthhemanth1834-bit"
    linkedin: str = "https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/"
