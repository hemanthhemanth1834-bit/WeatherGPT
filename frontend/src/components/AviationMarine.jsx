import React, { useEffect, useState } from "react";
import { fetchAviationBriefing, fetchMarineAdvisory } from "../services/api";

const AIRPORTS = [
  ["VIDP", "Delhi VIDP"],
  ["VABB", "Mumbai VABB"],
  ["VOBL", "Bengaluru VOBL"],
  ["VECC", "Kolkata VECC"],
];
const COASTS = [
  ["mumbai", "Mumbai / Konkan"],
  ["goa", "Goa"],
  ["kochi", "Kochi / Malabar"],
  ["chennai", "Chennai / Coromandel"],
  ["visakhapatnam", "Visakhapatnam"],
  ["puri", "Puri / Odisha"],
];

export default function AviationMarine({ onAsk }) {
  const [airport, setAirport] = useState("VIDP");
  const [coast, setCoast] = useState("mumbai");
  const [briefing, setBriefing] = useState(null);
  const [sea, setSea] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const [av, mr] = await Promise.all([fetchAviationBriefing(airport), fetchMarineAdvisory(coast)]);
        if (!cancelled) {
          setBriefing(av);
          setSea(mr);
        }
      } catch {
        if (!cancelled) setError("Air/sea panels failed to load — please retry.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [airport, coast]);

  return (
    <section aria-label="Aviation and marine" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>Aviation briefing</h2>
        <p style={{ margin: "0 0 0.7rem", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
          <span className="wg-chip demo">STATIC DEMO DATA</span> Sample reports for training display — not live observations, never for flight planning.
        </p>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.8rem" }} role="group" aria-label="Airport">
          {AIRPORTS.map(([icao, label]) => (
            <button key={icao} className="wg-tab" aria-selected={airport === icao} onClick={() => setAirport(icao)}>
              {label}
            </button>
          ))}
        </div>
        {briefing && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(16rem,1fr))", gap: "0.7rem" }}>
            <div>
              <div className="wg-mono" style={{ fontSize: "0.72rem", color: "var(--wg-muted)" }}>SAMPLE METAR</div>
              <p className="wg-mono" style={{ fontSize: "0.82rem" }}>{briefing.metar_raw}</p>
              <div className="wg-mono" style={{ fontSize: "0.72rem", color: "var(--wg-muted)" }}>SAMPLE TAF</div>
              <p className="wg-mono" style={{ fontSize: "0.82rem" }}>{briefing.taf_raw}</p>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--wg-muted)" }}>Flight category (sample)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{briefing.flight_category}</div>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem", fontSize: "0.82rem" }}>
                {briefing.hazards.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)" }}>{briefing.station_name}</p>
            </div>
          </div>
        )}
      </div>

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>Marine advisory</h2>
        <p style={{ margin: "0 0 0.7rem", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
          <span className="wg-chip estimated">MODEL · Open-Meteo wave model</span> Computed from live model output — not an official INCOIS bulletin.
        </p>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.8rem" }} role="group" aria-label="Coastal sector">
          {COASTS.map(([id, label]) => (
            <button key={id} className="wg-tab" aria-selected={coast === id} onClick={() => setCoast(id)}>
              {label}
            </button>
          ))}
        </div>
        {sea && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(9rem,1fr))", gap: "0.6rem", fontSize: "0.85rem" }}>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Waves</div><strong>{sea.wave_height_m} m · {sea.sea_condition}</strong></div>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Direction / Period</div><strong>{sea.wave_direction != null ? `${sea.wave_direction}°` : "—"} / {sea.wave_period_s != null ? `${sea.wave_period_s}s` : "—"}</strong></div>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Sea temp</div><strong>{sea.sea_surface_temp_c != null ? `${sea.sea_surface_temp_c}°C` : "—"}</strong></div>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Wind</div><strong>{sea.wind_speed_knots} kt</strong></div>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Zone</div><strong>{sea.coastal_zone}</strong></div>
            <div><div style={{ color: "var(--wg-muted)", fontSize: "0.72rem" }}>Provenance</div><strong style={{ fontSize: "0.72rem" }}>{sea.provenance || "MODEL"}</strong></div>
            <p style={{ gridColumn: "1/-1", margin: 0 }}>{sea.warning_message}</p>
            <p className="wg-mono" style={{ gridColumn: "1/-1", margin: 0, fontSize: "0.7rem", color: "var(--wg-muted)" }}>
              High tide {sea.high_tide_time} · Low tide {sea.low_tide_time} (indicative)
            </p>
          </div>
        )}
        <button className="wg-btn" style={{ marginTop: "0.7rem" }} onClick={() => onAsk(`Marine and wave conditions near ${coast}`)}>
          Ask marine assistant →
        </button>
      </div>
    </section>
  );
}
