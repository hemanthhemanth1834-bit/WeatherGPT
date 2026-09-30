import React, { useEffect, useState } from "react";
import { fetchClimateTrends } from "../services/api";

function Bars({ values, color, format }) {
  const peak = Math.max(...values.map((v) => Math.abs(v)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.45rem", height: "9rem", paddingTop: "0.5rem" }} role="img" aria-label="Bar chart">
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", height: "100%", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "0.62rem" }} className="wg-mono">{format(v)}</span>
          <div style={{ width: "100%", height: `${Math.max(4, (Math.abs(v) / peak) * 100)}%`, background: color, borderRadius: "0.3rem", opacity: 0.85 }} />
        </div>
      ))}
    </div>
  );
}

export default function ClimateAnalytics({ onAsk }) {
  const [data, setData] = useState(null);
  const [region, setRegion] = useState("All India");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const result = await fetchClimateTrends(region);
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError("Climate reference failed to load — please retry.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region]);

  return (
    <section aria-label="Climate analytics" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem", display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Climate reference (1970–2026)</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
            Decadal anomalies vs {data?.baseline_period || "reference normals"}.
            <span className="wg-chip static" style={{ marginLeft: "0.5rem" }}>STATIC REFERENCE</span>
          </p>
        </div>
        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.78rem" }}>
          Region
          <input className="wg-input" style={{ width: "10rem" }} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Climate region" />
        </label>
      </div>

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}
      {busy && <div role="status" style={{ color: "var(--wg-muted)" }}>Loading…</div>}

      {data && (
        <>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>{data.summary}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(18rem,1fr))", gap: "0.7rem" }}>
            <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
              <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.82rem" }}>Temperature anomaly (°C)</h3>
              <Bars values={data.temperature_anomaly_celsius} color="#f87171" format={(v) => `${v > 0 ? "+" : ""}${v}`} />
              <p className="wg-mono" style={{ fontSize: "0.65rem", color: "var(--wg-muted)" }}>{data.decadal_years.join(" · ")}</p>
            </div>
            <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
              <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.82rem" }}>Monsoon departure (% of {data.lpa_monsoon_rainfall_mm} mm LPA)</h3>
              <Bars values={data.monsoon_departure_pct} color="#38bdf8" format={(v) => `${v > 0 ? "+" : ""}${v}%`} />
              <p className="wg-mono" style={{ fontSize: "0.65rem", color: "var(--wg-muted)" }}>{data.decadal_years.join(" · ")}</p>
            </div>
          </div>
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.82rem" }}>Key shifts</h3>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.83rem", lineHeight: 1.6 }}>
              {data.key_insights.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
            <button className="wg-btn" style={{ marginTop: "0.7rem" }} onClick={() => onAsk("Explain India's long-term warming and monsoon shifts in simple words")}>
              Ask AI to explain →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
