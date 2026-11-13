import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CloudRain,
  Database,
  Download,
  ExternalLink,
  Flame,
  Info,
  MapPin,
  RefreshCw,
  Search,
  Thermometer,
  TrendingUp,
} from "lucide-react";
import { fetchClimateDashboard } from "../services/api";
import { download, toCSV } from "../services/exportData";
import { gibsDate, gibsWms } from "../services/gibs";
import LiveImagery from "./LiveImagery";
import "./ClimateAnalytics.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BASELINES = [
  { id: "1991-2020", start: 1991, end: 2020, label: "1991–2020 · 30 years" },
  { id: "2001-2020", start: 2001, end: 2020, label: "2001–2020 · 20 years" },
  { id: "2011-2020", start: 2011, end: 2020, label: "2011–2020 · 10 years" },
];
const TEMP_METRICS = [
  { id: "mean_c", label: "Mean" },
  { id: "mean_max_c", label: "Mean max" },
  { id: "mean_min_c", label: "Mean min" },
];

const n = (value) => (value == null || Number.isNaN(Number(value)) ? null : Number(value));
const fmt = (value, digits = 1, suffix = "") => {
  const number = n(value);
  return number == null ? "—" : `${number.toFixed(digits)}${suffix}`;
};
const signed = (value, digits = 1, suffix = "") => {
  const number = n(value);
  if (number == null) return "—";
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}${suffix}`;
};
const dateLabel = (date) => {
  if (!date) return "—";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};
const pathSafe = (value) => String(value || "location").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value) => Number.isFinite(Number(value));

function LineChart({ labels, series, unit, height = 280, reference = null }) {
  const gradientId = useId().replace(/:/g, "");
  const values = series.flatMap((item) => item.values.map(n)).filter((v) => v != null);
  if (reference) values.push(reference.value);
  if (!values.length) return <ChartEmpty />;
  const width = 820;
  const left = 48;
  const right = 22;
  const top = 24;
  const bottom = 34;
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = (max - min) * 0.14 || 1;
  min -= pad;
  max += pad;
  const x = (index) => left + (index / Math.max(1, labels.length - 1)) * (width - left - right);
  const y = (value) => top + ((max - value) / (max - min)) * (height - top - bottom);
  const ticks = Array.from({ length: 4 }, (_, index) => min + ((max - min) * index) / 3).reverse();
  const showEvery = Math.max(1, Math.ceil(labels.length / 8));
  return (
    <svg className="wg-climate-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${series.map((s) => s.label).join(", ")} in ${unit}`}>
      <defs>
        <linearGradient id={`${gradientId}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" stopOpacity=".22" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick, index) => (
        <g key={index}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="wg-climate-gridline" />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end" className="wg-climate-axis">
            {Math.round(tick)}
          </text>
        </g>
      ))}
      {reference && (
        <g>
          <line x1={left} x2={width - right} y1={y(reference.value)} y2={y(reference.value)} className="wg-climate-reference" />
          <text x={width - right} y={y(reference.value) - 6} textAnchor="end" className="wg-climate-reference-label">
            {reference.label}
          </text>
        </g>
      )}
      {series.map((item) => {
        let d = "";
        let open = false;
        item.values.forEach((raw, index) => {
          const value = n(raw);
          if (value == null) {
            open = false;
            return;
          }
          d += `${open ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)} `;
          open = true;
        });
        return <path key={item.key} d={d} fill="none" stroke={item.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {series.map((item) =>
        item.values.map((raw, index) => {
          const value = n(raw);
          if (value == null) return null;
          return (
            <circle key={`${item.key}-${index}`} cx={x(index)} cy={y(value)} r="3" fill={item.color} stroke="#07101f" strokeWidth="1.5">
              <title>{`${labels[index]} · ${item.label}: ${fmt(value, 1, ` ${unit}`)}`}</title>
            </circle>
          );
        })
      )}
      {labels.map((label, index) =>
        index % showEvery === 0 || index === labels.length - 1 ? (
          <text key={label} x={x(index)} y={height - 10} textAnchor="middle" className="wg-climate-axis">
            {label}
          </text>
        ) : null
      )}
    </svg>
  );
}

function BarChart({ rows, labelKey, series, unit, height = 280, reference = null }) {
  const width = 820;
  const left = 48;
  const right = 22;
  const top = 24;
  const bottom = 34;
  const all = rows.flatMap((row) => series.map((item) => n(row[item.key]))).filter((v) => v != null);
  if (reference) all.push(reference.value);
  if (!all.length) return <ChartEmpty />;
  const max = Math.max(...all, 1) * 1.12;
  const chartHeight = height - top - bottom;
  const groupWidth = (width - left - right) / Math.max(1, rows.length);
  const barWidth = Math.max(3, (groupWidth * 0.66) / series.length);
  const y = (value) => top + chartHeight - (value / max) * chartHeight;
  const ticks = [0, 0.33, 0.66, 1].map((fraction) => max * fraction);
  const showEvery = Math.max(1, Math.ceil(rows.length / 9));
  return (
    <svg className="wg-climate-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${series.map((s) => s.label).join(", ")} in ${unit}`}>
      {ticks.map((tick, index) => (
        <g key={index}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="wg-climate-gridline" />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end" className="wg-climate-axis">
            {Math.round(tick)}
          </text>
        </g>
      ))}
      {reference && (
        <g>
          <line x1={left} x2={width - right} y1={y(reference.value)} y2={y(reference.value)} className="wg-climate-reference" />
          <text x={width - right} y={y(reference.value) - 6} textAnchor="end" className="wg-climate-reference-label">
            {reference.label}
          </text>
        </g>
      )}
      {rows.map((row, index) => {
        const groupX = left + index * groupWidth;
        return (
          <g key={`${row[labelKey]}-${index}`}>
            {series.map((item, seriesIndex) => {
              const value = n(row[item.key]);
              if (value == null) return null;
              const x = groupX + groupWidth * 0.17 + seriesIndex * barWidth;
              return (
                <rect key={item.key} x={x} y={y(value)} width={barWidth - 1.5} height={Math.max(1, top + chartHeight - y(value))} rx="2" fill={item.color}>
                  <title>{`${row[labelKey]} · ${item.label}: ${fmt(value, 1, ` ${unit}`)}`}</title>
                </rect>
              );
            })}
            {index % showEvery === 0 || index === rows.length - 1 ? (
              <text x={groupX + groupWidth / 2} y={height - 10} textAnchor="middle" className="wg-climate-axis">
                {row[labelKey]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function AnomalyBars({ rows, labelKey, valueKey, unit }) {
  const values = rows.map((row) => n(row[valueKey])).filter((v) => v != null);
  if (!values.length) return <ChartEmpty />;
  const width = 820;
  const left = 48;
  const right = 22;
  const top = 24;
  const bottom = 34;
  const height = 250;
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v))) * 1.12;
  const chartHeight = height - top - bottom;
  const zero = top + chartHeight / 2;
  const groupWidth = (width - left - right) / Math.max(1, rows.length);
  const barWidth = Math.max(5, groupWidth * 0.58);
  const y = (value) => zero - (value / maxAbs) * (chartHeight / 2);
  const showEvery = Math.max(1, Math.ceil(rows.length / 10));
  return (
    <svg className="wg-climate-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Anomalies in ${unit}`}>
      <line x1={left} x2={width - right} y1={zero} y2={zero} className="wg-climate-zero" />
      <text x={left - 8} y={top + 4} textAnchor="end" className="wg-climate-axis">{`+${maxAbs.toFixed(1)}`}</text>
      <text x={left - 8} y={height - bottom} textAnchor="end" className="wg-climate-axis">{`-${maxAbs.toFixed(1)}`}</text>
      {rows.map((row, index) => {
        const value = n(row[valueKey]);
        if (value == null) return null;
        const barTop = value >= 0 ? y(value) : zero;
        return (
          <rect
            key={`${row[labelKey]}-${index}`}
            x={left + index * groupWidth + (groupWidth - barWidth) / 2}
            y={barTop}
            width={barWidth}
            height={Math.max(1, Math.abs(zero - y(value)))}
            rx="2"
            fill={value >= 0 ? "#f97316" : "#38bdf8"}
          >
            <title>{`${row[labelKey]} · ${signed(value, 1, ` ${unit}`)}`}</title>
          </rect>
        );
      })}
      {rows.map((row, index) =>
        index % showEvery === 0 || index === rows.length - 1 ? (
          <text key={`label-${row[labelKey]}`} x={left + index * groupWidth + groupWidth / 2} y={height - 10} textAnchor="middle" className="wg-climate-axis">
            {row[labelKey]}
          </text>
        ) : null
      )}
    </svg>
  );
}

function ChartEmpty() {
  return <div className="wg-climate-chart-empty">No values available for this view.</div>;
}

function ChartLegend({ items }) {
  return (
    <div className="wg-climate-legend" aria-label="Chart legend">
      {items.map((item) => (
        <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>
      ))}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, unit, detail, tone = "" }) {
  return (
    <article className={`wg-climate-kpi ${tone}`}>
      <span className="wg-climate-kpi-icon"><Icon size={17} aria-hidden="true" /></span>
      <div>
        <span>{label}</span>
        <strong>{value}<small>{unit}</small></strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function SectionHead({ kicker, title, description, action = null }) {
  return (
    <header className="wg-climate-section-head">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

function heatColor(mode, day) {
  if (!day) return "rgba(148,163,184,.06)";
  if (mode === "rain") {
    const value = n(day.rain);
    if (value == null) return "rgba(148,163,184,.06)";
    if (value < 0.1) return "rgba(148,163,184,.15)";
    return `rgba(56,189,248,${0.22 + clamp(value / 80, 0, 1) * 0.75})`;
  }
  const value = n(day.tmax);
  if (value == null) return "rgba(148,163,184,.06)";
  const hue = 220 - clamp((value - 2) / 42, 0, 1) * 220;
  return `hsl(${hue} 82% 54%)`;
}

function ClimateHeatmap({ calendar, mode, year }) {
  const byDate = useMemo(() => {
    const map = new Map();
    (calendar || []).forEach((day) => map.set(day.date, day));
    return map;
  }, [calendar]);
  if (!calendar?.length) return <ChartEmpty />;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (!isLeap) daysInMonth[1] = 28;
  return (
    <div className="wg-climate-heatmap-wrap">
      <div className="wg-climate-heatmap" role="img" aria-label={`${mode === "rain" ? "Daily rainfall" : "Daily maximum temperature"} calendar for ${year}`}>
        {daysInMonth.map((count, monthIndex) => (
          <div className="wg-climate-heat-row" key={MONTHS[monthIndex]}>
            <span>{MONTHS[monthIndex]}</span>
            <div className="wg-climate-heat-cells">
              {Array.from({ length: 31 }, (_, dayIndex) => {
                const day = dayIndex < count ? byDate.get(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayIndex + 1).padStart(2, "0")}`) : null;
                const label = day
                  ? `${dateLabel(day.date)} · Tmax ${fmt(day.tmax, 1, "°C")} · Rain ${fmt(day.rain, 1, " mm")}`
                  : "";
                return (
                  <i
                    key={dayIndex}
                    title={label}
                    className={dayIndex < count ? "" : "outside"}
                    style={{ background: dayIndex < count ? heatColor(mode, day) : "transparent" }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="wg-climate-heat-legend">
        <span>{mode === "rain" ? "dry" : "cooler"}</span>
        <i className="wg-climate-heat-gradient" />
        <span>{mode === "rain" ? "80 mm+" : "hotter"}</span>
        <small>Grey = no value / outside month</small>
      </div>
    </div>
  );
}

function sourceRows(data) {
  return [
    ["source", data.source],
    ["source_url", data.source_url],
    ["data_type", data.data_type],
    ["location", `${data.location}, ${data.state}`],
    ["coordinates", `${data.lat}, ${data.lon}`],
    ["baseline", data.baseline.label],
    ["period", data.period.label],
    ["retrieved_at", data.retrieved_at],
    ["timezone", data.provider?.timezone || "Asia/Kolkata"],
    ["units", "temperature=degC; rainfall=mm; counts=days"],
  ];
}

function downloadCsv(data, kind) {
  if (!data) return;
  let rows;
  if (kind === "annual") {
    rows = [
      ["year", "mean_max_c", "mean_min_c", "mean_c", "total_rain_mm", "hot_days_ge40c", "warm_nights_ge25c", "heavy_rain_days_ge64_5mm", "wet_days_ge2_5mm", "dry_days_lt1mm", "max_daily_rain_mm", "max_consecutive_dry_days", "temp_coverage_pct", "rain_coverage_pct"],
      ...data.annual.map((row) => [row.year, row.mean_max_c, row.mean_min_c, row.mean_c, row.total_rain_mm, row.hot_days_ge40c, row.warm_nights_ge25c, row.heavy_rain_days_ge64_5mm, row.wet_days_ge2_5mm, row.dry_days_lt1mm, row.max_daily_rain_mm, row.max_consecutive_dry_days, row.temp_coverage_pct, row.rain_coverage_pct]),
    ];
  } else if (kind === "monthly") {
    rows = [
      ["month", "mean_max_c", "mean_min_c", "mean_c", "total_rain_mm", "wet_days_ge2_5mm", "heavy_rain_days_ge64_5mm", "baseline_mean_c", "baseline_rain_mm"],
      ...data.monthly.map((row, index) => {
        const baseline = data.monthly_baseline[index] || {};
        return [row.label, row.mean_max_c, row.mean_min_c, row.mean_c, row.total_rain_mm, row.wet_days_ge2_5mm, row.heavy_rain_days_ge64_5mm, baseline.mean_c, baseline.total_rain_mm];
      }),
    ];
  } else {
    rows = [
      ["date", "tmax_c", "tmin_c", "rain_mm"],
      ...data.calendar.map((row) => [row.date, row.tmax, row.tmin, row.rain]),
    ];
  }
  rows.push([], ...sourceRows(data).map(([key, value]) => [`# ${key}`, value]));
  download(`weathergpt-climate-${pathSafe(data.location)}-${kind}.csv`, toCSV(rows), "text/csv");
}

export default function ClimateAnalytics({ onAsk, onSearch, initialLocation = "", savedPlaces = [] }) {
  const lastCompleteYear = new Date().getFullYear() - 1;
  const [activeLocation, setActiveLocation] = useState(initialLocation || "");
  const [query, setQuery] = useState(initialLocation || "");
  const [year, setYear] = useState(lastCompleteYear);
  const [baselineId, setBaselineId] = useState("1991-2020");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [tempMetric, setTempMetric] = useState("mean_c");
  const [rainView, setRainView] = useState("annual");
  const [heatMode, setHeatMode] = useState("temperature");
  const [anomalyMode, setAnomalyMode] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState("monsoon");
  const requestRef = useRef(0);
  const baseline = BASELINES.find((item) => item.id === baselineId) || BASELINES[0];

  useEffect(() => {
    if (!initialLocation) return;
    setActiveLocation(initialLocation);
    setQuery(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    if (!activeLocation) {
      setData(null);
      setLoading(false);
      return undefined;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    fetchClimateDashboard({
      location: activeLocation,
      year,
      startYear: 1991,
      baselineStart: baseline.start,
      baselineEnd: baseline.end,
    })
      .then((response) => {
        if (requestId !== requestRef.current) return;
        setData(response);
        setSelectedMonth((current) => Math.min(12, Math.max(1, current)));
      })
      .catch((err) => {
        if (requestId !== requestRef.current) return;
        setData(null);
        setError(
          err?.name === "AbortError"
            ? "The historical archive did not answer within 45 seconds. No values were substituted."
            : `The historical archive is unavailable${err?.status ? ` (HTTP ${err.status})` : ""}. No values were substituted.`
        );
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
    return () => {
      if (requestRef.current === requestId) requestRef.current += 1;
    };
  }, [activeLocation, year, baseline.start, baseline.end, retryTick]);

  const current = useMemo(
    () => data?.annual?.find((row) => row.year === data.year) || null,
    [data]
  );
  const currentMonth = data?.monthly?.find((row) => row.month === selectedMonth) || null;
  const currentAnomaly = data?.anomalies?.monthly?.find((row) => row.month === selectedMonth) || null;
  const currentSeason = data?.seasons?.find((row) => row.id === selectedSeason) || null;
  const mapDate = useMemo(() => gibsDate(2), []);
  const mapBbox = useMemo(() => {
    if (!data || !finite(data.lat) || !finite(data.lon)) return "";
    const halfLon = 5;
    const halfLat = 2.8125;
    return [data.lon - halfLon, data.lat - halfLat, data.lon + halfLon, data.lat + halfLat]
      .map((value) => Number(value.toFixed(4)))
      .join(",");
  }, [data]);

  const submitLocation = (event) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) return;
    setActiveLocation(next);
    onSearch?.(next);
  };

  const tempSeries = tempMetric === "all"
    ? [
        { key: "mean_c", label: "Mean", color: "#38bdf8", values: data?.annual?.map((row) => row.mean_c) || [] },
        { key: "mean_max_c", label: "Mean max", color: "#fb923c", values: data?.annual?.map((row) => row.mean_max_c) || [] },
        { key: "mean_min_c", label: "Mean min", color: "#a78bfa", values: data?.annual?.map((row) => row.mean_min_c) || [] },
      ]
    : [{
        key: tempMetric,
        label: TEMP_METRICS.find((item) => item.id === tempMetric)?.label || "Mean",
        color: tempMetric === "mean_max_c" ? "#fb923c" : tempMetric === "mean_min_c" ? "#a78bfa" : "#38bdf8",
        values: data?.annual?.map((row) => row[tempMetric]) || [],
      }];

  const anomalyRows = anomalyMode === "monthly"
    ? (data?.anomalies?.monthly || []).map((row) => ({ ...row, label: row.label }))
    : (data?.seasons || []).map((row) => ({
        label: row.label.replace(/\s*\(.*\)/, ""),
        temp_c: row.anomaly.temp_c,
        rain_mm: row.anomaly.rain_mm,
        rain_pct: row.anomaly.rain_pct,
      }));
  const seasonRows = data?.seasons || [];
  const annualRows = data?.annual || [];
  const monthRows = data?.monthly || [];

  return (
    <div className="wg-climate">
      <header className="wg-climate-hero">
        <div className="wg-climate-hero-image" aria-hidden="true" />
        <div className="wg-climate-hero-content">
          <span className="wg-climate-kicker"><Activity size={14} aria-hidden="true" /> CLIMATE INTELLIGENCE · OBSERVED / REANALYSIS</span>
          <h1>Climate Trends</h1>
          <p>
            Local historical temperature and rainfall intelligence from ERA5 reanalysis.
            Observed records, weather forecasts and climate projections are deliberately kept separate.
          </p>
          <div className="wg-climate-hero-badges">
            <span><Database size={13} aria-hidden="true" /> {data?.source || "Open-Meteo Historical Weather API · ERA5"}</span>
            <span><CalendarDays size={13} aria-hidden="true" /> {data?.period?.label || "1991–latest complete year"}</span>
            <span><Info size={13} aria-hidden="true" /> Baseline {data?.baseline?.label || baseline.label.split(" · ")[0]}</span>
          </div>
        </div>
        <div className="wg-climate-hero-note">
          <span>ATMOSPHERIC CONTEXT</span>
          <small>NASA GOES · public domain · illustrative, not local evidence</small>
        </div>
      </header>

      <section className="wg-climate-controls" aria-label="Climate dashboard controls">
        <form className="wg-climate-search" onSubmit={submitLocation}>
          <label htmlFor="climate-location">Location</label>
          <div>
            <MapPin size={16} aria-hidden="true" />
            <input
              id="climate-location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city, district or state"
              autoComplete="off"
            />
            <button type="submit" className="wg-climate-search-btn" aria-label="Load climate trends for this location">
              <Search size={15} aria-hidden="true" />
            </button>
          </div>
        </form>
        <div className="wg-climate-saved" aria-label="Saved locations">
          {savedPlaces.slice(0, 4).map((place) => (
            <button key={place} type="button" aria-pressed={activeLocation === place} onClick={() => { setActiveLocation(place); setQuery(place); }}>
              {place}
            </button>
          ))}
        </div>
        <label className="wg-climate-select">
          <span>Analysis year</span>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {Array.from({ length: Math.max(1, lastCompleteYear - 2014) }, (_, index) => lastCompleteYear - index).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="wg-climate-select">
          <span>Baseline</span>
          <select value={baselineId} onChange={(event) => setBaselineId(event.target.value)}>
            {BASELINES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" className="wg-climate-refresh" onClick={() => setRetryTick((value) => value + 1)} disabled={loading || !activeLocation}>
          <RefreshCw size={15} aria-hidden="true" className={loading ? "spin" : ""} /> {loading ? "Loading" : "Refresh"}
        </button>
      </section>

      {!activeLocation && (
        <section className="wg-climate-empty" role="status">
          <MapPin size={30} aria-hidden="true" />
          <h2>Choose a location</h2>
          <p>Search a city, district or state or use one of your saved locations. No default city is assumed and no placeholder values are shown.</p>
        </section>
      )}

      {activeLocation && loading && !data && (
        <div className="wg-climate-loading" role="status" aria-label="Loading climate history">
          <div className="wg-climate-skeleton hero" />
          <div className="wg-climate-skeleton-grid">
            {Array.from({ length: 6 }, (_, index) => <div className="wg-climate-skeleton" key={index} />)}
          </div>
          <div className="wg-climate-skeleton chart" />
        </div>
      )}

      {activeLocation && error && !loading && (
        <section className="wg-climate-error" role="alert">
          <AlertTriangle size={24} aria-hidden="true" />
          <div>
            <h2>Historical archive unavailable</h2>
            <p>{error}</p>
            <p className="wg-climate-error-detail">
              The page has preserved the selected location and controls. Source: Open-Meteo Historical Weather API (ERA5).
              No random, bundled or synthetic series has been inserted.
            </p>
            <div>
              <button type="button" className="wg-climate-refresh" onClick={() => setRetryTick((value) => value + 1)}><RefreshCw size={15} /> Retry archive</button>
              <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Provider documentation <ExternalLink size={12} /></a>
            </div>
          </div>
        </section>
      )}

      {data && !loading && (
        <>
          <section className="wg-climate-overview" aria-label="Climate overview">
            <div className="wg-climate-overview-head">
              <div>
                <span className="wg-climate-kicker">LOCAL CLIMATE SNAPSHOT</span>
                <h2>{data.location}<small>{data.state ? `, ${data.state}` : ""}</small></h2>
                <p>{data.lat.toFixed(3)}°N, {data.lon.toFixed(3)}°E · {data.period.label} · baseline {data.baseline.label}</p>
              </div>
              <div className="wg-climate-provenance">
                <span>{data.status}</span>
                <small>{data.data_type}</small>
                <small>Retrieved {new Date(data.retrieved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</small>
              </div>
            </div>
            <div className="wg-climate-kpis">
              <Kpi
                icon={TrendingUp}
                label="Warming trend"
                value={data.trend.temperature.slope_per_decade == null ? "—" : signed(data.trend.temperature.slope_per_decade, 2)}
                unit="°C/decade"
                detail={`${data.trend.temperature.n_years || 0} complete years · R² ${fmt(data.trend.temperature.r2, 2)}`}
                tone={(data.trend.temperature.slope_per_decade || 0) >= 0 ? "warm" : "cool"}
              />
              <Kpi
                icon={Thermometer}
                label={`${data.year} temperature`}
                value={signed(data.anomalies.annual.temp_c, 2)}
                unit="°C"
                detail={`vs ${data.baseline.label} · ${fmt(current?.mean_c, 2, "°C")} annual mean`}
                tone={(data.anomalies.annual.temp_c || 0) >= 0 ? "warm" : "cool"}
              />
              <Kpi
                icon={CloudRain}
                label={`${data.year} rainfall`}
                value={signed(data.anomalies.annual.rain_mm, 1)}
                unit="mm"
                detail={`${signed(data.anomalies.annual.rain_pct, 1, "%")} vs baseline · ${fmt(current?.total_rain_mm, 1, " mm")} total`}
                tone={(data.anomalies.annual.rain_mm || 0) >= 0 ? "wet" : "dry"}
              />
              <Kpi
                icon={Flame}
                label="Hot days ≥40°C"
                value={fmt(current?.hot_days_ge40c, 0)}
                unit="days"
                detail={`Baseline mean ${fmt(data.extremes.baseline.hot_days_ge40c, 1)} days · ${data.year}`}
                tone="hot"
              />
              <Kpi
                icon={CloudRain}
                label="Heavy-rain days"
                value={fmt(current?.heavy_rain_days_ge64_5mm, 0)}
                unit="days"
                detail={`≥64.5 mm · baseline mean ${fmt(data.extremes.baseline.heavy_rain_days_ge64_5mm, 1)}`}
                tone="wet"
              />
              <Kpi
                icon={Database}
                label="Data coverage"
                value={fmt(data.coverage.temp_coverage_pct, 1)}
                unit="%"
                detail={`${data.coverage.temp_days.toLocaleString()} / ${data.coverage.days.toLocaleString()} days with paired temperature`}
                tone={data.coverage.temp_coverage_pct >= 95 ? "" : "warn"}
              />
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-temp-title">
            <SectionHead
              kicker="TEMPERATURE HISTORY"
              title={<span id="climate-temp-title">Annual temperature and anomalies</span>}
              description={`Annual means from daily ERA5 values. The baseline line is the ${data.baseline.label} mean. Trend is a linear regression, not climate-change attribution.`}
              action={
                <div className="wg-climate-seg" role="group" aria-label="Temperature metric">
                  {TEMP_METRICS.map((metric) => (
                    <button key={metric.id} type="button" aria-pressed={tempMetric === metric.id} onClick={() => setTempMetric(metric.id)}>{metric.label}</button>
                  ))}
                  <button type="button" aria-pressed={tempMetric === "all"} onClick={() => setTempMetric("all")}>All</button>
                </div>
              }
            />
            <div className="wg-climate-chart-card">
              <div className="wg-climate-chart-title">
                <div><b>{TEMP_METRICS.find((item) => item.id === tempMetric)?.label || "Mean, max and min"}</b><span>°C · {data.period.label}</span></div>
                <ChartLegend items={tempSeries.map((item) => ({ label: item.label, color: item.color }))} />
              </div>
              <LineChart
                labels={annualRows.map((row) => String(row.year))}
                series={tempSeries}
                unit="°C"
                reference={{ value: data.anomalies.baseline.mean_c, label: `Baseline ${fmt(data.anomalies.baseline.mean_c, 2)}°C` }}
              />
            </div>
            <div className="wg-climate-two-col">
              <article className="wg-climate-mini-card">
                <div className="wg-climate-mini-head"><span>MONTHLY COMPARISON · {data.year}</span><b>Mean maximum temperature</b></div>
                <BarChart
                  rows={monthRows.map((row, index) => ({ label: row.label, current: row.mean_max_c, baseline: data.monthly_baseline[index]?.mean_max_c }))}
                  labelKey="label"
                  series={[
                    { key: "current", label: String(data.year), color: "#fb923c" },
                    { key: "baseline", label: data.baseline.label, color: "#475569" },
                  ]}
                  unit="°C"
                  height={240}
                />
                <ChartLegend items={[{ label: String(data.year), color: "#fb923c" }, { label: `Baseline ${data.baseline.label}`, color: "#475569" }]} />
              </article>
              <article className="wg-climate-mini-card">
                <div className="wg-climate-mini-head"><span>TEMPERATURE DEPARTURES</span><b>Annual anomaly vs baseline</b></div>
                <AnomalyBars
                  rows={annualRows.map((row) => ({ label: String(row.year), temp: row.mean_c == null ? null : row.mean_c - data.anomalies.baseline.mean_c }))}
                  labelKey="label"
                  valueKey="temp"
                  unit="°C"
                />
                <p className="wg-climate-note">Orange bars are warmer than the baseline; blue bars are cooler. Missing years are gaps.</p>
              </article>
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-rain-title">
            <SectionHead
              kicker="RAINFALL HISTORY"
              title={<span id="climate-rain-title">Rainfall, wet days and variability</span>}
              description="Daily precipitation totals are summed without filling missing days. India's monsoon season is shown separately from the calendar year."
              action={
                <div className="wg-climate-seg" role="group" aria-label="Rainfall view">
                  <button type="button" aria-pressed={rainView === "annual"} onClick={() => setRainView("annual")}>Annual</button>
                  <button type="button" aria-pressed={rainView === "monthly"} onClick={() => setRainView("monthly")}>Monthly</button>
                </div>
              }
            />
            <div className="wg-climate-chart-card">
              <div className="wg-climate-chart-title">
                <div><b>{rainView === "annual" ? "Annual rainfall" : `Monthly rainfall · ${data.year}`}</b><span>mm · {data.period.label}</span></div>
                <ChartLegend items={[{ label: rainView === "annual" ? "Annual total" : String(data.year), color: "#38bdf8" }, ...(rainView === "monthly" ? [{ label: `Baseline ${data.baseline.label}`, color: "#475569" }] : [])]} />
              </div>
              {rainView === "annual" ? (
                <BarChart
                  rows={annualRows.map((row) => ({ label: String(row.year), rain: row.total_rain_mm }))}
                  labelKey="label"
                  series={[{ key: "rain", label: "Annual total", color: "#38bdf8" }]}
                  unit="mm"
                  reference={{ value: data.anomalies.baseline.total_rain_mm, label: `Baseline ${fmt(data.anomalies.baseline.total_rain_mm, 0)} mm` }}
                />
              ) : (
                <BarChart
                  rows={monthRows.map((row, index) => ({ label: row.label, current: row.total_rain_mm, baseline: data.monthly_baseline[index]?.total_rain_mm }))}
                  labelKey="label"
                  series={[
                    { key: "current", label: String(data.year), color: "#38bdf8" },
                    { key: "baseline", label: data.baseline.label, color: "#475569" },
                  ]}
                  unit="mm"
                />
              )}
            </div>
            <div className="wg-climate-rain-grid">
              <article className="wg-climate-rain-card">
                <span>MONSOON SHARE</span>
                <strong>{fmt((() => { const season = seasonRows.find((row) => row.id === "monsoon"); return season?.current?.total_rain_mm != null && current?.total_rain_mm ? (season.current.total_rain_mm / current.total_rain_mm) * 100 : null; })(), 0, "%")}</strong>
                <p>June–September contribution to the {data.year} calendar-year total.</p>
              </article>
              <article className="wg-climate-rain-card">
                <span>WET DAYS</span>
                <strong>{fmt(current?.wet_days_ge2_5mm, 0)}</strong>
                <p>≥2.5 mm · baseline mean {fmt(data.extremes.baseline.wet_days_ge2_5mm, 1)} days.</p>
              </article>
              <article className="wg-climate-rain-card">
                <span>MAX DAILY RAIN</span>
                <strong>{fmt(current?.max_daily_rain_mm, 1, " mm")}</strong>
                <p>Baseline mean annual maximum {fmt(data.extremes.baseline.max_daily_rain_mm, 1, " mm")}.</p>
              </article>
              <article className="wg-climate-rain-card">
                <span>LONGEST DRY SPELL</span>
                <strong>{fmt(current?.max_consecutive_dry_days, 0, " d")}</strong>
                <p>Consecutive days &lt;1 mm. Baseline mean {fmt(data.extremes.baseline.max_consecutive_dry_days, 1)} d.</p>
              </article>
            </div>
            <div className="wg-climate-chart-card wg-climate-calendar-card">
              <div className="wg-climate-chart-title">
                <div><b>Climate calendar · {data.year}</b><span>Daily values; grey cells are missing or outside the month</span></div>
                <div className="wg-climate-seg" role="group" aria-label="Calendar variable">
                  <button type="button" aria-pressed={heatMode === "temperature"} onClick={() => setHeatMode("temperature")}>Tmax</button>
                  <button type="button" aria-pressed={heatMode === "rain"} onClick={() => setHeatMode("rain")}>Rain</button>
                </div>
              </div>
              <ClimateHeatmap calendar={data.calendar} mode={heatMode} year={data.year} />
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-season-title">
            <SectionHead
              kicker="SEASONALITY"
              title={<span id="climate-season-title">Seasons and monthly climatology</span>}
              description="Calendar-year seasons. Winter covers January–February only; December is not carried into the next winter."
            />
            <div className="wg-climate-seasons">
              {seasonRows.map((season) => (
                <article key={season.id} className="wg-climate-season">
                  <div className="wg-climate-season-head">
                    <span>{season.label}</span>
                    <small>{season.months.join(" · ")}</small>
                  </div>
                  <div className="wg-climate-season-values">
                    <div><span>Mean</span><b>{fmt(season.current?.mean_c, 1, "°C")}</b></div>
                    <div><span>Anomaly</span><b className={(season.anomaly.temp_c || 0) >= 0 ? "warm-text" : "cool-text"}>{signed(season.anomaly.temp_c, 2, "°C")}</b></div>
                    <div><span>Rain</span><b>{fmt(season.current?.total_rain_mm, 1, " mm")}</b></div>
                    <div><span>Rain anomaly</span><b className={(season.anomaly.rain_mm || 0) >= 0 ? "wet-text" : "dry-text"}>{signed(season.anomaly.rain_pct, 1, "%")}</b></div>
                  </div>
                </article>
              ))}
            </div>
            <div className="wg-climate-chart-card">
              <div className="wg-climate-chart-title"><div><b>Monthly climatology</b><span>Current year versus baseline mean</span></div></div>
              <BarChart
                rows={monthRows.map((row, index) => ({ label: row.label, current: row.mean_c, baseline: data.monthly_baseline[index]?.mean_c }))}
                labelKey="label"
                series={[
                  { key: "current", label: String(data.year), color: "#a78bfa" },
                  { key: "baseline", label: data.baseline.label, color: "#475569" },
                ]}
                unit="°C"
              />
              <ChartLegend items={[{ label: `${data.year} monthly mean`, color: "#a78bfa" }, { label: `Baseline ${data.baseline.label}`, color: "#475569" }]} />
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-extremes-title">
            <SectionHead
              kicker="EXTREMES & INDICATORS"
              title={<span id="climate-extremes-title">Threshold indicators, not official warnings</span>}
              description="These are descriptive counts from gridded daily reanalysis. They are not station observations, heatwave declarations or disaster warnings."
            />
            <div className="wg-climate-extremes">
              {[
                ["Hot days ≥40°C", current?.hot_days_ge40c, data.extremes.baseline.hot_days_ge40c, "days", Flame],
                ["Warm nights ≥25°C", current?.warm_nights_ge25c, data.extremes.baseline.warm_nights_ge25c, "days", Thermometer],
                ["Heavy-rain days ≥64.5 mm", current?.heavy_rain_days_ge64_5mm, data.extremes.baseline.heavy_rain_days_ge64_5mm, "days", CloudRain],
                ["Wet days ≥2.5 mm", current?.wet_days_ge2_5mm, data.extremes.baseline.wet_days_ge2_5mm, "days", CloudRain],
                ["Longest dry spell", current?.max_consecutive_dry_days, data.extremes.baseline.max_consecutive_dry_days, "days", AlertTriangle],
                ["Max daily rainfall", current?.max_daily_rain_mm, data.extremes.baseline.max_daily_rain_mm, "mm", CloudRain],
              ].map(([label, value, baselineValue, unit, Icon]) => (
                <article key={label} className="wg-climate-extreme">
                  <Icon size={17} aria-hidden="true" />
                  <span>{label}</span>
                  <strong>{fmt(value, unit === "mm" ? 1 : 0, ` ${unit}`)}</strong>
                  <small>Baseline mean {fmt(baselineValue, unit === "mm" ? 1 : 1)} {unit}</small>
                </article>
              ))}
            </div>
            <details className="wg-climate-definitions">
              <summary>Threshold definitions and data limitations</summary>
              <ul>
                {Object.values(data.extremes.definitions).map((definition) => <li key={definition}>{definition}</li>)}
                <li>ERA5 is a coarse reanalysis grid; local extremes can differ from a nearby weather station.</li>
              </ul>
            </details>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-anomaly-title">
            <SectionHead
              kicker="ANOMALY EXPLORER"
              title={<span id="climate-anomaly-title">Compare a period with a documented baseline</span>}
              description={`Departures are calculated against the ${data.baseline.label} baseline using the same ERA5 series. Positive temperature means warmer; negative means cooler. Positive rainfall means wetter.`}
            />
            <div className="wg-climate-anomaly">
              <div className="wg-climate-anomaly-controls">
                <div className="wg-climate-seg" role="group" aria-label="Anomaly resolution">
                  <button type="button" aria-pressed={anomalyMode === "monthly"} onClick={() => setAnomalyMode("monthly")}>Monthly</button>
                  <button type="button" aria-pressed={anomalyMode === "seasonal"} onClick={() => setAnomalyMode("seasonal")}>Seasonal</button>
                </div>
                {anomalyMode === "monthly" ? (
                  <label className="wg-climate-select"><span>Month</span>
                    <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                      {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="wg-climate-select"><span>Season</span>
                    <select value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)}>
                      {seasonRows.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="wg-climate-anomaly-detail">
                {anomalyMode === "monthly" && currentMonth ? (
                  <>
                    <div><span>Selected period</span><b>{currentMonth.label} {data.year}</b></div>
                    <div><span>Temperature</span><b className={(currentAnomaly?.temp_c || 0) >= 0 ? "warm-text" : "cool-text"}>{signed(currentAnomaly?.temp_c, 2, "°C")}</b><small>{fmt(currentMonth.mean_c, 1, "°C")} vs baseline {fmt(currentAnomaly?.baseline?.mean_c, 1, "°C")}</small></div>
                    <div><span>Rainfall</span><b className={(currentAnomaly?.rain_mm || 0) >= 0 ? "wet-text" : "dry-text"}>{signed(currentAnomaly?.rain_mm, 1, " mm")}</b><small>{signed(currentAnomaly?.rain_pct, 1, "%")} · {fmt(currentMonth.total_rain_mm, 1, " mm")} vs {fmt(currentAnomaly?.baseline?.total_rain_mm, 1, " mm")}</small></div>
                  </>
                ) : currentSeason ? (
                  <>
                    <div><span>Selected period</span><b>{currentSeason.label}</b></div>
                    <div><span>Temperature</span><b className={(currentSeason.anomaly.temp_c || 0) >= 0 ? "warm-text" : "cool-text"}>{signed(currentSeason.anomaly.temp_c, 2, "°C")}</b><small>{fmt(currentSeason.current?.mean_c, 1, "°C")} vs baseline {fmt(currentSeason.baseline.mean_c, 1, "°C")}</small></div>
                    <div><span>Rainfall</span><b className={(currentSeason.anomaly.rain_mm || 0) >= 0 ? "wet-text" : "dry-text"}>{signed(currentSeason.anomaly.rain_pct, 1, "%")}</b><small>{fmt(currentSeason.current?.total_rain_mm, 1, " mm")} vs {fmt(currentSeason.baseline.total_rain_mm, 1, " mm")}</small></div>
                  </>
                ) : null}
              </div>
              <div className="wg-climate-anomaly-chart">
                <BarChart
                  rows={anomalyRows.map((row) => ({ label: row.label, temp: row.temp_c }))}
                  labelKey="label"
                  series={[{ key: "temp", label: "Temperature anomaly", color: "#fb923c" }]}
                  unit="°C"
                  height={250}
                  reference={{ value: 0, label: "Baseline" }}
                />
              </div>
              <p className="wg-climate-note">
                Calculation: aggregate the selected year's daily values, subtract the arithmetic mean of the same month or season across {data.baseline.label}.
                The baseline is {data.baseline.end_year - data.baseline.start_year + 1} complete years; missing months are excluded.
              </p>
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-map-title">
            <SectionHead
              kicker="GEOGRAPHIC CONTEXT"
              title={<span id="climate-map-title">Regional satellite layers</span>}
              description="Real NASA GIBS WMS layers centered on the selected coordinates. Daily products are delayed. These are land-surface and precipitation-rate context, not local air temperature or rain-gauge totals."
            />
            <div className="wg-climate-map-grid">
              <LiveImagery
                title="Land-surface temperature context"
                description={`MODIS Terra daytime land-surface temperature · ${mapDate} daily composite · regional window ±5° longitude / ±2.8° latitude.`}
                src={mapBbox ? gibsWms("MODIS_Terra_Land_Surface_Temp_Day", mapDate, mapBbox, 1200, 675) : ""}
                alt={`NASA GIBS MODIS Terra land-surface temperature around ${data.location} on ${mapDate}`}
                sourceName="NASA GIBS / Worldview"
                sourceUrl="https://worldview.earthdata.nasa.gov/"
                observedAt={`${mapDate} daily composite`}
                status="DELAYED"
                legend="Land surface, not 2 m air temperature. Colors follow the NASA GIBS product; no anomaly raster is synthesized."
                minHeight="15rem"
              />
              <LiveImagery
                title="Satellite precipitation context"
                description={`GPM IMERG precipitation rate · ${mapDate} daily product · regional window around ${data.location}.`}
                src={mapBbox ? gibsWms("IMERG_Precipitation_Rate", mapDate, mapBbox, 1200, 675) : ""}
                alt={`NASA GIBS IMERG precipitation rate around ${data.location} on ${mapDate}`}
                sourceName="NASA GIBS / Worldview"
                sourceUrl="https://worldview.earthdata.nasa.gov/"
                observedAt={`${mapDate} daily product`}
                status="DELAYED"
                legend="Satellite precipitation-rate context, not a rain-gauge observation. Dark/no-data areas are not zero rainfall."
                minHeight="15rem"
              />
            </div>
            <div className="wg-climate-map-note">
              <Info size={15} aria-hidden="true" />
              <p>
                Temperature and rainfall <b>anomaly maps</b> are not shown because the current keyless map stack has no correctly georeferenced baseline raster.
                No synthetic anomaly layer is used. Location-centered historical values remain in the charts above.
              </p>
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-context-title">
            <SectionHead
              kicker="LONG-TERM CONTEXT"
              title={<span id="climate-context-title">Observed history is not a projection</span>}
              description="This dashboard reports historical reanalysis. It does not contain a climate-model projection series."
            />
            <div className="wg-climate-context">
              <article>
                <TrendingUp size={20} aria-hidden="true" />
                <h3>What the record shows</h3>
                <p>Annual mean temperature trend is {data.trend.temperature.slope_per_decade == null ? "not estimable" : `${signed(data.trend.temperature.slope_per_decade, 2)}°C per decade`} over {data.period.label} ({data.trend.temperature.n_years} complete years). R² is {fmt(data.trend.temperature.r2, 2)}.</p>
                <p>Annual rainfall trend is {data.trend.rainfall.slope_per_decade == null ? "not estimable" : `${signed(data.trend.rainfall.slope_per_decade, 1)} mm per decade`}. Rainfall variability is large, so this is context, not proof of a shift.</p>
              </article>
              <article>
                <Info size={20} aria-hidden="true" />
                <h3>What it does not show</h3>
                <p>No future scenario, attribution statement, official heatwave declaration or neighborhood-scale measurement is inferred. ERA5 is a gridded reanalysis, not a station thermometer or rain gauge.</p>
              </article>
              <article>
                <ExternalLink size={20} aria-hidden="true" />
                <h3>Authoritative projection context</h3>
                <p>For projections and scenarios, use Copernicus CDS, the World Bank Climate Change Knowledge Portal or IPCC material. No projection values are fabricated on this page.</p>
                <div className="wg-climate-links">
                  <a href="https://cds.climate.copernicus.eu/" target="_blank" rel="noreferrer">Copernicus CDS <ExternalLink size={11} /></a>
                  <a href="https://climateknowledgeportal.worldbank.org/" target="_blank" rel="noreferrer">World Bank CCKP <ExternalLink size={11} /></a>
                  <a href="https://www.ipcc.ch/" target="_blank" rel="noreferrer">IPCC <ExternalLink size={11} /></a>
                </div>
              </article>
            </div>
          </section>

          <section className="wg-climate-section" aria-labelledby="climate-insights-title">
            <SectionHead
              kicker="DETERMINISTIC INSIGHTS"
              title={<span id="climate-insights-title">Traceable findings from the selected series</span>}
              description={`Every statement below is calculated from the displayed ${data.period.label} values against ${data.baseline.label}. No external AI or guessed value is used.`}
              action={<button type="button" className="wg-climate-ask" onClick={() => onAsk?.(`Explain the climate trends for ${data.location} for ${data.year} against the ${data.baseline.label} baseline. Use only the displayed historical values and state that ERA5 is reanalysis, not a forecast or projection.`)}>Ask WeatherGPT</button>}
            />
            <div className="wg-climate-insights">
              {data.insights.map((insight) => (
                <article key={`${insight.type}-${insight.title}`} className={`wg-climate-insight ${insight.type}`}>
                  <span>{insight.type.replace(/-/g, " ")}</span>
                  <h3>{insight.title}</h3>
                  <p>{insight.text}</p>
                  <small>{insight.period} · baseline {insight.baseline}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="wg-climate-section wg-climate-transparency" aria-labelledby="climate-data-title">
            <SectionHead
              kicker="DATA TRANSPARENCY"
              title={<span id="climate-data-title">Download, source and method</span>}
              description="CSV files contain only the retrieved annual, monthly or daily values shown above, plus provenance. Missing values are left empty."
            />
            <div className="wg-climate-transparency-grid">
              <article>
                <h3><Download size={17} aria-hidden="true" /> Export observed series</h3>
                <div className="wg-climate-export">
                  <button type="button" onClick={() => downloadCsv(data, "annual")}>Annual CSV</button>
                  <button type="button" onClick={() => downloadCsv(data, "monthly")}>Monthly CSV</button>
                  <button type="button" onClick={() => downloadCsv(data, "daily")}>{data.year} daily CSV</button>
                </div>
                <p>Timezone: {data.provider?.timezone || "Asia/Kolkata"}. Units: °C for temperature, mm for rainfall, days for counts.</p>
              </article>
              <article>
                <h3><Database size={17} aria-hidden="true" /> Dataset and coverage</h3>
                <dl>
                  <div><dt>Dataset</dt><dd>{data.data_type}</dd></div>
                  <div><dt>Provider</dt><dd><a href={data.source_url} target="_blank" rel="noreferrer">{data.source} <ExternalLink size={11} /></a></dd></div>
                  <div><dt>Coordinates</dt><dd>{data.lat.toFixed(3)}°, {data.lon.toFixed(3)}° · {data.provider?.elevation_m != null ? `${data.provider.elevation_m} m` : "elevation not reported"}</dd></div>
                  <div><dt>Coverage</dt><dd>{fmt(data.coverage.temp_coverage_pct, 1, "%")} temperature · {fmt(data.coverage.rain_coverage_pct, 1, "%")} rainfall</dd></div>
                  <div><dt>Retrieved</dt><dd>{new Date(data.retrieved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</dd></div>
                </dl>
              </article>
              <article>
                <h3><Info size={17} aria-hidden="true" /> Method and limitations</h3>
                <p>{data.methodology.baseline}</p>
                <p>{data.methodology.trend}</p>
                <p>{data.methodology.rainfall}</p>
                <p>{data.methodology.seasons}</p>
                <p className="wg-climate-note">{data.projection_note}</p>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
