import React, { useEffect, useState } from "react";
import { fetchRiskAssessment } from "../services/api";
import { glyphFor } from "./ModernWeatherCard";

const RISK_TONE = { LOW: "live", MODERATE: "static", HIGH: "demo", EXTREME: "off" };

export default function HomePanel({ weather, busy, alertCount, alerts, onAsk, onTab }) {
  const [risk, setRisk] = useState(null);

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

  const topAlert = alerts?.[0];

  return (
    <section aria-label="Command home" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div className="wg-hero-band" style={{ padding: "clamp(1.2rem, 4vw, 2.4rem)" }}>
        <span className="wg-chip live">SIH 2026 · LIVE COMMAND CENTER</span>
        <h1 className="wg-hero-title" style={{ marginTop: "0.6rem" }}>
          WeatherGPT <span className="wg-gradient-text">— AI Weather Intelligence</span>
        </h1>
        <p style={{ margin: "0.6rem 0 0", color: "var(--wg-muted)", fontSize: "clamp(0.85rem, 2vw, 1rem)", maxWidth: "44rem", lineHeight: 1.6 }}>
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
          <div className="wg-mono" style={{ marginTop: "0.7rem", fontSize: "0.68rem", color: "var(--wg-muted)" }}>
            SOURCE {weather.data_source} · STATUS {weather.status} · UPDATED {weather.updated_at_ist || "—"} · {weather.nwp_model}
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
