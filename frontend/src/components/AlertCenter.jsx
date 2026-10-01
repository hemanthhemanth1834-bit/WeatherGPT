import React, { useEffect, useState } from "react";
import { fetchActiveAlerts, fetchIndiaAlerts } from "../services/api";
import { speechEngine } from "../services/voice";
import EmergencyContacts from "./EmergencyContacts";

const FILTERS = ["All", "Red", "Orange", "Yellow"];

export default function AlertCenter({ onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [india, setIndia] = useState(null);
  const [scope, setScope] = useState("telemetry");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voicing, setVoicing] = useState(null);
  const [showContacts, setShowContacts] = useState(false);

  const load = async (level) => {
    setBusy(true);
    setError("");
    try {
      const data = await fetchActiveAlerts(level === "All" ? null : level);
      setAlerts(data);
      if (typeof window !== "undefined" && "Notification" in window &&
          Notification.permission === "granted" && data.length > 0 && !load.notified) {
        load.notified = true;
        try {
          new Notification(`WeatherGPT: ${data[0].severity} alert`, { body: data[0].headline });
        } catch {
          /* blocked by browser policy */
        }
      }
    } catch {
      setError("Alert feed failed — the backend may be unreachable. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("Browser notifications are not supported here.");
      return;
    }
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      setError("Notification permission was not granted.");
    } else {
      load.notified = false;
      load(filter);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    if (scope === "india" && !india) {
      fetchIndiaAlerts()
        .then((d) => !cancelled && setIndia(d))
        .catch(() => !cancelled && setIndia({ items: [], disclaimer: "" }));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

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
        <div role="group" aria-label="Alert scope" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {[["telemetry", "Telemetry alerts"], ["india", "India focus"]].map(([id, label]) => (
            <button key={id} className="wg-tab" aria-selected={scope === id} onClick={() => setScope(id)}>
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Filter by severity" style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {FILTERS.map((level) => (
            <button key={level} className="wg-tab" aria-selected={filter === level} onClick={() => setFilter(level)}>
              {level}
            </button>
          ))}
          <button className="wg-btn-ghost" style={{ fontSize: "0.72rem" }} onClick={() => setShowContacts(true)}>
            📞 Emergency contacts
          </button>
          <button className="wg-btn-ghost" style={{ fontSize: "0.72rem" }} onClick={enableNotifications} title="One browser notification per session for the top alert">
            🔔 Notify me
          </button>
        </div>
      </div>
      {showContacts && <EmergencyContacts onClose={() => setShowContacts(false)} />}

      {scope === "india" && (
        <div className="wg-card" style={{ padding: "0.9rem 1.1rem" }}>
          <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.85rem" }}>
            🇮🇳 India focus <span className="wg-chip estimated" style={{ marginLeft: "0.4rem" }}>FUSED LAYER</span>
          </h3>
          {!india ? (
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>Loading fused layer…</p>
          ) : india.items?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "18rem", overflowY: "auto" }}>
              {india.items.slice(0, 10).map((item, i) => (
                <div key={i} style={{ fontSize: "0.78rem", padding: "0.45rem 0.65rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
                  <strong>[{item.severity}]</strong> {item.headline}
                  <span className="wg-mono" style={{ display: "block", fontSize: "0.64rem", color: "var(--wg-muted)" }}>
                    {item.source} · {item.source_type}{item.official ? " · OFFICIAL third-party" : " · unofficial"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>No India items right now.</p>
          )}
          {india?.disclaimer && (
            <p style={{ fontSize: "0.66rem", color: "var(--wg-muted)", margin: "0.4rem 0 0" }}>{india.disclaimer}</p>
          )}
        </div>
      )}

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
