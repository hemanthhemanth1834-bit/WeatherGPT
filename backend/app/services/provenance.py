"""Provenance envelopes for assistant answers.

The goal is simple: a reader should always be able to tell where a number came
from, whether it is an observation or model output, when it is valid, and what
the answer cannot tell them. Provenance is additive so existing API consumers
continue to work.

Only sources in this module's allowlist receive a clickable URL. That prevents
a model (or a future tool) from injecting an arbitrary citation.
"""

import datetime as _dt
from typing import Any, Dict, Iterable, List, Optional

from .taxonomy import canonical_kind

SOURCE_URLS = {
    "Open-Meteo": "https://open-meteo.com/",
    "Open-Meteo Air Quality": "https://open-meteo.com/en/docs/air-quality-api",
    "Open-Meteo NWP blend (GFS + ICON + ECMWF HRES)": "https://open-meteo.com/en/docs",
    "Open-Meteo model endpoints": "https://open-meteo.com/en/docs",
    "Open-Meteo Ensemble API": "https://open-meteo.com/en/docs/ensemble-api",
    "India Meteorological Department": "https://mausam.imd.gov.in/",
    "IMD district nowcast RSS": "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php",
    "WeatherGPT Risk Engine": "/api/risk/assess",
    "WeatherGPT computed alerts": "/api/alerts/active",
}

FRESHNESS_VALUES = ("FRESH", "DELAYED", "STALE", "UNKNOWN", "UNAVAILABLE")


def _source_entry(name: str, source_type: str = "PROVIDER") -> Dict[str, Any]:
    return {
        "name": name,
        "url": SOURCE_URLS.get(name),
        "type": source_type,
    }


def _age_minutes(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    cleaned = str(value).replace(" IST", "").replace("Z", "+00:00")
    for parser in (
        lambda v: _dt.datetime.fromisoformat(v),
        lambda v: _dt.datetime.strptime(v, "%d %b %Y, %H:%M"),
        lambda v: _dt.datetime.strptime(v, "%Y-%m-%d %H:%M"),
    ):
        try:
            stamp = parser(cleaned)
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=_dt.timezone.utc)
            return max(
                0,
                int((_dt.datetime.now(_dt.timezone.utc) - stamp).total_seconds() / 60),
            )
        except (ValueError, TypeError):
            continue
    return None


def infer_freshness(updated_at: Optional[str], status: Optional[str] = None) -> str:
    if status and str(status).upper() in ("UNAVAILABLE", "ERROR"):
        return "UNAVAILABLE"
    minutes = _age_minutes(updated_at)
    if minutes is None:
        return "UNKNOWN"
    if minutes <= 90:
        return "FRESH"
    if minutes <= 360:
        return "DELAYED"
    return "STALE"


def infer_data_type(weather: Any) -> str:
    declared = str(getattr(weather, "data_type", "") or "").upper()
    if "OBSERV" in declared:
        return "OBSERVATION"
    if "REANALYSIS" in declared:
        return "REANALYSIS"
    if "HISTOR" in declared:
        return "HISTORICAL"
    if "FORECAST" in declared or declared in ("LIVE", ""):
        return "MODEL_FORECAST"
    return declared or "MODEL_FORECAST"


def _weather_limitations(weather: Any) -> List[str]:
    limits: List[str] = []
    if infer_data_type(weather) == "MODEL_FORECAST":
        limits.append("Forecast values are model output, not direct observations.")
    if getattr(weather, "aqi", None) is not None:
        source = str(getattr(weather, "aqi_source", "") or "")
        if "Air Quality" in source:
            limits.append("AQI is a modelled CAMS product, not a station measurement.")
        else:
            limits.append(
                "AQI is an estimate because a live air-quality source was unavailable."
            )
    if getattr(weather, "uv_index_source", ""):
        source = str(getattr(weather, "uv_index_source", ""))
        if "estimate" in source.lower():
            limits.append(
                "UV index is estimated because the provider did not supply it."
            )
    if getattr(weather, "visibility_source", ""):
        source = str(getattr(weather, "visibility_source", ""))
        if "estimate" in source.lower():
            limits.append(
                "Visibility is estimated because the provider did not supply it."
            )
    return limits


