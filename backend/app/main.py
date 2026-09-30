"""WeatherGPT SIH 2026 API. Original implementation.

Conversational weather intelligence: live Open-Meteo data, computed
alerts, advisories, risk estimates, and model/data provenance — with
honest LIVE / DEMO / STATIC / ESTIMATED / NOT CONFIGURED labels.
"""
from typing import List, Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_VERSION, allow_credentials_for_origins, get_cors_origins
from .models import (AgriCropAdvisory, AviationBriefing, CAPAlert,
                     ChatResponse, CityComparisonData, DeveloperMeta,
                     MarineAdvisory, WeatherData, WeatherQueryRequest)
from .services import geo
from .services.advisories import (aviation_briefing, climate_reference,
                                  crop_advisory, marine_advisory,
                                  supported_crops)
from .services.agent_tools import list_tools
from .services.air_quality import get_air_quality, uv_guidance
from .services.alerts import active_alerts, cyclone_track
from .services.chat import _compare as compare_places
from .services.chat import answer
from .services.gdacs import global_disasters
from .services.history import climate_history
from .services.indian_sources_service import get_indian_sources_status
from .services.nwp_service import get_nwp_status
from .services.providers import health_snapshot
from .services.risk_engine import assess_risk
from .services.satellite_service import get_satellite_info
from .services.travel import travel_safety
from .services.weather import get_weather

app = FastAPI(
    title="WeatherGPT API — AI Weather Intelligence (SIH 2026)",
    description=("Conversational weather intelligence and decision support. "
                 "SIH 2026 implementation by Muchakarla Hemanth Kumar, "
                 "SRK Institute of Technology."),
    version=APP_VERSION,
)

