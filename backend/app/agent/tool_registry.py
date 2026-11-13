"""Executable tool registry with validated inputs and declared sources.

Handlers are thin wrappers around existing deterministic services. They never
invent values and never expose credentials in their result metadata.
"""

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Type

from pydantic import BaseModel, Field


class CurrentWeatherInput(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    place: str = Field(min_length=1, max_length=120)
    state: str = Field(default="", max_length=120)
    model: str = Field(default="auto", max_length=20)


class OfficialWarningsInput(BaseModel):
    state: str = Field(default="", max_length=120)
    district: str = Field(default="", max_length=120)
    keywords: List[str] = Field(default_factory=list, max_length=8)


class AirQualityInput(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    place: str = Field(default="", max_length=120)
    state: str = Field(default="", max_length=120)


class ModelComparisonInput(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    place: str = Field(min_length=1, max_length=120)
    state: str = Field(default="", max_length=120)
    models: List[str] = Field(default_factory=lambda: ["gfs", "ecmwf", "icon"])


class ProviderHealthInput(BaseModel):
    provider: Optional[str] = Field(default=None, max_length=40)
    live: bool = False


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    input_model: Type[BaseModel]
    handler: Callable[[Any], Any]
    timeout_seconds: float
    source: str


def _current_weather(payload: CurrentWeatherInput) -> Dict[str, Any]:
    from ..services.weather import get_weather

    data = get_weather(
        payload.lat, payload.lon, payload.place, payload.state, payload.model
    )
    return {
        "weather": data.model_dump(),
        "source": data.data_source,
        "data_type": data.data_type,
        "status": data.status,
    }


def _official_warnings(payload: OfficialWarningsInput) -> Dict[str, Any]:
    from ..services.imd_rss import filter_warnings, get_imd_rss_warnings

    result = get_imd_rss_warnings(limit=25)
    items = result.get("items", []) if result.get("status") == "LIVE" else []
    if result.get("status") != "LIVE":
        return {
            "status": "UNAVAILABLE",
            "items": [],
            "source": result.get("source", ""),
            "error": result.get("error"),
        }
    if not (payload.state or payload.district or payload.keywords):
        return {"status": "NO_QUERY", "items": [], "source": result.get("source", "")}
    matches = filter_warnings(
        items,
        state=payload.state,
        district=payload.district,
        keywords=payload.keywords,
    )
    return {
        "status": "MATCHED" if matches else "NO_MATCH",
        "items": matches,
        "source": result.get("source", ""),
        "data_type": "OFFICIAL_WARNING",
    }


def _air_quality(payload: AirQualityInput) -> Dict[str, Any]:
    from ..services.air_quality import get_air_quality

    return {
        "air_quality": get_air_quality(payload.lat, payload.lon),
        "source": "Open-Meteo Air Quality",
        "data_type": "MODELED",
        "location": payload.place,
    }


def _model_comparison(payload: ModelComparisonInput) -> Dict[str, Any]:
    from ..services.weather import get_weather

    allowed = {"gfs", "ecmwf", "icon", "auto"}
    rows = []
    for model in payload.models[:4]:
        name = model.lower().strip()
        if name not in allowed:
            rows.append({"model": model, "ok": False, "error": "UNSUPPORTED_MODEL"})
            continue
        try:
            data = get_weather(
                payload.lat, payload.lon, payload.place, payload.state, name
            )
            rain = data.hourly[0].rain_prob if data.hourly else None
            rows.append(
                {
                    "model": name,
                    "ok": True,
                    "temp_c": data.current_temp,
                    "rain_prob": rain,
                    "wind_kmh": data.wind_speed,
                    "status": data.status,
                }
            )
        except Exception as exc:
            rows.append({"model": name, "ok": False, "error": type(exc).__name__})
    return {
        "models": rows,
        "source": "Open-Meteo model endpoints",
        "data_type": "MODEL_FORECAST",
        "disclaimer": "Models are shown side by side, not ranked for accuracy.",
    }


def _provider_health(payload: ProviderHealthInput) -> Dict[str, Any]:
    from ..services.llm import health_check, provider_status

    status = provider_status(check_live=False)
    result = dict(status)
    if payload.live:
        result["live_health"] = health_check(payload.provider)
    return result


TOOLS: Dict[str, ToolSpec] = {
    "get_current_weather": ToolSpec(
        "get_current_weather",
        "Current conditions and forecast from the primary weather provider.",
        CurrentWeatherInput,
        _current_weather,
        15.0,
        "Open-Meteo",
    ),
    "get_official_warnings": ToolSpec(
        "get_official_warnings",
        "Official IMD district nowcast items, filtered by place or keyword.",
        OfficialWarningsInput,
        _official_warnings,
        8.0,
        "India Meteorological Department",
    ),
    "get_air_quality": ToolSpec(
        "get_air_quality",
        "Live air quality for coordinates.",
        AirQualityInput,
        _air_quality,
        8.0,
        "Open-Meteo Air Quality",
    ),
    "compare_weather_models": ToolSpec(
        "compare_weather_models",
        "Compare GFS, ECMWF and ICON values without ranking them.",
        ModelComparisonInput,
        _model_comparison,
        20.0,
        "Open-Meteo model endpoints",
    ),
    "get_provider_health": ToolSpec(
        "get_provider_health",
        "Configured/selected/active provider status; optional short live probe.",
        ProviderHealthInput,
        _provider_health,
        6.0,
        "WeatherGPT provider layer",
    ),
}


def get_tool(name: str) -> Optional[ToolSpec]:
    return TOOLS.get(name)


def list_registered_tools() -> List[Dict[str, Any]]:
    return [
        {
            "name": spec.name,
            "description": spec.description,
            "timeout_seconds": spec.timeout_seconds,
            "source": spec.source,
            "input_schema": spec.input_model.model_json_schema(),
        }
        for spec in TOOLS.values()
    ]
