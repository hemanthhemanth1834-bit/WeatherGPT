import React, { useState } from "react";
import { fetchCurrentWeather, fetchRiskAssessment } from "../services/api";
import SourceBadge from "./SourceBadge";

const LEVEL_STYLES = {
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  MODERATE: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  EXTREME: "bg-red-500/15 text-red-300 border-red-500/40",
};

export default function RiskPanel({ location }) {
  const [risk, setRisk] = useState(null);
  const [climate, setClimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [r, w] = await Promise.all([
        fetchRiskAssessment(location || "Pune"),
        fetchCurrentWeather(location || "Pune"),
      ]);
      setRisk(r);
      setClimate(w);
    } catch (e) {
      setError("Risk engine unavailable. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const drivers = climate && risk
    ? [
        { hazard: "heat", value: `${climate.current_temp}°C (feels ${climate.feels_like}°C)`, level: risk.levels.heat },
        { hazard: "rainfall", value: `${climate.precipitation} mm now · ${climate.hourly?.[0]?.rain_prob ?? 0}% next hour`, level: risk.levels.rainfall },
        { hazard: "flood", value: `driven by rainfall · 24h ${climate.daily?.[0]?.rain_sum ?? 0} mm`, level: risk.levels.flood },
        { hazard: "wind", value: `${climate.wind_speed} km/h ${climate.wind_direction}`, level: risk.levels.wind },
        { hazard: "thunderstorm", value: `${climate.condition} (code ${climate.condition_code})`, level: risk.levels.thunderstorm },
        { hazard: "cyclone", value: "wind + rain coincidence check", level: risk.levels.cyclone },
      ]
    : [];

  return (
    <div className="wg-card wg-enter" style={{ padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem" }}>Deterministic Risk Engine <span style={{ color: "var(--wg-muted)" }}>(ESTIMATED — not an official warning)</span></h3>
        <button onClick={load} disabled={loading} className="wg-btn" style={{ fontSize: "0.75rem", padding: "0.45rem 0.85rem" }}>
          {loading ? "Assessing…" : "Assess risk"}
        </button>
      </div>
      <SourceBadge source="WeatherGPT Risk Engine v1 (local) + Open-Meteo live values" dataType="ESTIMATED" status="SIMULATED" />
      {error && <div className="wg-alert error" role="alert">{error}</div>}
      {!risk && !loading && !error && (
        <p style={{ fontSize: "0.8rem", color: "var(--wg-muted)", margin: 0 }}>
          Computes LOW / MODERATE / HIGH / EXTREME for heat, rainfall, flood, wind, thunderstorm and cyclone
          from documented thresholds. Always follow IMD / NDMA / local authority instructions.
        </p>
      )}
      {risk && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>Overall for {risk.location}:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${LEVEL_STYLES[risk.overall]}`}>{risk.overall}</span>
            <span className="wg-mono" style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>
              {climate ? `at ${climate.current_temp}°C · ${climate.updated_at_ist}` : ""}
            </span>
          </div>
          <div className="wg-grid-tiles">
            {drivers.map((d) => (
              <div key={d.hazard} className="wg-card wg-tile">
                <div className="k">{d.hazard}</div>
                <div><span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${LEVEL_STYLES[d.level]}`}>{d.level}</span></div>
                <div className="s">{d.value}</div>
              </div>
            ))}
          </div>
          {(risk.advisories || []).map((a, i) => (
            <p key={i} className="wg-alert warn" style={{ margin: 0 }}>{a}</p>
          ))}
          <p style={{ fontSize: "0.68rem", color: "var(--wg-faint)", margin: 0 }}>{risk.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
