"""Location-aware climate dashboard from one Open-Meteo Archive request.

Source: ERA5 reanalysis exposed by the Open-Meteo Historical Weather API.
Free, keyless, and deliberately labelled OBSERVED / REANALYSIS - never a
forecast or a climate projection. Aggregations are computed here so the
browser does not need a charting package or a per-month request loop.
"""

from __future__ import annotations

import calendar
import datetime as dt
from typing import Any, Dict, Iterable, List, Optional

from .cache import cached
from .http import http_get

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
SOURCE_URL = "https://open-meteo.com/en/docs/historical-weather-api"
DATA_TYPE = "OBSERVED / REANALYSIS (ERA5 via Open-Meteo Archive)"
SOURCE = "Open-Meteo Historical Weather API (ERA5)"
UNITS = {"temperature": "degC", "rainfall": "mm", "count": "days"}

MONTH_NAMES = list(calendar.month_abbr)[1:]
SEASONS = [
    ("winter", "Winter (Jan-Feb)", [1, 2]),
    ("premonsoon", "Pre-monsoon (Mar-May)", [3, 4, 5]),
    ("monsoon", "Southwest monsoon (Jun-Sep)", [6, 7, 8, 9]),
    ("postmonsoon", "Post-monsoon (Oct-Dec)", [10, 11, 12]),
]


