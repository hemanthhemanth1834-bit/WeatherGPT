import React, { useEffect, useState } from "react";
import { fetchActiveAlerts, fetchCurrentWeather } from "../services/api";

export default function SavedPlacesPanel({ current, saved, weather, onSelect, onAddCurrent, onRemove }) {
  const [previews, setPreviews] = useState({});
  const [alertNote, setAlertNote] = useState("");
  const names = saved.slice(0, 8);
  const key = names.join("|");

  useEffect(() => {
    let cancelled = false;
    if (!key) return undefined;
    (async () => {
      const entries = {};
      for (const name of names) {
        try {
          const w = await fetchCurrentWeather(name);
          entries[name] = { temp: w.current_temp, cond: w.condition, status: w.status };
        } catch {
          entries[name] = null;
        }
      }
      if (!cancelled) setPreviews(entries);
      try {
        const alerts = await fetchActiveAlerts();
        const hit = alerts.filter((a) => names.some((s) => a.district.toLowerCase().includes(s.toLowerCase())));
        if (!cancelled) setAlertNote(hit.length ? `${hit.length} active alert(s) touch your saved places.` : "No active alerts touch your saved places right now.");
      } catch {
        if (!cancelled) setAlertNote("");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section aria-label="Saved places" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem", display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>★ Saved places</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
            Stored only in this browser (localStorage). Current: <strong>{current}</strong>
            {weather && <> · {weather.current_temp}° {weather.condition} · <span className="wg-mono">{weather.status}</span></>}
          </p>
        </div>
        <button className="wg-btn" onClick={onAddCurrent}>＋ Save current place</button>
      </div>

      {alertNote && <div className="wg-alert info" role="status">{alertNote}</div>}

      {saved.length === 0 && (
        <div className="wg-alert info" role="status">No saved places yet — search any city and it is remembered automatically, or save the current one.</div>
      )}

      <div className="wg-grid-panels">
        {saved.map((name) => {
          const p = previews[name];
          return (
            <div key={name} className="wg-card hoverable" style={{ padding: "0.95rem 1.05rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <strong>{name}</strong>
                <button className="wg-btn-ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => onRemove(name)} aria-label={`Remove ${name}`}>✕</button>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--wg-muted)", marginTop: "0.3rem" }}>
                {p === undefined ? "Loading preview…" : p === null ? "Preview unavailable (offline?)" : <>{p.temp}° · {p.cond} · <span className="wg-mono">{p.status}</span></>}
              </div>
              <button className="wg-btn" style={{ marginTop: "0.6rem", width: "100%" }} onClick={() => onSelect(name)}>
                Open →
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
