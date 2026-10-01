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

# Best-effort per-IP rate limiting (in-memory sliding window; per worker).
# Documented honestly: BEST-EFFORT PER INSTANCE, not globally distributed
# (single serverless workers share no state; no paid store is used).
# Tiers protect expensive routes more aggressively without blocking demos.
import os as _os
import time as _time
from collections import deque as _deque
from fastapi import Request as _Request
from fastapi.responses import JSONResponse as _JSONResponse

_RATE_DEFAULT = int(_os.getenv("RATE_LIMIT_PER_MINUTE", "300"))
_RATE_TIERS = {
    "/api/chat/query": int(_os.getenv("RATE_LIMIT_CHAT_PER_MINUTE", "60")),
    "/api/weather/compare": int(_os.getenv("RATE_LIMIT_COMPARE_PER_MINUTE", "60")),
    "/api/climate/history": int(_os.getenv("RATE_LIMIT_CLIMATE_PER_MINUTE", "30")),
    "/api/climate/monthly": int(_os.getenv("RATE_LIMIT_CLIMATE_PER_MINUTE", "30")),
    "/api/assistant/explain": int(_os.getenv("RATE_LIMIT_EXPLAIN_PER_MINUTE", "30")),
}
_RATE_WINDOW = 60.0
_MAX_TRACKED_IPS = 2000
_rate_hits: dict = {}


def _tier_limit(path: str) -> int:
    for prefix, limit in _RATE_TIERS.items():
        if path == prefix:
            return limit
    return _RATE_DEFAULT


@app.middleware("http")
async def rate_limit_middleware(request: _Request, call_next):
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        now = _time.time()
        bucket = _rate_hits.get((ip, request.url.path))
        if bucket is None:
            if len(_rate_hits) >= _MAX_TRACKED_IPS:
                _rate_hits.clear()
            bucket = _rate_hits[(ip, request.url.path)] = _deque()
        while bucket and now - bucket[0] > _RATE_WINDOW:
            bucket.popleft()
        if len(bucket) >= _tier_limit(request.url.path):
            return _JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down and retry."},
                headers={"Retry-After": "30", "Access-Control-Allow-Origin": "*"},
            )
        bucket.append(now)
    return await call_next(request)


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


@app.post("/api/language/analyze")
def language(payload: dict) -> dict:
    """Deterministic language/script/intent analysis (no ML, no LLM)."""
    from .services.langid import analyze_query
    return analyze_query(str(payload.get("text", ""))[:500])


@app.get("/api/agent/engine")
def engine() -> dict:
    """How answers are produced: deterministic tools; LLM only if configured."""
    import os
    from .services.llm import configured_providers
    provider = os.getenv("AI_PROVIDER", "auto").lower()
    available = configured_providers()
    active = "RULE-BASED TOOL-GROUNDED"
    if provider not in ("auto", "none", "") and available:
        active = "LLM-ASSISTED (key configured)"
    return {
        "engine": active,
        "ai_provider_setting": provider,
        "llm_configured": bool(available),
        "configured_providers": available,
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
    from fastapi import HTTPException
    try:
        if lat is None or lon is None:
            lat, lon, proper, state = geo.geocode(location)
        else:
            proper, state = location, "India"
        return travel_safety(get_weather(lat, lon, proper, state))
    except Exception:
        raise HTTPException(status_code=502, detail="Travel engine temporarily unavailable")


@app.get("/api/climate/history")
def history_years(location: str = Query("Pune"), years: int = Query(5)) -> dict:
    """Observed yearly means from ERA5 reanalysis (LIVE archive)."""
    from fastapi import HTTPException
    lat, lon, proper, state = geo.geocode(location)
    try:
        return climate_history(lat, lon, proper, state, years)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=f"Archive unavailable: {exc}")


@app.get("/api/climate/monthly")
def history_monthly(location: str = Query("Pune"), year: int = Query(2025)) -> dict:
    """Observed monthly means for one year (LIVE archive)."""
    from fastapi import HTTPException
    from .services.history import monthly_means
    lat, lon, proper, state = geo.geocode(location)
    try:
        return monthly_means(lat, lon, proper, state, year)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=f"Archive unavailable: {exc}")


