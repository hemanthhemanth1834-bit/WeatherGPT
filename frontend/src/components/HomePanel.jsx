import React, { useEffect, useState } from "react";
import { fetchRiskAssessment } from "../services/api";
import WxIcon from "./WxIcon";

const RISK_TONE = { LOW: "live", MODERATE: "static", HIGH: "demo", EXTREME: "off" };

function agoLabel(ist) {
  if (!ist) return "";
  const m = ist.match(/(\d+)\s+(\w+)\s+(\d{4}),\s+(\d+):(\d+)/);
  if (!m) return "";
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const then = Date.UTC(+m[3], months[m[2]], +m[1], +m[4] - 5, +m[5] - 30);
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
}

export default function HomePanel({ weather, busy, alertCount, alerts, onAsk, onTab, onRefresh }) {
  const [risk, setRisk] = useState(null);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (weather?.location) {
      fetchRiskAssessment(weather.location, weather.lat, weather.lon)
        .then((r) => !cancelled && setRisk(r))
        .catch(() => !cancelled && setRisk(null));
    }
    return () => {
      cancelled = true;
    };
  }, [weather?.location, weather?.lat, weather?.lon]);

  useEffect(() => {
    if (!auto || !weather?.location) return undefined;
    const id = setInterval(() => onRefresh(weather.location), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [auto, weather?.location, onRefresh]);

  const topAlert = alerts?.[0];

  return (
    <section aria-label="Command home" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div className="wg-hero-band" style={{ padding: "clamp(1.2rem, 4vw, 2.2rem)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(17rem,1fr))", gap: "1.4rem", alignItems: "center" }}>
          <div>
            <span className="wg-chip live">SIH 2026 · LIVE COMMAND CENTER</span>
            <h1 className="wg-hero-title" style={{ marginTop: "0.6rem" }}>
              WeatherGPT <span className="wg-gradient-text">— AI Weather Intelligence</span>
            </h1>
            <p style={{ margin: "0.6rem 0 0", color: "var(--wg-muted)", fontSize: "clamp(0.85rem, 2vw, 0.95rem)", lineHeight: 1.6 }}>
              Conversational AI for Weather Forecasting, Alerts &amp; Climate Intelligence.
              AI-powered weather intelligence for India — ask in your language, by text or voice.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="wg-btn" onClick={() => onTab("chat")}>🎙️ Ask WeatherGPT</button>
              <button className="wg-btn-ghost" onClick={() => onTab("map")}>🗺 Radar map</button>
              <button className="wg-btn-ghost" onClick={() => onTab("dashboard")}>📊 7-day forecast</button>
              <button className="wg-btn-ghost" onClick={() => onTab("alerts")}>
                🚨 Alerts{alertCount > 0 ? ` (${alertCount})` : ""}
              </button>
            </div>
          </div>
          <div className="wg-card" style={{ padding: "1.1rem 1.2rem", background: "rgba(8,13,26,.55)" }} aria-label="Current snapshot">
            {weather ? (
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <WxIcon icon={weather.icon} size={56} />
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>{weather.current_temp}°<span style={{ fontSize: "1rem", color: "var(--wg-muted)" }}>C</span></div>
                  <div style={{ fontWeight: 700, color: "var(--wg-accent)" }}>{weather.condition}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--wg-muted)" }}>Feels {weather.feels_like}°C · {weather.location}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1rem", fontSize: "0.76rem", minWidth: "12rem" }}>
                  <span>💧 Rain <strong>{weather.hourly?.[0]?.rain_prob ?? 0}%</strong></span>
                  <span>💨 Wind <strong>{weather.wind_speed} km/h</strong></span>
                  <span>💦 Humidity <strong>{weather.humidity}%</strong></span>
                  <span>🍃 AQI <strong>{weather.aqi} ({weather.aqi_status})</strong></span>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--wg-muted)", fontSize: "0.85rem", margin: 0 }}>
                {busy ? "Loading live snapshot…" : "Search a place to load its live snapshot."}
              </p>
            )}
            <div className="wg-mono" style={{ marginTop: "0.6rem", fontSize: "0.64rem", color: "var(--wg-muted)" }}>
              {weather ? <>SOURCE {weather.data_source} · {weather.status} · {weather.updated_at_ist}</> : "SOURCE Open-Meteo · awaiting first load"}
            </div>
          </div>
        </div>
      </div>

      {!weather && !busy && (
        <div className="wg-alert info" role="status">Search a place above to load its live command snapshot.</div>
      )}
      {busy && !weather && (
        <div role="status" style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div className="wg-spin" aria-label="Loading live weather" />
        </div>
      )}

      {weather && (
        <div className="wg-card glow" style={{ padding: "1.1rem 1.2rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="wg-section-title">Now · {weather.location}, {weather.state}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginTop: "0.3rem" }}>
                <span style={{ fontSize: "2.8rem" }} aria-hidden="true">{glyphFor(weather.icon)}</span>
                <span style={{ fontSize: "3rem", fontWeight: 800 }}>{weather.current_temp}°</span>
                <span>
                  <strong>{weather.condition}</strong>
                  <span style={{ display: "block", fontSize: "0.8rem", color: "var(--wg-muted)" }}>
                    Feels {weather.feels_like}°C · 💧 {weather.humidity}% · 💨 {weather.wind_speed} km/h {weather.wind_direction} · 🌧 {weather.precipitation} mm
                  </span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
              <span className={`wg-chip ${risk ? RISK_TONE[risk.overall] : "static"}`}>
                RISK: {risk ? `${risk.overall} · ESTIMATED` : "…"}
              </span>
              <span className="wg-chip" style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
                {alertCount > 0 && <span className="wg-pulse-dot" aria-hidden="true" />}
                ALERTS: {alertCount}
              </span>
              <button className="wg-btn-ghost" onClick={() => onAsk(`Explain today's weather in ${weather.location}`)}>
                Explain today →
              </button>
            </div>
          </div>
          <div className="wg-mono" style={{ marginTop: "0.7rem", fontSize: "0.68rem", color: "var(--wg-muted)", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
            <span>SOURCE {weather.data_source} · STATUS {weather.status} · UPDATED {weather.updated_at_ist || "—"}{weather.updated_at_ist ? ` (${agoLabel(weather.updated_at_ist)})` : ""} · {weather.nwp_model}</span>
            <button className="wg-btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.68rem" }} onClick={() => onRefresh(weather.location)} aria-label="Refresh now">↻ Refresh</button>
            <label style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", fontSize: "0.68rem" }}>
              <input type="checkbox" className="wg-check" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto (10 min)
            </label>
          </div>
          {topAlert && (
            <button onClick={() => onTab("alerts")} style={{ marginTop: "0.6rem", width: "100%", textAlign: "left", background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.35)", color: "inherit", borderRadius: "0.8rem", padding: "0.6rem 0.9rem", cursor: "pointer", fontSize: "0.8rem" }}>
              <strong>[{topAlert.severity}]</strong> {topAlert.headline} →
            </button>
          )}
        </div>
      )}

      <div className="wg-grid-panels">
        <button className="wg-card" style={{ padding: "1rem", textAlign: "left", color: "inherit", cursor: "pointer" }} onClick={() => onAsk(`Will it rain tomorrow in ${weather?.location || "my city"}?`)}>
          <div className="wg-section-title">🌧 Rain check</div>
          <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>Hour-by-hour rain probability from live NWP.</p>
        </button>
        <button className="wg-card" style={{ padding: "1rem", textAlign: "left", color: "inherit", cursor: "pointer" }} onClick={() => onAsk(`What should farmers do this week near ${weather?.location || "my district"}?`)}>
          <div className="wg-section-title">🌾 Farmer desk</div>
          <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>Crop, spray and harvest guidance per live weather.</p>
        </button>
        <button className="wg-card" style={{ padding: "1rem", textAlign: "left", color: "inherit", cursor: "pointer" }} onClick={() => onAsk(`Is it safe to travel to ${weather?.location || "my city"} this week?`)}>
          <div className="wg-section-title">🧭 Travel safety</div>
          <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>Risk-based go / caution read for your route.</p>
        </button>
        <button className="wg-card" style={{ padding: "1rem", textAlign: "left", color: "inherit", cursor: "pointer" }} onClick={() => onTab("severe")}>
          <div className="wg-section-title">🌀 Severe weather</div>
          <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>Cyclone illustration, warnings and what they mean.</p>
        </button>
      </div>
    </section>
  );
}
