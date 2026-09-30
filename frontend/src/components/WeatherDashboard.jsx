import React, { useEffect, useState } from "react";
import { fetchRegionalTalukas } from "../services/api";
import { glyphFor } from "./ModernWeatherCard";

function Metric({ label, value, sub }) {
  return (
    <div className="wg-card wg-tile">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

function SourceLine({ source, status, hint }) {
  const tone = status === "LIVE" ? "live" : status === "STATIC" ? "static" : "estimated";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", fontSize: "0.7rem", color: "var(--wg-muted)" }}>
      <span className="wg-mono">SOURCE: {source}</span>
      <span className={`wg-chip ${tone}`}>STATUS: {status}</span>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function TempSpark({ hourly }) {
  if (!hourly?.length) return null;
  const temps = hourly.slice(0, 24).map((h) => h.temp);
  const min = Math.min(...temps);
  const span = Math.max(...temps) - min || 1;
  const pts = temps.map((t, i) => `${(i / (temps.length - 1)) * 100},${34 - ((t - min) / span) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 36" role="img" aria-label="24-hour temperature curve" style={{ width: "100%", height: "3.2rem" }}>
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      {temps.filter((_, i) => i % 6 === 0).map((t, k) => (
        <text key={k} x={(k * 6 / (temps.length - 1)) * 100} y="35" fontSize="4" fill="#93a1b8">{t}°</text>
      ))}
    </svg>
  );
}

export default function WeatherDashboard({ weather, busy, onAsk }) {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    if (weather?.location) {
      fetchRegionalTalukas(weather.location).then(setAreas).catch(() => setAreas([]));
    }
  }, [weather?.location]);

  if (busy && !weather) {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", padding: "4rem 0" }}>
        <div className="wg-spin" aria-label="Loading weather" />
        <p style={{ color: "var(--wg-muted)", fontSize: "0.85rem" }}>Fetching live model data…</p>
      </div>
    );
  }
  if (!weather) {
    return (
      <div className="wg-alert info" role="status">
        No weather loaded yet. Search a place above, or allow location access.
      </div>
    );
  }

  const today = weather.daily?.[0];
  return (
    <section aria-label="Forecast dashboard" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
        <span className="wg-mono">SOURCE: {weather.data_source}</span>
        <span className="wg-mono">UPDATED: {weather.updated_at_ist || "—"}</span>
        <span className={`wg-chip ${weather.status === "LIVE" ? "live" : "simulated"}`}>STATUS: {weather.status}</span>
        <span className="wg-mono">{weather.nwp_model}</span>
      </div>

      <div className="wg-card" style={{ padding: "1.2rem 1.3rem", display: "flex", flexWrap: "wrap", gap: "1.2rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--wg-accent)", fontWeight: 700 }}>
            {weather.location}, {weather.state} · {weather.lat.toFixed(2)}°N {weather.lon.toFixed(2)}°E
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.8rem", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "3.2rem", fontWeight: 800 }}>{weather.current_temp}°</span>
            <span style={{ fontSize: "2rem" }} aria-hidden="true">
              {glyphFor(weather.icon)}
            </span>
          </div>
          <div style={{ fontWeight: 700 }}>{weather.condition}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--wg-muted)" }}>
            Feels {weather.feels_like}°C
            {today && (
              <>
                {" "}· high {today.temp_max}° / low {today.temp_min}°
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
          <div className="wg-card" style={{ padding: "0.5rem 0.9rem", textAlign: "right" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>AQI (estimated)</div>
            <div style={{ fontWeight: 800 }}>{weather.aqi} · {weather.aqi_status}</div>
          </div>
          <button className="wg-btn" onClick={() => onAsk(`Full weather and hazard outlook for ${weather.location} this week`)}>
            Ask WeatherGPT →
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(9rem,1fr))", gap: "0.6rem" }}>
        <Metric label="Humidity" value={`${weather.humidity}%`} />
        <Metric label="Wind" value={`${weather.wind_speed} km/h`} sub={weather.wind_direction} />
        <Metric label="Pressure" value={`${weather.pressure} hPa`} />
        <Metric label="Precipitation" value={`${weather.precipitation} mm`} />
        <Metric label="Cloud cover" value={`${weather.cloud_cover ?? 0}%`} sub="LIVE sky" />
        <Metric label="UV index" value={weather.uv_index} />
        <Metric label="Visibility" value={`${weather.visibility} km`} />
        <Metric label="Sunrise" value={`${weather.sunrise} IST`} />
        <Metric label="Sunset" value={`${weather.sunset} IST`} />
      </div>
      <SourceLine source={`${weather.data_source} · current conditions`} status={weather.status} hint={`Updated ${weather.updated_at_ist || "—"}`} />

      {areas.length > 0 && (
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Nearby areas</h3>
          <div className="wg-scrollrow">
            {areas.map((a) => (
              <button key={a.name} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => onAsk(`Weather for ${a.name}`)}>
                {a.name} <span style={{ color: "var(--wg-muted)" }}>· {a.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.8rem" }}>Next 24 hours (LIVE NWP)</h3>
        <TempSpark hourly={weather.hourly} />
        <div className="wg-scrollrow" style={{ marginTop: "0.4rem" }}>
          {(weather.hourly || []).map((h, i) => (
            <div key={i} className="wg-card" style={{ minWidth: "5.4rem", padding: "0.55rem", textAlign: "center" }}>
              <div className="wg-mono" style={{ fontSize: "0.7rem" }}>{h.time}</div>
              <div style={{ fontSize: "1.2rem" }} aria-hidden="true">{glyphFor(h.icon)}</div>
              <div style={{ fontWeight: 800 }}>{h.temp}°</div>
              <div style={{ fontSize: "0.7rem", color: h.rain_prob >= 60 ? "var(--wg-accent)" : "var(--wg-muted)" }}>💧{h.rain_prob}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.8rem" }}>7-day outlook</h3>
        <SourceLine source={`${weather.data_source} · daily NWP`} status={weather.status} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
          {(weather.daily || []).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.7rem", fontSize: "0.82rem", padding: "0.45rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
              <strong style={{ width: "4.2rem" }}>{d.day}</strong>
              <span aria-hidden="true">{glyphFor(d.icon)}</span>
              <span style={{ flex: 1, color: "var(--wg-muted)" }}>{d.condition}</span>
              <span className="wg-mono">💧{d.rain_sum}mm</span>
              <strong>{d.temp_max}°</strong>
              <span style={{ color: "var(--wg-muted)" }}>{d.temp_min}°</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