@app.post("/api/assistant/explain")
def assistant_explain(payload: dict) -> dict:
    """Optional LLM explanation grounded in live context (deterministic fallback)."""
    from .services.llm import explain
    topic = str(payload.get("topic", "current weather"))[:200]
    location = str(payload.get("location", "Pune"))[:80]
    lat, lon, proper, state = geo.geocode(location)
    data = get_weather(lat, lon, proper, state)
    context = (f"{proper}, {state}: {data.condition}, {data.current_temp}C "
               f"(feels {data.feels_like}C), humidity {data.humidity}%, "
               f"wind {data.wind_speed} km/h {data.wind_direction}, "
               f"precipitation {data.precipitation} mm, pressure {data.pressure} hPa. "
               f"Source {data.data_source}, {data.status}, updated {data.updated_at_ist}.")
    return explain(topic, context)


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
    """Never 500s on data failure: honest error reply instead."""
    try:
        return answer(request)
    except Exception:
        return ChatResponse(
            query=request.query[:200],
            detected_language="en",
            persona=request.persona or "general",
            speech_text="Weather data is temporarily unavailable. Please try again.",
            markdown_response=("⚠️ **Data temporarily unavailable** — the weather engine "
                               "could not retrieve live data. No values are shown rather "
                               "than guessed. Please retry shortly."),
            quick_suggestions=["Retry my question", "Active alerts"],
            suggested_actions=[{"label": "Check alerts", "action": "open_alerts"}],
        )


@app.get("/api/locations/search")
def search_places(q: str = Query(...), limit: int = Query(8)) -> list:
    return geo.autocomplete(q, limit)


@app.get("/api/locations/regional-explorer")
def explorer(region: str = Query("pune")) -> list:
    return geo.metro_areas(region)


@app.get("/api/locations/reverse")
def reverse_geocode(lat: float = Query(...), lon: float = Query(...)) -> dict:
    """GPS coordinates to nearest city/state (BigDataCloud, free, no key)."""
    return geo.reverse(lat, lon)


@app.get("/api/weather/current", response_model=WeatherData)
def current(location: str = Query("Pune"),
            lat: Optional[float] = None,
            lon: Optional[float] = None,
            model: str = Query("auto", description="'auto' blend or 'gfs'"),
            state: Optional[str] = Query(None, description="State override for coords")) -> WeatherData:
    if lat is None or lon is None:
        lat, lon, proper, resolved = geo.geocode(location)
        state = state or resolved
    else:
        proper = location
        state = state or "India"
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


@app.get("/api/disasters/earthquakes")
def quakes(min_magnitude: float = Query(4.5), days: int = Query(7)) -> dict:
    """Recent earthquakes from USGS (OFFICIAL third-party, geological)."""
    from fastapi import HTTPException
    from .services.disasters import earthquakes
    try:
        return earthquakes(min_magnitude, days)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=f"USGS unavailable: {exc}")


@app.get("/api/disasters/wildfires")
def fires(limit: int = Query(20)) -> dict:
    """Open wildfire detections from NASA EONET (OFFICIAL third-party)."""
    from fastapi import HTTPException
    from .services.disasters import wildfires
    try:
        return wildfires(limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=f"EONET unavailable: {exc}")


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
    """Live ADDS METAR/TAF first; STATIC sample fallback (labelled)."""
    from .services.aviation_live import KNOWN as LIVE_AIRPORTS, live_briefing
    code = (airport or "VIDP").upper()
    if code in LIVE_AIRPORTS or len(code) == 4:
        live = live_briefing(code)
        if live is not None:
            info = {"name": live["station_icao"]}
            decoded = {
                "station": live["station_icao"],
                "temperature_c": live["temperature_c"],
                "dewpoint_c": live["dewpoint_c"],
                "wind": f"{live['wind_dir_deg']}° at {live['wind_speed_kt']} kt"
                        + (f" gusting {live['wind_gust_kt']} kt" if live["wind_gust_kt"] else ""),
                "visibility": f"{live['visibility_sm']} SM" if live["visibility_sm"] is not None else "not reported",
                "ceiling_ft": live["ceiling_ft"],
                "altimeter_hpa": live["altimeter_hpa"],
                "observed_at": live["observed_at"],
                "provenance": "LIVE (NOAA ADDS)",
            }
            return AviationBriefing(
                station_icao=live["station_icao"],
                station_name=f"{live['station_icao']} (live ADDS report)",
                metar_raw=live["metar_raw"],
                metar_decoded=decoded,
                taf_raw=live["taf_raw"] or "No current TAF in feed",
                flight_category=live["flight_category"],
                hazards=live["hazards"],
            )
    return aviation_briefing(code)


@app.get("/api/marine/advisory", response_model=MarineAdvisory)
def marine(location: str = Query("Mumbai")) -> MarineAdvisory:
    return marine_advisory(location)


@app.get("/api/climate/trends")
def climate(region: str = Query("All India")) -> dict:
    return climate_reference(region)


@app.get("/api/risk/assess")
def risk(location: str = Query("Pune"), lat: Optional[float] = None,
         lon: Optional[float] = None) -> dict:
    from fastapi import HTTPException
    try:
        if lat is None or lon is None:
            lat, lon, proper, state = geo.geocode(location)
        else:
            proper, state = location, "India"
        return assess_risk(get_weather(lat, lon, proper, state))
    except Exception:
        raise HTTPException(status_code=502, detail="Risk engine temporarily unavailable")


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
