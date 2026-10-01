import React, { useEffect } from "react";

/* Printable, copyable weather brief. Original component.
   Assembled only from live payload fields — labelled UNOFFICIAL. */
export default function WeatherBrief({ weather, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!weather) return null;
  const today = weather.daily?.[0];
  const text =
    `WeatherGPT briefing (UNOFFICIAL) — ${weather.location}, ${weather.state}\n` +
    `Updated ${weather.updated_at_ist} IST from ${weather.data_source} (${weather.status}).\n\n` +
    `Now: ${weather.condition}, ${weather.current_temp}°C (feels ${weather.feels_like}°C). ` +
    `Humidity ${weather.humidity}%, wind ${weather.wind_speed} km/h ${weather.wind_direction}, ` +
    `precipitation ${weather.precipitation} mm, cloud ${weather.cloud_cover ?? 0}%, ` +
    `pressure ${weather.pressure} hPa, UV ${weather.uv_index}, visibility ${weather.visibility} km.\n` +
    (today ? `Today: high ${today.temp_max}°C, low ${today.temp_min}°C, rain ${today.rain_sum} mm.\n` : "") +
    `Sunrise ${weather.sunrise}, sunset ${weather.sunset} IST.\n\n` +
    `Not an official IMD bulletin. Verify critical decisions with official sources.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <div className="wg-drawer-veil" onClick={onClose} aria-hidden="true" />
      <div className="wg-card" role="dialog" aria-modal="true" aria-label="Weather briefing"
        style={{ position: "fixed", zIndex: 62, top: "8vh", left: "50%", transform: "translateX(-50%)", width: "min(38rem, 94vw)", maxHeight: "80vh", overflowY: "auto", padding: "1.2rem 1.3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
          <h3 style={{ margin: 0 }}>📄 Weather brief <span className="wg-chip static">UNOFFICIAL</span></h3>
          <button className="wg-btn-ghost" onClick={onClose} aria-label="Close briefing">✕</button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.82rem", lineHeight: 1.65, fontFamily: "var(--wg-font)" }}>{text}</pre>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
          <button className="wg-btn-ghost" onClick={copy}>⧉ Copy text</button>
          <button className="wg-btn" onClick={() => window.print()}>🖨 Print / Save PDF</button>
        </div>
      </div>
    </>
  );
}
