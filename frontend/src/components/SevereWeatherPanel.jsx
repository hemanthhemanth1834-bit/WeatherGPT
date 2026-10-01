import React, { useEffect, useState } from "react";
import { fetchActiveAlerts, fetchCycloneTrack, fetchDisasters, fetchRiskAssessment } from "../services/api";
import BlueprintBuilder from "./BlueprintBuilder";
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

export default function SevereWeatherPanel({ weather, onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [track, setTrack] = useState(null);
  const [cat, setCat] = useState("Cyclone");
  const [error, setError] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [global, setGlobal] = useState(null);
  const [risk, setRisk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [al, tr, gd] = await Promise.all([
          fetchActiveAlerts(),
          fetchCycloneTrack(),
          fetchDisasters("world").catch(() => null),
        ]);
        if (!cancelled) {
          setAlerts(al);
          setTrack(tr);
          setGlobal(gd);
        }
      } catch {
        if (!cancelled) setError("Severe-weather feed failed to load — please retry.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <a className="wg-btn-ghost" href="tel:112" aria-label="Call national emergency 112">112</a>
            <a className="wg-btn-ghost" href="tel:1078" aria-label="Call NDMA helpline 1078">1078</a>
          </div>
        </div>
      </div>
      {showContacts && <EmergencyContacts onClose={() => setShowContacts(false)} />}

      <BlueprintBuilder risk={risk} weather={weather} />

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}

      {global && global.events?.length > 0 && (
        <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
          <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.85rem" }}>
            🌍 Global disaster events <span className="wg-chip live" style={{ marginLeft: "0.4rem" }}>OFFICIAL · GDACS</span>
          </h3>
          <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)", margin: "0 0 0.5rem" }}>
            Read-only third-party feed (UN JRC). Context only — Indian warnings come from IMD/NDMA.{" "}
            {global.events.some((e) => e.near_india) ? "Some events touch the Indian region." : "No current events touch the Indian region."}
          </p>
          <div className="wg-scrollrow">
            {global.events.slice(0, 8).map((e, i) => (
              <a key={i} href={e.report_url} target="_blank" rel="noreferrer" className="wg-card hoverable"
                style={{ minWidth: "15rem", padding: "0.65rem 0.8rem", textDecoration: "none", color: "inherit" }}>
                <span className={`wg-chip ${e.alert_level === "Red" ? "off" : e.alert_level === "Orange" ? "demo" : "static"}`}>{e.alert_level}</span>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", marginTop: "0.3rem" }}>{e.event_label}</div>
                <div style={{ fontSize: "0.74rem", color: "var(--wg-muted)" }}>{e.name}</div>
                <div className="wg-mono" style={{ fontSize: "0.64rem", color: "var(--wg-muted)" }}>
                  {e.from ? e.from.slice(0, 10) : ""} → {e.to ? e.to.slice(0, 10) : "ongoing"}{e.near_india ? " · 🇮🇳 near India" : ""}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.85rem" }}>
          🛟 General preparedness <span className="wg-chip static" style={{ marginLeft: "0.4rem" }}>STATIC GUIDANCE</span>
        </h3>
        <div className="wg-grid-panels" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
          <div><strong>Before:</strong> charge phones, store water/documents, know high ground and the 112 helpline.</div>
          <div><strong>During floods/storms:</strong> avoid underpasses and riverbanks, stay indoors away from windows, never drive through flowing water.</div>
          <div><strong>During heat:</strong> hydrate, avoid 12–3 PM sun, check on elderly neighbours.</div>
          <div><strong>After:</strong> avoid floodwater (electrical + contamination risk), report outages, follow official all-clear.</div>
        </div>
      </div>

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
