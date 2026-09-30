from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class HourlyForecast(BaseModel):
    time: str
    temp: float
    rain_prob: int
    condition: str
    icon: str
    wind_speed: float

class DailyForecast(BaseModel):
    date: str
    day: str
    temp_max: float
    temp_min: float
    condition: str
    icon: str
    rain_sum: float
    wind_max: float

class WeatherData(BaseModel):
    location: str
    state: str
    country: str = "India"
    lat: float
    lon: float
    current_temp: float
    feels_like: float
    condition: str
    condition_code: int
    humidity: int
    wind_speed: float
    wind_direction: str
    precipitation: float
    pressure: float
    uv_index: float
    visibility: float
    aqi: int
    aqi_status: str
    sunrise: str
    sunset: str
    hourly: List[HourlyForecast]
    daily: List[DailyForecast]
    nwp_model: str = "GFS-NCUM Ensemble (MoES/IMD 0.125° Res)"
    # SIH 2026: source transparency (every important weather result identifies its source)
    data_source: str = "Open-Meteo (LIVE NWP blend)"
    data_type: str = "Forecast"
    status: str = "LIVE"
    updated_at_ist: str = ""
    confidence: str = "Provider/model dependent"

class CAPAlert(BaseModel):
    id: str
    headline: str
    event: str
    severity: str  # Red, Orange, Yellow
    urgency: str
    certainty: str
    area_desc: str
    district: str
    state: str
    lat: float
    lon: float
    effective: str
    expires: str
    instruction: str
    sender_name: str = "India Meteorological Department (MoES)"
    color: str

class AgriCropAdvisory(BaseModel):
    crop: str
    district: str
    state: str
    growth_stage: str
    weather_summary: str
    rainfall_risk: str
    irrigation_advice: str
    pesticide_advice: str
    harvest_recommendation: str
    damini_lightning_alert: bool = False
    suitability_score: int

class AviationBriefing(BaseModel):
    station_icao: str
    station_name: str
    metar_raw: str
    metar_decoded: Dict[str, Any]
    taf_raw: str
    flight_category: str  # VFR, MVFR, IFR, LIFR
    hazards: List[str]

class MarineAdvisory(BaseModel):
    coastal_zone: str
    wave_height_m: float
    sea_condition: str
    wind_speed_knots: float
    fisherman_warning: bool
    warning_message: str
    high_tide_time: str
    low_tide_time: str

class HealthPersonas(BaseModel):
    athletes: str
    asthma_patients: str
    children_schools: str
    elderly: str

class CityComparisonData(BaseModel):
    city1: WeatherData
    city2: WeatherData
    temp_diff: float  # city1 - city2
    temp_warmer_city: str
    humidity_diff: int
    aqi_better_city: str
    rain_risk_city: str
    travel_safety_score: int  # 0-100
    travel_advisory: str
    health_advisory: HealthPersonas

class WeatherQueryRequest(BaseModel):
    query: str
    persona: Optional[str] = "general"
    language: Optional[str] = "auto"
    location_name: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class ChatResponse(BaseModel):
    query: str
    detected_language: str
    persona: str
    speech_text: str
    markdown_response: str
    structured_weather: Optional[WeatherData] = None
    comparison_data: Optional[CityComparisonData] = None
    alerts: Optional[List[CAPAlert]] = None
    agri_advisory: Optional[AgriCropAdvisory] = None
    aviation_briefing: Optional[AviationBriefing] = None
    marine_advisory: Optional[MarineAdvisory] = None
    quick_suggestions: List[str]
    suggested_actions: List[Dict[str, str]]


class RiskAssessment(BaseModel):
    location: str
    state: str
    overall: str
    levels: Dict[str, str]
    thresholds: Dict[str, Any]
    advisories: List[str]
    data_type: str = "ESTIMATED"
    disclaimer: str = ""
    source: str = "WeatherGPT Risk Engine v1"


class DeveloperMeta(BaseModel):
    name: str
    degree: str
    branch: str
    institution: str
    academic_period: str
    event: str
    project: str
    project_type: str
    github: str
    linkedin: str
