"""Observed historical daily means via the Open-Meteo Archive API (ERA5).

Free, no key. Labelled OBSERVED (reanalysis), with location + period.
"""
from typing import Any, Dict, List

import requests

from .cache import cached


def climate_history(lat: float, lon: float, place: str, state: str,
                    years: int = 5) -> Dict[str, Any]:
    """Yearly monsoon-season + annual means for the past N full years."""
    years = max(1, min(10, years))
    return cached(86400, f"hist:{round(lat, 2)}:{round(lon, 2)}:{years}",
                  lambda: _download(lat, lon, place, state, years))


def _download(lat: float, lon: float, place: str, state: str, years: int) -> Dict[str, Any]:
    import datetime as dt
    current_year = dt.date.today().year
    span = list(range(current_year - years, current_year))
    series: List[Dict[str, Any]] = []
    for year in span:
        url = ("https://archive-api.open-meteo.com/v1/archive"
               f"?latitude={lat}&longitude={lon}"
               f"&start_date={year}-01-01&end_date={year}-12-31"
               "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
               "&timezone=Asia%2FKolkata")
        try:
            response = requests.get(url, timeout=12)
            if response.status_code != 200:
                continue
            daily = response.json().get("daily", {})
            tmax = [t for t in (daily.get("temperature_2m_max") or []) if t is not None]
            tmin = [t for t in (daily.get("temperature_2m_min") or []) if t is not None]
            rain = [r for r in (daily.get("precipitation_sum") or []) if r is not None]
            if not tmax:
                continue
            hot_days = sum(1 for t in tmax if t >= 40)
            wet_days = sum(1 for r in rain if r >= 2.5)
            series.append({
                "year": year,
                "mean_max_c": round(sum(tmax) / len(tmax), 1),
                "mean_min_c": round(sum(tmin) / len(tmin), 1) if tmin else None,
                "total_rain_mm": round(sum(rain), 1),
                "hot_days_ge40c": hot_days,
                "wet_days_ge25mm": wet_days,
            })
        except Exception:
            continue
    if not series:
        raise RuntimeError("Archive upstream returned no usable years")
    return {
        "location": place,
        "state": state,
        "period": f"{series[0]['year']}–{series[-1]['year']}",
        "years": series,
        "data_type": "OBSERVED (ERA5 reanalysis via Open-Meteo Archive)",
        "status": "LIVE",
        "source": "Open-Meteo Archive API",
    }
