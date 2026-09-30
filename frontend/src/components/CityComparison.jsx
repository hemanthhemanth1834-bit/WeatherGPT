import React, { useEffect, useState } from "react";
import { fetchCityComparison } from "../services/api";

const PRESETS = [
  ["Mumbai", "Delhi"],
  ["Pune", "Goa"],
  ["Bengaluru", "Hyderabad"],
  ["Kolkata", "Chennai"],
  ["Shimla", "Manali"],
];

function Row({ label, a, b }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "7rem 1fr 1fr", gap: "0.5rem", fontSize: "0.83rem", padding: "0.45rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
      <span style={{ color: "var(--wg-muted)" }}>{label}</span>
      <strong>{a}</strong>
      <strong>{b}</strong>
    </div>
  );
}

export default function CityComparison({ onAsk }) {
  const [first, setFirst] = useState("Mumbai");
  const [second, setSecond] = useState("Delhi");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async (a, b) => {
    if (!a.trim() || !b.trim()) return;
    setBusy(true);
    setError("");
    try {
      setResult(await fetchCityComparison(a.trim(), b.trim()));
    } catch {
      setError("Comparison failed — the backend may be unreachable. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load("Mumbai", "Delhi");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-label="City comparison" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h2 style={{ margin: "0 0 0.6rem", fontSize: "1.15rem" }}>City vs city</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(first, second);
          }}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}
        >
          <input className="wg-input" style={{ maxWidth: "12rem" }} value={first} onChange={(e) => setFirst(e.target.value)} aria-label="First city" />
          <span aria-hidden="true">⇄</span>
          <input className="wg-input" style={{ maxWidth: "12rem" }} value={second} onChange={(e) => setSecond(e.target.value)} aria-label="Second city" />
          <button className="wg-btn" type="submit" disabled={busy}>
            {busy ? "Comparing…" : "Compare"}
          </button>
        </form>
        <div className="wg-scrollrow" style={{ marginTop: "0.6rem" }}>
          {PRESETS.map(([a, b]) => (
            <button key={`${a}-${b}`} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => { setFirst(a); setSecond(b); load(a, b); }}>
              {a} ⇄ {b}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}

      {result && (
        <div className="wg-card" style={{ padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "7rem 1fr 1fr", gap: "0.5rem", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
            <span />
            <strong>{result.city1.location}</strong>
            <strong>{result.city2.location}</strong>
          </div>
          <Row label="Temperature" a={`${result.city1.current_temp}°C`} b={`${result.city2.current_temp}°C`} />
          <Row label="Humidity" a={`${result.city1.humidity}%`} b={`${result.city2.humidity}%`} />
          <Row label="Wind" a={`${result.city1.wind_speed} km/h ${result.city1.wind_direction}`} b={`${result.city2.wind_speed} km/h ${result.city2.wind_direction}`} />
          <Row label="AQI (est.)" a={`${result.city1.aqi} ${result.city1.aqi_status}`} b={`${result.city2.aqi} ${result.city2.aqi_status}`} />
          <p style={{ fontSize: "0.85rem", margin: "0.3rem 0 0" }}>
            Warmer: <strong>{result.temp_warmer_city}</strong> ({result.temp_diff}°C) · Cleaner air:{" "}
            <strong>{result.aqi_better_city}</strong> · Travel safety: <strong>{result.travel_safety_score}/100</strong>
          </p>
          <p style={{ fontSize: "0.83rem", color: "var(--wg-muted)", margin: 0 }}>{result.travel_advisory}</p>
          <button className="wg-btn" style={{ alignSelf: "flex-start" }} onClick={() => onAsk(`Compare ${result.city1.location} and ${result.city2.location} weather in detail`)}>
            Ask AI analysis →
          </button>
        </div>
      )}
    </section>
  );
}
