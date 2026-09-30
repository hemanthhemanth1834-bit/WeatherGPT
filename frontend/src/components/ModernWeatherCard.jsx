import React from "react";

/* Compact weather summary used inside chat replies. Original component. */
const GLYPH = {
  Sun: "☀️",
  SunMedium: "🌤️",
  CloudSun: "⛅",
  Cloud: "☁️",
  CloudFog: "🌫️",
  CloudDrizzle: "🌦️",
  CloudRain: "🌧️",
  CloudRainWind: "⛈️",
  CloudLightning: "🌩️",
  CloudHail: "🌨️",
  Snowflake: "❄️",
};

export function glyphFor(icon) {
  return GLYPH[icon] || "🌤️";
}

export default function ModernWeatherCard({ weather }) {
  if (!weather) return null;
  const peak = weather.hourly?.length
    ? Math.max(...weather.hourly.slice(0, 12).map((h) => h.rain_prob))
    : 0;
  return (
    <div className="wg-card" style={{ padding: "0.8rem 1rem" }} aria-label={`Current weather for ${weather.location}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1rem" }}>
            {weather.location}, {weather.state}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--wg-muted)" }}>
            {weather.condition} · feels {weather.feels_like}°C · 💧 {weather.humidity}% · 💨 {weather.wind_speed} km/h {weather.wind_direction}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.9rem", fontWeight: 800 }}>{weather.current_temp}°</div>
          <div style={{ fontSize: "1.2rem" }} aria-hidden="true">
            {glyphFor(weather.icon)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "0.45rem", fontSize: "0.72rem", color: "var(--wg-muted)" }} className="wg-mono">
        SOURCE {weather.data_source} · {weather.status} · {weather.updated_at_ist} · peak rain {peak}%
      </div>
    </div>
  );
}
