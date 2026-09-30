import React, { useEffect, useState } from "react";
import { fetchActiveAlerts, fetchCycloneTrack } from "../services/api";
import EmergencyContacts from "./EmergencyContacts";

const CATS = ["Cyclone", "Heavy Rain", "Flood", "Thunderstorm", "Lightning", "Heatwave", "Cold Wave", "Strong Wind"];

function matchesCategory(alert, cat) {
  const hay = `${alert.event} ${alert.headline}`.toLowerCase();
  const keys = {
    Cyclone: ["cyclone", "depression", "synoptic"],
    "Heavy Rain": ["heavy rain", "flood"],
    Flood: ["flood"],
    Thunderstorm: ["thunderstorm", "squall"],
    Lightning: ["lightning", "thunderstorm"],
    Heatwave: ["heat"],
    "Cold Wave": ["cold"],
    "Strong Wind": ["wind", "coastal", "surge", "gust"],
  }[cat] || [];
  return keys.some((k) => hay.includes(k));
}

export default function SevereWeatherPanel({ onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [track, setTrack] = useState(null);
  const [cat, setCat] = useState("Cyclone");
  const [error, setError] = useState("");
  const [showContacts, setShowContacts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [al, tr] = await Promise.all([fetchActiveAlerts(), fetchCycloneTrack()]);
        if (!cancelled) {
          setAlerts(al);
          setTrack(tr);
        }
      } catch {
        if (!cancelled) setError("Severe-weather feed failed to load — please retry.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = alerts.filter((a) => matchesCategory(a, cat));

  return (
    <section aria-label="Severe weather" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem" }}>🌀 Severe-weather desk</h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
              <span className="wg-chip demo">TRACK: DEMO DATA</span>{" "}
              <span className="wg-chip estimated">ALERTS: COMPUTED</span>{" "}
              Illustrative cyclone geometry and telemetry-derived warnings — never official bulletins.
            </p>
          </div>
          <button className="wg-btn" onClick={() => setShowContacts(true)}>📞 Emergency contacts</button>
        </div>
      </div>
      {showContacts && <EmergencyContacts onClose={() => setShowContacts(false)} />}

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}

      <div className="wg-grid-panels">
        <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
          <div className="wg-section-title">Cyclone status · Bay of Bengal (DEMO)</div>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.65 }}>
            System: <strong>{track?.system_name || "Illustrative low-pressure track"}</strong>
            <br />Basin: {track?.basin || "Bay of Bengal"} · plotted {track?.features?.[1]?.properties?.time || "recently"}
            <br />Movement: north-westward along the plotted line; forecast points are illustrative, not predicted landfall.
          </p>
          <p className="wg-mono" style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>
            {track?.disclaimer || "Demonstration geometry for map display."}
          </p>
          <button className="wg-btn-ghost" onClick={() => onAsk("Is there a cyclone threat for Odisha right now?")}>
            Ask about cyclone risk →
          </button>
        </div>
        <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
          <div className="wg-section-title">Browse by hazard</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }} role="group" aria-label="Hazard category">
            {CATS.map((c) => (
              <button key={c} className="wg-tab" aria-selected={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div style={{ marginTop: "0.7rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {shown.length === 0 && <p style={{ fontSize: "0.82rem", color: "var(--wg-muted)" }}>No computed {cat.toLowerCase()} alerts right now.</p>}
            {shown.map((a) => (
              <div key={a.id} style={{ fontSize: "0.82rem", padding: "0.5rem 0.7rem", background: "rgba(148,163,184,.06)", borderRadius: "0.6rem" }}>
                <strong>[{a.severity}]</strong> {a.headline}
                <span className="wg-mono" style={{ display: "block", fontSize: "0.66rem", color: "var(--wg-muted)" }}>
                  {a.district} · {a.effective} → {a.expires}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
