import React, { useEffect, useState } from "react";
import { Thermometer } from "lucide-react";
import { fetchClimateHistory, fetchClimateMonthly, fetchClimateTrends } from "../services/api";

function Bars({ values, color, format, labels = [], ariaLabel = "Climate chart" }) {
  const nums = values.map(Number);
  const finite = nums.filter(Number.isFinite);
  if (!finite.length) return null;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = Math.max(max - min, 1);
  const pad = span * 0.16;
  const lo = min - pad;
  const hi = max + pad;
  const W = 1100, H = 280, L = 58, R = 22, T = 24, B = 48;
  const pts = nums.map((v, i) => {
    const x = L + (i / Math.max(1, nums.length - 1)) * (W - L - R);
    const y = H - B - ((v - lo) / (hi - lo)) * (H - T - B);
    return { x, y, v, label: labels[i] || String(i + 1) };
  });
  const line = pts.map((p, i) => (i ? "L " : "M ") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  const area = line + ` L ${pts.at(-1)?.x || L} ${H-B} L ${pts[0]?.x || L} ${H-B} Z`;
  const step = Math.max(1, Math.ceil(pts.length / 6));
  return (
    <div className="wg-climate-chart" role="img" aria-label={ariaLabel}>
      <div className="wg-climate-chart-head">
        <span><b>Live data visualization</b><small>Hover points for exact values</small></span>
        <span className="wg-climate-chart-status">● DATA CONNECTED</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0,1,2,3].map(i => {
          const y = T + i * ((H-T-B)/3);
          const v = hi - i * ((hi-lo)/3);
          return <g key={i}>
            <line x1={L} x2={W-R} y1={y} y2={y} className="wg-climate-grid"/>
            <text x="8" y={y+4} className="wg-climate-axis">{format(v)}</text>
          </g>;
        })}
        <path d={area} className="wg-climate-area" style={{"--wg-climate-color": color}}/>
        <path d={line} className="wg-climate-line" style={{"--wg-climate-color": color}}/>
        {pts.map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" className="wg-climate-point" style={{"--wg-climate-color": color}}>
              <title>{p.label}: {format(p.v)}</title>
            </circle>
            {i % step === 0 && <text x={p.x} y={H-13} textAnchor="middle" className="wg-climate-label">{p.label}</text>}
          </g>
        ))}
      </svg>
      <div className="wg-climate-legend"><span>● {pts.length} real data points</span><span>Range: {format(min)} – {format(max)}</span></div>
    </div>
  );
}

export default function ClimateAnalytics({ onAsk }) {
  const [data, setData] = useState(null);
  const [region, setRegion] = useState("All India");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [observed, setObserved] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear() - 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const result = await fetchClimateTrends(region);
        if (!cancelled) setData(result);
        fetchClimateHistory(region === "All India" ? "New Delhi" : region, 5)
          .then((h) => !cancelled && setObserved(h))
          .catch(() => !cancelled && setObserved(null));
        fetchClimateMonthly(region === "All India" ? "New Delhi" : region, year)
          .then((m) => !cancelled && setMonthly(m))
          .catch(() => !cancelled && setMonthly(null));
      } catch {
        if (!cancelled) setError("Climate reference failed to load — please retry.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, year]);

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
        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.78rem" }}>
          Observed year
          <input className="wg-input" style={{ width: "6rem" }} type="number" value={year} min={1940} max={new Date().getFullYear() - 1}
            onChange={(e) => setYear(Number(e.target.value))} aria-label="Observed year" />
        </label>
      </div>

      {monthly && (
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Thermometer size={14} /> Monthly {monthly.year} — {monthly.location}{" "}
            <span className="wg-chip live" style={{ marginLeft: "0.4rem" }}>OBSERVED · ERA5</span>
          </h3>
          <Bars values={monthly.months.map((m) => m.total_rain_mm)} labels={monthly.months.map((m) => m.month)} color="#38bdf8" format={(v) => `${Math.round(v)} mm`} ariaLabel="Monthly observed rainfall chart" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.9rem", fontSize: "0.7rem", color: "var(--wg-muted)", marginTop: "0.3rem" }}>
            {monthly.months.map((m) => (
              <span key={m.month} className="wg-mono">{m.month}: {m.mean_max_c}°C · {Math.round(m.total_rain_mm)}mm{m.mean_humidity_pct != null ? ` · ${m.mean_humidity_pct}%` : ""}</span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}
      {busy && <div role="status" style={{ color: "var(--wg-muted)" }}>Loading…</div>}

      {data && (
        <>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>{data.summary}</p>
          {observed && (
            <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
              <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.82rem" }}>
                Observed recent years — {observed.location} ({observed.period}){" "}
                <span className="wg-chip live" style={{ marginLeft: "0.4rem" }}>OBSERVED · ERA5</span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {observed.years.map((y) => (
                  <div key={y.year} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1rem", fontSize: "0.78rem", padding: "0.4rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
                    <strong className="wg-mono">{y.year}</strong>
                    <span>mean max <strong>{y.mean_max_c}°C</strong></span>
                    <span>rain <strong>{y.total_rain_mm} mm</strong></span>
                    <span>40°C+ days <strong>{y.hot_days_ge40c}</strong></span>
                    <span>wet days <strong>{y.wet_days_ge25mm}</strong></span>
                  </div>
                ))}
              </div>
              <p className="wg-mono" style={{ fontSize: "0.64rem", color: "var(--wg-muted)" }}>SOURCE Open-Meteo Archive API · {observed.data_type}</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(18rem,1fr))", gap: "0.7rem" }}>
            <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
              <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.82rem" }}>Temperature anomaly (°C)</h3>
              <Bars values={data.temperature_anomaly_celsius} labels={data.decadal_years} color="#f87171" format={(v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}°C`} ariaLabel="Temperature anomaly chart" />
              <p className="wg-mono" style={{ fontSize: "0.65rem", color: "var(--wg-muted)" }}>{data.decadal_years.join(" · ")}</p>
            </div>
            <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
              <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.82rem" }}>Monsoon departure (% of {data.lpa_monsoon_rainfall_mm} mm LPA)</h3>
              <Bars values={data.monsoon_departure_pct} labels={data.decadal_years} color="#38bdf8" format={(v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`} ariaLabel="Monsoon rainfall departure chart" />
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