def _num(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _mean(values: Iterable[Optional[float]]) -> Optional[float]:
    clean = [v for v in values if v is not None]
    return round(sum(clean) / len(clean), 2) if clean else None


def _sum(values: Iterable[Optional[float]]) -> float:
    return round(sum(v for v in values if v is not None), 2)


def _pct(part: Optional[float], whole: Optional[float]) -> Optional[float]:
    if part is None or whole in (None, 0):
        return None
    return round((part - whole) / whole * 100, 1)


def _streak(records: List[dict], key: str, predicate) -> int:
    best = run = 0
    for rec in records:
        value = rec.get(key)
        if value is not None and predicate(value):
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def _aggregate(records: List[dict]) -> dict:
    """Aggregate daily records without filling missing values."""
    tmax = [r["tmax"] for r in records if r.get("tmax") is not None]
    tmin = [r["tmin"] for r in records if r.get("tmin") is not None]
    means = [
        (r["tmax"] + r["tmin"]) / 2
        for r in records
        if r.get("tmax") is not None and r.get("tmin") is not None
    ]
    rain = [r["rain"] for r in records if r.get("rain") is not None]
    expected = len(records)
    return {
        "days": expected,
        "temp_coverage_pct": round(len(means) / expected * 100, 1)
        if expected
        else None,
        "rain_coverage_pct": round(len(rain) / expected * 100, 1) if expected else None,
        "mean_max_c": _mean(tmax),
        "mean_min_c": _mean(tmin),
        "mean_c": _mean(means),
        "total_rain_mm": _sum(rain) if rain else None,
        "wet_days_ge2_5mm": sum(1 for v in rain if v >= 2.5),
        "heavy_rain_days_ge64_5mm": sum(1 for v in rain if v >= 64.5),
        "dry_days_lt1mm": sum(1 for v in rain if v < 1.0),
        "hot_days_ge40c": sum(1 for v in tmax if v >= 40.0),
        "warm_nights_ge25c": sum(1 for v in tmin if v >= 25.0),
        "max_daily_rain_mm": round(max(rain), 2) if rain else None,
        "max_consecutive_dry_days": _streak(records, "rain", lambda v: v < 1.0),
        "max_consecutive_wet_days": _streak(records, "rain", lambda v: v >= 2.5),
    }


def _fetch_daily(
    lat: float, lon: float, start: dt.date, end: dt.date
) -> tuple[List[dict], dict]:
    url = (
        f"{ARCHIVE_URL}?latitude={lat}&longitude={lon}"
        f"&start_date={start.isoformat()}&end_date={end.isoformat()}"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
        "&models=era5&timezone=Asia%2FKolkata"
    )
    # One bounded request. No retry loop: a slow provider must fail honestly
    # within the page's timeout instead of multiplying the wait.
    response = http_get(url, timeout=28, retries=0)
    if response.status_code != 200:
        raise RuntimeError(f"Open-Meteo Archive returned HTTP {response.status_code}")
    payload = response.json()
    daily = payload.get("daily") or {}
    dates = daily.get("time") or []
    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []
    rain = daily.get("precipitation_sum") or []
    if not dates:
        raise RuntimeError("Open-Meteo Archive returned no daily records")
    records: List[dict] = []
    for i, day in enumerate(dates):
        records.append(
            {
                "date": day,
                "year": int(day[:4]),
                "month": int(day[5:7]),
                "day": int(day[8:10]),
                "tmax": _num(tmax[i]) if i < len(tmax) else None,
                "tmin": _num(tmin[i]) if i < len(tmin) else None,
                "rain": _num(rain[i]) if i < len(rain) else None,
            }
        )
    meta = {
        "latitude": payload.get("latitude", lat),
        "longitude": payload.get("longitude", lon),
        "elevation_m": payload.get("elevation"),
        "timezone": payload.get("timezone", "Asia/Kolkata"),
        "provider_units": payload.get("daily_units") or {},
        "provider_generation_ms": payload.get("generationtime_ms"),
    }
    return records, meta


def _annual(records: List[dict]) -> List[dict]:
    by_year: Dict[int, List[dict]] = {}
    for rec in records:
        by_year.setdefault(rec["year"], []).append(rec)
    out = []
    for year in sorted(by_year):
        agg = _aggregate(by_year[year])
        out.append({"year": year, **agg})
    return out


def _monthly(records: List[dict], year: int) -> List[dict]:
    by_month: Dict[int, List[dict]] = {}
    for rec in records:
        if rec["year"] == year:
            by_month.setdefault(rec["month"], []).append(rec)
    out = []
    for month in range(1, 13):
        recs = by_month.get(month, [])
        agg = _aggregate(recs) if recs else {}
        out.append(
            {
                "month": month,
                "label": MONTH_NAMES[month - 1],
                **agg,
                "available": bool(recs and agg.get("temp_coverage_pct")),
            }
        )
    return out


def _monthly_baseline(records: List[dict], baseline_years: List[int]) -> List[dict]:
    per_month: Dict[int, List[dict]] = {m: [] for m in range(1, 13)}
    for year in baseline_years:
        for row in _monthly(records, year):
            # Only complete-enough months contribute to a climatological mean.
            if row.get("temp_coverage_pct") and row["temp_coverage_pct"] >= 80:
                per_month[row["month"]].append(row)
    out = []
    for month in range(1, 13):
        rows = per_month[month]
        out.append(
            {
                "month": month,
                "label": MONTH_NAMES[month - 1],
                "years_used": len(rows),
                "mean_max_c": _mean(r.get("mean_max_c") for r in rows),
                "mean_min_c": _mean(r.get("mean_min_c") for r in rows),
                "mean_c": _mean(r.get("mean_c") for r in rows),
                "total_rain_mm": _mean(r.get("total_rain_mm") for r in rows),
                "wet_days_ge2_5mm": _mean(r.get("wet_days_ge2_5mm") for r in rows),
                "heavy_rain_days_ge64_5mm": _mean(
                    r.get("heavy_rain_days_ge64_5mm") for r in rows
                ),
            }
        )
    return out


def _season_rows(records: List[dict], years: List[int]) -> Dict[str, List[dict]]:
    out: Dict[str, List[dict]] = {}
    for key, _label, months in SEASONS:
        rows = []
        for year in years:
            recs = [r for r in records if r["year"] == year and r["month"] in months]
            if recs:
                rows.append({"year": year, **_aggregate(recs)})
        out[key] = rows
    return out


def _mean_field(rows: List[dict], field: str) -> Optional[float]:
    return _mean(r.get(field) for r in rows)


def _trend(points: List[tuple[int, float]]) -> dict:
    n = len(points)
    if n < 3:
        return {"slope_per_decade": None, "r2": None, "n_years": n}
    sx = sum(x for x, _ in points)
    sy = sum(y for _, y in points)
    sxx = sum(x * x for x, _ in points)
    sxy = sum(x * y for x, y in points)
    denom = n * sxx - sx * sx
    if denom == 0:
        return {"slope_per_decade": None, "r2": None, "n_years": n}
    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in points)
    mean_y = sy / n
    ss_tot = sum((y - mean_y) ** 2 for _, y in points)
    return {
        "slope_per_decade": round(slope * 10, 3),
        "r2": round(1 - ss_res / ss_tot, 3) if ss_tot else None,
        "n_years": n,
    }