ORIGINS = get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=allow_credentials_for_origins(ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

watchers: List[WebSocket] = []


@app.get("/api/health")
def health() -> dict:
    return {"status": "healthy", "service": "WeatherGPT Engine",
            "version": APP_VERSION,
            "standards": ["ITU CAP v1.2", "WMO WIS2.0"]}


@app.get("/api/meta/developer", response_model=DeveloperMeta)
def developer() -> DeveloperMeta:
    return DeveloperMeta()


@app.get("/api/meta/project")
def project() -> dict:
    return {
        "name": "WeatherGPT",
        "tagline": "WeatherGPT — AI Weather Intelligence",
        "event": "Smart India Hackathon 2026 (SIH 2026)",
        "category": "AI / ML / Weather Intelligence / Disaster Decision Support",
        "developer": "Muchakarla Hemanth Kumar (SRK Institute of Technology, CSE – AI/ML, 2024–2028)",
        "version": APP_VERSION,
        "license_note": ("Project license: not yet selected. Third-party "
                         "packages are covered by their own upstream licenses; "
                         "see THIRD_PARTY_NOTICES.md."),
    }


@app.get("/api/agent/tools")
def tools() -> dict:
    return list_tools()


@app.get("/api/agent/engine")
def engine() -> dict:
    """How answers are produced: deterministic tools; LLM only if configured."""
    import os
    provider = os.getenv("AI_PROVIDER", "auto").lower()
    llm_key = bool(os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY"))
    active = "RULE-BASED TOOL-GROUNDED"
    if provider not in ("auto", "none", "") and llm_key:
        active = "LLM-ASSISTED (key configured)"
    return {
        "engine": active,
        "ai_provider_setting": provider,
        "llm_configured": llm_key,
        "fallback": "deterministic WeatherGPT tools (always available)",
        "note": "Figures always originate from data tools, never invented.",
    }


@app.get("/api/providers/health")
def providers(live: bool = True) -> dict:
    """Live status/latency table for every registered provider."""
    return health_snapshot(check_live=live)


@app.get("/api/air-quality")
def air_quality(location: str = Query("Pune"), lat: Optional[float] = None,
                lon: Optional[float] = None) -> dict:
    """Live AQI + pollutants (US AQI standard). Falls back to estimate."""
    if lat is None or lon is None:
        lat, lon, proper, state = geo.geocode(location)
    else:
        proper, state = location, "India"
    try:
        return get_air_quality(lat, lon)
    except RuntimeError:
        estimated = 78
        return {"us_aqi": estimated, "band": "Moderate", "standard": "US AQI (EPA)",
                "dominant_pollutant": "—", "pm2_5": None, "pm10": None,
                "nitrogen_dioxide": None, "ozone": None, "sulphur_dioxide": None,
                "carbon_monoxide": None, "observed_at": "",
                "data_source": "Local estimate (AQI upstream unavailable)",
                "data_type": "Estimated", "status": "FALLBACK"}


@app.get("/api/travel/safety")
def travel(location: str = Query("Pune"), lat: Optional[float] = None,
           lon: Optional[float] = None) -> dict:
    """LOW / MODERATE / HIGH trip read with drivers (ESTIMATED)."""
    if lat is None or lon is None:
        lat, lon, proper, state = geo.geocode(location)
    else:
        proper, state = location, "India"
    return travel_safety(get_weather(lat, lon, proper, state))


@app.get("/api/climate/history")
def history_years(location: str = Query("Pune"), years: int = Query(5)) -> dict:
    """Observed yearly means from ERA5 reanalysis (LIVE archive)."""
    lat, lon, proper, state = geo.geocode(location)
    return climate_history(lat, lon, proper, state, years)


@app.get("/api/uv")
def uv(location: str = Query("Pune")) -> dict:
    """Live UV index with protection guidance."""
    lat, lon, proper, state = geo.geocode(location)
    data = get_weather(lat, lon, proper, state)
    guide = uv_guidance(data.uv_index)
    return {"location": proper, "state": state, "uv_index": data.uv_index,
            "level": guide["level"], "advice": guide["advice"],
            "sunrise": data.sunrise, "sunset": data.sunset,
            "data_source": data.data_source, "status": data.status,
            "updated_at_ist": data.updated_at_ist}


@app.post("/api/chat/query", response_model=ChatResponse)
def chat(request: WeatherQueryRequest) -> ChatResponse:
    return answer(request)


@app.get("/api/locations/search")
def search_places(q: str = Query(...), limit: int = Query(8)) -> list:
    return geo.autocomplete(q, limit)


@app.get("/api/locations/regional-explorer")
def explorer(region: str = Query("pune")) -> list:
    return geo.metro_areas(region)


@app.get("/api/weather/current", response_model=WeatherData)
def current(location: str = Query("Pune"),
            lat: Optional[float] = None,
            lon: Optional[float] = None,
            model: str = Query("auto", description="'auto' blend or 'gfs'")) -> WeatherData:
    if lat is None or lon is None:
        lat, lon, proper, state = geo.geocode(location)
    else:
        proper, state = location, "India"
    return get_weather(lat, lon, proper, state, model=model)


@app.get("/api/weather/compare", response_model=CityComparisonData)
def compare(city1: str = Query("Mumbai"),
            city2: str = Query("Delhi")) -> CityComparisonData:
    return compare_places(city1, city2)


@app.get("/api/weather/history")
def history(location: str = Query("Pune")) -> dict:
    lat, lon, proper, state = geo.geocode(location)
    return {"location": proper, "state": state, "lat": lat, "lon": lon,
            "data_type": "STATIC reference series", "status": "STATIC",
            "source": "Bundled multi-decadal reference",
            "trends": climate_reference(f"{proper} ({state})")}


@app.get("/api/alerts/active", response_model=List[CAPAlert])
def alerts(state: Optional[str] = None, district: Optional[str] = None,
           severity: Optional[str] = None) -> List[CAPAlert]:
    return active_alerts(state=state, district=district, severity=severity)


@app.get("/api/alerts/cyclone-track")
def cyclone() -> dict:
    return cyclone_track()


@app.get("/api/disasters/global")
def disasters(region: str = Query("world", description="'world' or 'india'")) -> dict:
    """Recent global disaster events from the public GDACS feed (OFFICIAL third-party)."""
    return global_disasters(region)


@app.get("/api/advisory/crop", response_model=AgriCropAdvisory)
def crop(crop: str = Query("paddy"), district: str = Query("Nagpur"),
         state: str = Query("Maharashtra")) -> AgriCropAdvisory:
    lat, lon, proper, resolved = geo.geocode(district)
    live = get_weather(lat, lon, proper, resolved)
    rain = live.hourly[0].rain_prob if live.hourly else 20
    return crop_advisory(crop, proper, resolved, live.current_temp, rain, live.humidity)


@app.get("/api/advisory/crops-list")
def crops() -> list:
    return supported_crops()


@app.get("/api/aviation/briefing", response_model=AviationBriefing)
def aviation(airport: str = Query("VIDP")) -> AviationBriefing:
    return aviation_briefing(airport)


@app.get("/api/marine/advisory", response_model=MarineAdvisory)
def marine(location: str = Query("Mumbai")) -> MarineAdvisory:
    return marine_advisory(location)


@app.get("/api/climate/trends")
def climate(region: str = Query("All India")) -> dict:
    return climate_reference(region)


@app.get("/api/risk/assess")
def risk(location: str = Query("Pune"), lat: Optional[float] = None,
         lon: Optional[float] = None) -> dict:
    if lat is None or lon is None:
        lat, lon, proper, state = geo.geocode(location)
    else:
        proper, state = location, "India"
    return assess_risk(get_weather(lat, lon, proper, state))


@app.get("/api/nwp/status")
def nwp() -> dict:
    return get_nwp_status()


@app.get("/api/satellite/info")
def satellite(lat: float = 20.0, lon: float = 78.0) -> dict:
    return get_satellite_info(lat, lon)


@app.get("/api/sources/indian")
def indian_sources() -> dict:
    return get_indian_sources_status()


@app.websocket("/ws/alerts")
async def alert_socket(socket: WebSocket) -> None:
    await socket.accept()
    watchers.append(socket)
    try:
        while True:
            await socket.receive_text()
            await socket.send_json({"type": "heartbeat_ack",
                                    "active_alerts_count": len(active_alerts())})
    except WebSocketDisconnect:
        watchers.remove(socket)
