"""Open-Meteo ensemble uncertainty service. Read-only, free, no credentials.

This module computes member spread from the public Open-Meteo Ensemble API.
It never presents spread as an official warning, a calibrated probability, or
an accuracy score. If the provider is unavailable the result is explicitly
UNAVAILABLE and no values are substituted.
"""

import datetime as _dt
import math
import re
from statistics import pstdev
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

from .cache import cached
from .http import http_get

ENSEMBLE_URL = "https://ensemble-api.open-meteo.com/v1/ensemble"
SOURCE = "Open-Meteo Ensemble API"
SOURCE_URL = "https://open-meteo.com/en/docs/ensemble-api"
MODELS = "gfs025,ecmwf_ifs025,icon_global"
TTL_SECONDS = 600
VARIABLE_RE = re.compile(r"^(temperature_2m|precipitation)(?:_member\d+)?(?:_(.+))?$")

MODEL_LABELS = {
    "ncep_gefs025": "NOAA GEFS 0.25°",
    "ecmwf_ifs025_ensemble": "ECMWF IFS025 ENS",
    "icon_global_eps": "DWD ICON Global EPS",
}

LIMITATIONS = [
    "Ensemble spread shows disagreement between model members, not forecast accuracy.",
    "Probability is the share of members exceeding 0.5 mm/h at this grid point.",
    "A point forecast cannot resolve local terrain, convective cells or street-level impacts.",
    "This is not an official IMD/NDMA warning and must not replace one.",
]


def _ist_now() -> str:
    now = _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=5, minutes=30)))
    return now.strftime("%d %b %Y, %H:%M IST")


def _label(model_id: str) -> str:
    return MODEL_LABELS.get(model_id, model_id.replace("_", " ").title())