def build_weather_provenance(
    weather: Any,
    *,
    source: Optional[str] = None,
    data_type: Optional[str] = None,
    model: Optional[str] = None,
    valid_time: Optional[str] = None,
    retrieved_at: Optional[str] = None,
    freshness: Optional[str] = None,
    limitations: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Build a serialisable provenance object from a WeatherData instance."""
    source_name = source or str(getattr(weather, "data_source", "") or "Open-Meteo")
    source_type = (
        "OFFICIAL" if "Meteorological Department" in source_name else "PROVIDER"
    )
    resolved_type = (data_type or infer_data_type(weather)).upper()
    resolved_freshness = (
        freshness
        or infer_freshness(
            retrieved_at or getattr(weather, "updated_at_ist", None),
            getattr(weather, "status", None),
        )
    ).upper()
    if resolved_freshness not in FRESHNESS_VALUES:
        resolved_freshness = "UNKNOWN"

    limits = _weather_limitations(weather)
    for extra in limitations or []:
        if extra and extra not in limits:
            limits.append(str(extra))

    missing = []
    for field in (
        "current_temp",
        "humidity",
        "wind_speed",
        "precipitation",
        "pressure",
    ):
        if getattr(weather, field, None) is None:
            missing.append(field)

    location = str(getattr(weather, "location", "") or "")
    state = str(getattr(weather, "state", "") or "")
    return {
        "source": _source_entry(source_name, source_type),
        "sources": [_source_entry(source_name, source_type)],
        "data_type": resolved_type,
        "data_kind": canonical_kind(resolved_type),
        "units": "metric",
        "methodology": (
            "Provider model output classified as a forecast."
            if canonical_kind(resolved_type) == "FORECAST"
            else "Provider values classified without upgrading their source type."
        ),
        "model": model or getattr(weather, "nwp_model", None),
        "valid_time": valid_time or getattr(weather, "updated_at_ist", None),
        "retrieved_at": retrieved_at or getattr(weather, "updated_at_ist", None),
        "freshness": resolved_freshness,
        "limitations": limits,
        "location": ", ".join(part for part in (location, state) if part),
        "coordinates": {
            "lat": getattr(weather, "lat", None),
            "lon": getattr(weather, "lon", None),
        },
        "confidence": getattr(weather, "confidence", None),
        "missing_fields": missing,
    }


def computed_provenance(
    name: str,
    *,
    data_type: str = "DERIVED",
    limitations: Optional[Iterable[str]] = None,
    source_type: str = "COMPUTED",
) -> Dict[str, Any]:
    """Provenance for a value WeatherGPT calculated itself."""
    entry = _source_entry(name, source_type)
    return {
        "source": entry,
        "sources": [entry],
        "data_type": data_type,
        "data_kind": canonical_kind(data_type),
        "units": "metric",
        "methodology": "Derived by WeatherGPT rules from the stated inputs.",
        "model": None,
        "valid_time": None,
        "retrieved_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "freshness": "FRESH",
        "limitations": list(limitations or []),
        "location": None,
        "coordinates": None,
        "confidence": None,
        "missing_fields": [],
    }


def official_provenance(
    source_name: str = "India Meteorological Department",
) -> Dict[str, Any]:
    entry = _source_entry(source_name, "OFFICIAL")
    return {
        "source": entry,
        "sources": [entry],
        "data_type": "OFFICIAL_WARNING",
        "data_kind": "OFFICIAL",
        "units": "not_applicable",
        "methodology": "Published bulletin reproduced as issued; not reinterpreted.",
        "model": None,
        "valid_time": None,
        "retrieved_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "freshness": "FRESH",
        "limitations": [
            "Official bulletin text is reproduced as published; WeatherGPT does not reinterpret it.",
        ],
        "location": None,
        "coordinates": None,
        "confidence": None,
        "missing_fields": [],
    }