def _insights(
    annual: List[dict],
    monthly: List[dict],
    baseline_monthly: List[dict],
    selected_year: int,
    baseline_years: List[int],
    trend: dict,
    coverage: dict,
    rain_trend: dict,
) -> List[dict]:
    out: List[dict] = []
    current = next((r for r in annual if r["year"] == selected_year), None)
    base_years = [r for r in annual if r["year"] in baseline_years]
    base_temp = _mean_field(base_years, "mean_c")
    base_rain = _mean_field(base_years, "total_rain_mm")
    if current and current.get("mean_c") is not None and base_temp is not None:
        delta = round(current["mean_c"] - base_temp, 2)
        direction = "warmer" if delta > 0 else "cooler" if delta < 0 else "near"
        out.append(
            {
                "type": "temperature",
                "title": f"{selected_year} annual mean was {abs(delta):.2f} degC {direction} than baseline",
                "text": f"Annual mean {current['mean_c']:.2f} degC versus the {baseline_years[0]}-{baseline_years[-1]} mean of {base_temp:.2f} degC.",
                "period": str(selected_year),
                "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
            }
        )
    if (
        current
        and current.get("total_rain_mm") is not None
        and base_rain not in (None, 0)
    ):
        delta = round(current["total_rain_mm"] - base_rain, 1)
        pct = _pct(current["total_rain_mm"], base_rain)
        direction = "above" if delta > 0 else "below" if delta < 0 else "near"
        out.append(
            {
                "type": "rainfall",
                "title": f"{selected_year} rainfall was {direction} the baseline",
                "text": f"{current['total_rain_mm']:.1f} mm versus the baseline mean of {base_rain:.1f} mm ({pct:+.1f}%).",
                "period": str(selected_year),
                "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
            }
        )
    if monthly and any(m.get("available") for m in monthly):
        warm = max(
            (m for m in monthly if m.get("mean_max_c") is not None),
            key=lambda m: m["mean_max_c"],
        )
        base_row = next(
            (b for b in baseline_monthly if b["month"] == warm["month"]), {}
        )
        delta = None
        if base_row.get("mean_max_c") is not None:
            delta = round(warm["mean_max_c"] - base_row["mean_max_c"], 2)
        if delta is not None:
            out.append(
                {
                    "type": "seasonality",
                    "title": f"{warm['label']} was the warmest month by mean maximum",
                    "text": f"{warm['mean_max_c']:.1f} degC, {abs(delta):.1f} degC {'above' if delta >= 0 else 'below'} the {warm['label']} baseline mean maximum.",
                    "period": f"{warm['label']} {selected_year}",
                    "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
                }
            )
    if current and current.get("wet_days_ge2_5mm") is not None:
        base_wet = _mean_field(base_years, "wet_days_ge2_5mm")
        if base_wet is not None:
            diff = current["wet_days_ge2_5mm"] - base_wet
            out.append(
                {
                    "type": "wet-days",
                    "title": f"{abs(diff):.1f} {'more' if diff >= 0 else 'fewer'} wet days than baseline",
                    "text": f"{current['wet_days_ge2_5mm']} days with >=2.5 mm versus a baseline mean of {base_wet:.1f} days.",
                    "period": str(selected_year),
                    "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
                }
            )
    if trend.get("slope_per_decade") is not None:
        slope = trend["slope_per_decade"]
        out.append(
            {
                "type": "trend",
                "title": f"Annual mean temperature trend {slope:+.2f} degC/decade",
                "text": f"Linear regression over {trend['n_years']} complete years. This is a local observed trend, not attribution or a forecast.",
                "period": f"{annual[0]['year']}-{annual[-1]['year']}",
                "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
            }
        )
    if (
        coverage.get("temp_coverage_pct") is not None
        and coverage["temp_coverage_pct"] < 95
    ):
        out.append(
            {
                "type": "coverage",
                "title": "Historical coverage is incomplete",
                "text": f"Only {coverage['temp_coverage_pct']:.1f}% of requested days have paired temperature values; totals exclude missing days.",
                "period": f"{coverage['start']}-{coverage['end']}",
                "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
            }
        )
    if rain_trend.get("slope_per_decade") is not None:
        out.append(
            {
                "type": "rain-trend",
                "title": f"Annual rainfall trend {rain_trend['slope_per_decade']:+.1f} mm/decade",
                "text": "Linear regression on annual totals. Rainfall is highly variable, so the slope is context rather than proof of a long-term shift.",
                "period": f"{annual[0]['year']}-{annual[-1]['year']}",
                "baseline": f"{baseline_years[0]}-{baseline_years[-1]}",
            }
        )
    return out


