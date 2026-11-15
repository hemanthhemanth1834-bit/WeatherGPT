import React from "react";
import WxIcon from "./WxIcon";

/* Compact weather summary used inside chat replies. Original component. */
export default function ModernWeatherCard({ weather, compact = false, provenance = null }) {
  if (!weather) return null;
  const peak = weather.hourly?.length
    ? Math.max(...weather.hourly.slice(0, 12).map((h) => h.rain_prob))
    : 0;
  const provSource = provenance?.source;
  const source = (typeof provSource === "string" ? provSource : provSource?.name) || weather.data_source;
  const freshness = provenance?.freshness || weather.freshness || weather.status;
  const updated = provenance?.retrieved_at || weather.conditions_at_ist || weather.updated_at_ist;
  return (
    <div
      className="wg-card"
      style={{ padding: compact ? "0.65rem 0.85rem" : "0.8rem 1rem" }}
      aria-label={`Current weather for ${weather.location}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: compact ? "0.92rem" : "1rem" }}>
            {weather.location}, {weather.state}
          </div>
          <div style={{ fontSize: compact ? "0.7rem" : "0.75rem", color: "var(--wg-muted)" }}>
            {weather.condition} · feels {weather.feels_like}°C · 💧 {weather.humidity}% · 💨 {weather.wind_speed} km/h {weather.wind_direction}
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ fontSize: compact ? "1.55rem" : "1.9rem", fontWeight: 800 }}>{weather.current_temp}°</div>
          <WxIcon icon={weather.icon} size={compact ? 36 : 44} />
        </div>
      </div>
      <div
        style={{
          marginTop: compact ? "0.35rem" : "0.45rem",
          fontSize: "0.7rem",
          color: "var(--wg-muted)",
        }}
        className="wg-mono"
      >
        SOURCE {source} · {freshness}
        {updated ? ` · ${updated}` : ""} · peak rain {peak}%
      </div>
    </div>
  );
}
