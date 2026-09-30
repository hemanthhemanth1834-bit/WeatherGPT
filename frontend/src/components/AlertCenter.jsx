import React, { useEffect, useState } from "react";
import { fetchActiveAlerts } from "../services/api";
import { speechEngine } from "../services/voice";

const FILTERS = ["All", "Red", "Orange", "Yellow"];

export default function AlertCenter({ onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voicing, setVoicing] = useState(null);

  const load = async (level) => {
    setBusy(true);
    setError("");
    try {
      setAlerts(await fetchActiveAlerts(level === "All" ? null : level));
    } catch {
      setError("Alert feed failed — the backend may be unreachable. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const broadcast = (alert) => {
    if (voicing === alert.id) {
      speechEngine.stopSpeaking();
      setVoicing(null);
    } else {
      speechEngine.speak(`${alert.headline}. ${alert.instruction}`, "hi", () => setVoicing(null));
      setVoicing(alert.id);
    }
  };

  return (
    <section aria-label="Disaster alerts" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem", display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Early-warning feed</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
            Computed from live telemetry against documented thresholds — <strong>not official IMD bulletins</strong>.
          </p>
        </div>
        <div role="group" aria-label="Filter by severity" style={{ display: "flex", gap: "0.35rem" }}>
          {FILTERS.map((level) => (
            <button key={level} className="wg-tab" aria-selected={filter === level} onClick={() => setFilter(level)}>
              {level}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="wg-alert error" role="alert">⚠️ {error}</div>
      )}
      {busy && <div role="status" style={{ color: "var(--wg-muted)", fontSize: "0.82rem" }}>Loading alerts…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(17rem,1fr))", gap: "0.7rem" }}>
        {alerts.map((a) => (
          <article key={a.id} className="wg-card" style={{ padding: "0.95rem 1.05rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span className={`wg-chip ${a.severity === "Red" ? "off" : a.severity === "Orange" ? "demo" : "static"}`}>
                {a.severity}
              </span>
              <span className="wg-mono" style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>{a.id}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{a.headline}</h3>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--wg-muted)" }}>📍 {a.area_desc}</p>
            <p style={{ margin: 0, fontSize: "0.8rem" }}>
              <strong>Recommended action:</strong> {a.instruction}
            </p>
            <p className="wg-mono" style={{ margin: 0, fontSize: "0.68rem", color: "var(--wg-muted)" }}>
              {a.effective} → {a.expires} · {a.sender_name}
            </p>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button className="wg-btn-ghost" onClick={() => broadcast(a)}>
                {voicing === a.id ? "⏹ Stop" : "🔊 Broadcast"}
              </button>
              <button className="wg-btn" onClick={() => onAsk(`Emergency response protocol for ${a.event} in ${a.district}`)}>
                AI action plan →
              </button>
            </div>
          </article>
        ))}
      </div>
      {!busy && !error && alerts.length === 0 && (
        <div className="wg-alert info" role="status">No alerts at this severity right now.</div>
      )}
    </section>
  );
}