def climate_dashboard(
    lat: float,
    lon: float,
    place: str,
    state: str,
    year: Optional[int] = None,
    baseline_start: int = 1991,
    baseline_end: int = 2020,
    start_year: int = 1991,
) -> Dict[str, Any]:
    today = dt.date.today()
    last_complete = today.year - 1
    year = max(1950, min(last_complete, year or last_complete))
    end = year
    start_year = max(1950, min(start_year, end))
    baseline_start = max(start_year, min(baseline_start, end))
    baseline_end = max(baseline_start + 1, min(baseline_end, end))
    if baseline_end > end:
        baseline_end = end
    cache_key = f"climatedash:{round(lat, 2)}:{round(lon, 2)}:{start_year}:{end}:{baseline_start}:{baseline_end}"
    return cached(
        86400,
        cache_key,
        lambda: _build(
            lat, lon, place, state, start_year, end, year, baseline_start, baseline_end
        ),
    )


def _build(
    lat: float,
    lon: float,
    place: str,
    state: str,
    start_year: int,
    end_year: int,
    year: int,
    baseline_start: int,
    baseline_end: int,
) -> Dict[str, Any]:
    start = dt.date(start_year, 1, 1)
    end = dt.date(end_year, 12, 31)
    records, meta = _fetch_daily(lat, lon, start, end)
    annual = _annual(records)
    if not annual:
        raise RuntimeError("Archive returned no usable annual aggregates")
    baseline_years = list(range(baseline_start, baseline_end + 1))
    baseline_annual = [r for r in annual if r["year"] in baseline_years]
    if not baseline_annual:
        raise RuntimeError("Baseline period has no usable years")
    monthly = _monthly(records, year)
    baseline_monthly = _monthly_baseline(records, baseline_years)
    seasons_current = _season_rows(records, [year])
    seasons_baseline = _season_rows(records, baseline_years)
    season_rows = []
    for key, label, months in SEASONS:
        cur = seasons_current.get(key) or []
        base = seasons_baseline.get(key) or []
        cur_row = cur[0] if cur else {}
        base_temp = _mean_field(base, "mean_c")
        base_rain = _mean_field(base, "total_rain_mm")
        season_rows.append(
            {
                "id": key,
                "label": label,
                "months": [MONTH_NAMES[m - 1] for m in months],
                "current": cur_row,
                "baseline": {
                    "mean_c": base_temp,
                    "total_rain_mm": base_rain,
                    "wet_days_ge2_5mm": _mean_field(base, "wet_days_ge2_5mm"),
                    "heavy_rain_days_ge64_5mm": _mean_field(
                        base, "heavy_rain_days_ge64_5mm"
                    ),
                },
                "anomaly": {
                    "temp_c": round(cur_row["mean_c"] - base_temp, 2)
                    if cur_row.get("mean_c") is not None and base_temp is not None
                    else None,
                    "rain_mm": round(cur_row["total_rain_mm"] - base_rain, 1)
                    if cur_row.get("total_rain_mm") is not None
                    and base_rain is not None
                    else None,
                    "rain_pct": _pct(cur_row.get("total_rain_mm"), base_rain),
                },
            }
        )
    temp_points = [
        (r["year"], r["mean_c"]) for r in annual if r.get("mean_c") is not None
    ]
    rain_points = [
        (r["year"], r["total_rain_mm"])
        for r in annual
        if r.get("total_rain_mm") is not None
    ]
    temp_trend = _trend(temp_points)
    rain_trend = _trend(rain_points)
    base_temp = _mean_field(baseline_annual, "mean_c")
    base_rain = _mean_field(baseline_annual, "total_rain_mm")
    current = next((r for r in annual if r["year"] == year), None) or {}
    rain_trend["pct_per_decade"] = (
        round(rain_trend["slope_per_decade"] / base_rain * 100, 2)
        if rain_trend.get("slope_per_decade") is not None and base_rain not in (None, 0)
        else None
    )
    total_days = len(records)
    coverage = {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "days": total_days,
        "temp_days": sum(
            1 for r in records if r["tmax"] is not None and r["tmin"] is not None
        ),
        "rain_days": sum(1 for r in records if r["rain"] is not None),
        "temp_coverage_pct": round(
            sum(1 for r in records if r["tmax"] is not None and r["tmin"] is not None)
            / total_days
            * 100,
            1,
        )
        if total_days
        else None,
        "rain_coverage_pct": round(
            sum(1 for r in records if r["rain"] is not None) / total_days * 100, 1
        )
        if total_days
        else None,
    }
    extremes = {
        "definitions": {
            "hot_day": "Daily maximum >= 40 degC (descriptive threshold, not an official heatwave declaration).",
            "warm_night": "Daily minimum >= 25 degC.",
            "heavy_rain_day": "Daily precipitation >= 64.5 mm, the lower bound of IMD's heavy-rain category; reanalysis grid value, not an official station observation.",
            "wet_day": "Daily precipitation >= 2.5 mm.",
            "dry_day": "Daily precipitation < 1.0 mm.",
        },
        "current": current,
        "baseline": {
            "hot_days_ge40c": _mean_field(baseline_annual, "hot_days_ge40c"),
            "warm_nights_ge25c": _mean_field(baseline_annual, "warm_nights_ge25c"),
            "heavy_rain_days_ge64_5mm": _mean_field(
                baseline_annual, "heavy_rain_days_ge64_5mm"
            ),
            "wet_days_ge2_5mm": _mean_field(baseline_annual, "wet_days_ge2_5mm"),
            "max_consecutive_dry_days": _mean_field(
                baseline_annual, "max_consecutive_dry_days"
            ),
            "max_daily_rain_mm": _mean_field(baseline_annual, "max_daily_rain_mm"),
        },
    }
    anomalies = {
        "annual": {
            "temp_c": round(current["mean_c"] - base_temp, 2)
            if current.get("mean_c") is not None and base_temp is not None
            else None,
            "rain_mm": round(current["total_rain_mm"] - base_rain, 1)
            if current.get("total_rain_mm") is not None and base_rain is not None
            else None,
            "rain_pct": _pct(current.get("total_rain_mm"), base_rain),
        },
        "monthly": [
            {
                "month": m["month"],
                "label": m["label"],
                "temp_c": round(m["mean_c"] - b["mean_c"], 2)
                if m.get("mean_c") is not None and b.get("mean_c") is not None
                else None,
                "rain_mm": round(m["total_rain_mm"] - b["total_rain_mm"], 1)
                if m.get("total_rain_mm") is not None
                and b.get("total_rain_mm") is not None
                else None,
                "rain_pct": _pct(m.get("total_rain_mm"), b.get("total_rain_mm")),
                "current": m,
                "baseline": b,
            }
            for m, b in zip(monthly, baseline_monthly)
        ],
        "seasons": season_rows,
        "baseline": {
            "start_year": baseline_start,
            "end_year": baseline_end,
            "mean_c": base_temp,
            "total_rain_mm": base_rain,
        },
    }
    listed = _insights(
        annual,
        monthly,
        baseline_monthly,
        year,
        baseline_years,
        temp_trend,
        coverage,
        rain_trend,
    )
    calendar_rows = [
        {"date": r["date"], "tmax": r["tmax"], "tmin": r["tmin"], "rain": r["rain"]}
        for r in records
        if r["year"] == year
    ]
    return {
        "location": place,
        "state": state,
        "lat": lat,
        "lon": lon,
        "year": year,
        "period": {
            "start_year": start_year,
            "end_year": end_year,
            "label": f"{start_year}-{end_year}",
        },
        "baseline": {
            "start_year": baseline_start,
            "end_year": baseline_end,
            "label": f"{baseline_start}-{baseline_end}",
        },
        "annual": annual,
        "monthly": monthly,
        "monthly_baseline": baseline_monthly,
        "seasons": season_rows,
        "anomalies": anomalies,
        "extremes": extremes,
        "calendar": calendar_rows,
        "trend": {"temperature": temp_trend, "rainfall": rain_trend},
        "insights": listed,
        "coverage": coverage,
        "units": UNITS,
        "data_type": DATA_TYPE,
        "status": "HISTORICAL",
        "source": SOURCE,
        "source_url": SOURCE_URL,
        "provider": meta,
        "retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "methodology": {
            "baseline": "Arithmetic mean of annual/monthly aggregates over complete baseline years; monthly climatology requires >=80% daily temperature coverage in a month.",
            "trend": "Ordinary least-squares linear regression on annual values; slope multiplied by 10 for per-decade units. R-squared is descriptive, not attribution.",
            "rainfall": "Totals sum available daily precipitation; missing days are not filled. Coverage is reported separately.",
            "seasons": "Calendar-year seasons. Winter covers Jan-Feb only; December is not carried across years.",
        },
        "projection_note": "No projection series is included in this response. Historical ERA5 reanalysis is not a climate projection. For authoritative scenarios see Copernicus CDS, World Bank CCKP or IPCC.",
    }