def _finite(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return None


def _parse_hourly(
    hourly: Dict[str, Any],
) -> Tuple[Dict[str, Dict[str, List[List[Any]]]], List[str]]:
    """Group member series by model and variable.

    Open-Meteo names members either ``temperature_2m_member01_<model>`` or
    ``temperature_2m_<model>`` (control). A single-model request omits the
    model suffix entirely, so unsuffixed keys are attached to the primary
    model discovered in the same payload.
    """
    grouped: Dict[str, Dict[str, List[List[Any]]]] = {}
    unknown_suffixes: List[str] = []
    for key, series in hourly.items():
        if key == "time" or not isinstance(series, list):
            continue
        match = VARIABLE_RE.match(key)
        if not match:
            continue
        variable, suffix = match.group(1), match.group(2)
        model_id = suffix or "primary"
        if suffix and suffix not in MODEL_LABELS:
            unknown_suffixes.append(suffix)
        bucket = grouped.setdefault(
            model_id, {"temperature_2m": [], "precipitation": []}
        )
        bucket[variable].append([_finite(value) for value in series])
    return grouped, sorted(set(unknown_suffixes))


def _hourly_uncertainty(
    grouped: Dict[str, Dict[str, List[List[Any]]]],
    times: List[str],
) -> List[Dict[str, Any]]:
    temperatures = [
        series
        for model in grouped.values()
        for series in model.get("temperature_2m", [])
    ]
    precipitation = [
        series
        for model in grouped.values()
        for series in model.get("precipitation", [])
    ]
    rows: List[Dict[str, Any]] = []
    for index, timestamp in enumerate(times):
        temps = [
            series[index]
            for series in temperatures
            if index < len(series) and series[index] is not None
        ]
        rains = [
            series[index]
            for series in precipitation
            if index < len(series) and series[index] is not None
        ]
        row: Dict[str, Any] = {"time": timestamp}
        if temps:
            row["temperature_mean_c"] = round(sum(temps) / len(temps), 2)
            row["temperature_min_c"] = round(min(temps), 2)
            row["temperature_max_c"] = round(max(temps), 2)
            row["temperature_spread_c"] = round(max(temps) - min(temps), 2)
            if len(temps) >= 2:
                row["temperature_std_c"] = round(pstdev(temps), 2)
        if rains and len(rains) >= 5:
            wet = sum(1 for value in rains if value >= 0.5)
            row["precipitation_probability_pct"] = round(100 * wet / len(rains))
            row["precipitation_mean_mm"] = round(sum(rains) / len(rains), 2)
            row["precipitation_max_mm"] = round(max(rains), 2)
            row["ensemble_members"] = len(rains)
        rows.append(row)
    return rows


def _summary(
    rows: List[Dict[str, Any]], models: List[Dict[str, Any]]
) -> Dict[str, Any]:
    spreads = [
        (row["time"], row["temperature_spread_c"])
        for row in rows
        if isinstance(row.get("temperature_spread_c"), (int, float))
    ]
    rain = [
        (row["time"], row["precipitation_probability_pct"])
        for row in rows
        if isinstance(row.get("precipitation_probability_pct"), (int, float))
    ]
    spread_max = max(spreads, key=lambda item: item[1]) if spreads else (None, None)
    rain_max = max(rain, key=lambda item: item[1]) if rain else (None, None)
    return {
        "member_count": sum(model["members"] for model in models),
        "model_count": len(models),
        "temperature_spread_mean_c": (
            round(sum(value for _, value in spreads) / len(spreads), 2)
            if spreads
            else None
        ),
        "temperature_spread_max_c": spread_max[1],
        "temperature_spread_max_time": spread_max[0],
        "precipitation_probability_max_pct": rain_max[1],
        "precipitation_probability_max_time": rain_max[0],
    }


def _download(lat: float, lon: float, days: int) -> Dict[str, Any]:
    query = urlencode(
        {
            "latitude": round(lat, 3),
            "longitude": round(lon, 3),
            "hourly": "temperature_2m,precipitation",
            "models": MODELS,
            "forecast_days": days,
            "timezone": "Asia/Kolkata",
        }
    )
    response = http_get(f"{ENSEMBLE_URL}?{query}", timeout=12.0, retries=1)
    response.raise_for_status()
    return response.json()


def get_ensemble_forecast(lat: float, lon: float, days: int = 3) -> Dict[str, Any]:
    """Return compact member-spread rows for the next ``days`` days."""
    days = max(1, min(int(days), 7))

    def loader() -> Dict[str, Any]:
        data = _download(lat, lon, days)
        hourly = data.get("hourly") or {}
        times = hourly.get("time") or []
        grouped, unknown = _parse_hourly(hourly)
        models = []
        for model_id, bucket in grouped.items():
            members = max(
                len(bucket.get("temperature_2m", [])),
                len(bucket.get("precipitation", [])),
            )
            models.append(
                {
                    "id": model_id,
                    "label": _label(model_id),
                    "members": members,
                }
            )
        rows = _hourly_uncertainty(grouped, times)
        if not rows or not models:
            raise ValueError("ensemble payload contained no member series")
        return {
            "status": "LIVE",
            "source": SOURCE,
            "source_url": SOURCE_URL,
            "data_type": "ENSEMBLE_FORECAST",
            "data_kind": "FORECAST",
            "retrieved_at": _ist_now(),
            "timezone": data.get("timezone") or "Asia/Kolkata",
            "generationtime_ms": data.get("generationtime_ms"),
            "models": sorted(models, key=lambda item: item["label"]),
            "hours": rows,
            "summary": _summary(rows, models),
            "unknown_models": unknown,
            "limitations": list(LIMITATIONS),
        }

    key = f"ensemble:{round(lat, 3)}:{round(lon, 3)}:{days}"
    try:
        return cached(TTL_SECONDS, key, loader)
    except Exception as exc:  # provider/network/parse failure: fail closed
        return {
            "status": "UNAVAILABLE",
            "source": SOURCE,
            "source_url": SOURCE_URL,
            "data_type": "ENSEMBLE_FORECAST",
            "data_kind": "FORECAST",
            "retrieved_at": _ist_now(),
            "timezone": "Asia/Kolkata",
            "models": [],
            "hours": [],
            "summary": {},
            "error": type(exc).__name__,
            "limitations": list(LIMITATIONS),
        }
