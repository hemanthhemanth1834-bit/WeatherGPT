import React, { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { fetchCropAdvisory, fetchCurrentWeather } from "../services/api";
import { speechEngine } from "../services/voice";

const CROPS = [
  ["paddy", "Paddy / Rice"],
  ["cotton", "Cotton"],
  ["wheat", "Wheat"],
  ["sugarcane", "Sugarcane"],
  ["soybean", "Soybean"],
  ["mustard", "Mustard"],
];

export default function AgriAdvisor({ place, onAsk }) {
  const [crop, setCrop] = useState("cotton");
  const [district, setDistrict] = useState(place || "Nagpur");
  const [data, setData] = useState(null);
  const [wx, setWx] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voicing, setVoicing] = useState(false);

  useEffect(() => {
    if (place && place !== district) setDistrict(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const [result, live] = await Promise.all([
          fetchCropAdvisory(crop, district),
          fetchCurrentWeather(district).catch(() => null),
        ]);
        if (!cancelled) {
          setData(result);
          setWx(live);
        }
      } catch {
        if (!cancelled) setError("Advisory failed to load — please retry.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crop, district]);

  const readAloud = () => {
    if (!data) return;
    if (voicing) {
      speechEngine.stopSpeaking();
      setVoicing(false);
    } else {
      speechEngine.speak(`${data.crop} सलाह: ${data.irrigation_advice} ${data.pesticide_advice}`, "hi", () => setVoicing(false));
      setVoicing(true);
    }
  };

  return (
    <section aria-label="Farm advisories" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Sprout size={19} color="#34d399" /> Farm advisories
        </h2>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--wg-muted)" }}>
          Weather-driven field guidance in Meghdoot-style format (DEMO-grade).{" "}
          <strong>Informational only — not professional agronomic advice.</strong>
        </p>
        {data && (
          <p className="wg-mono" style={{ margin: "0.45rem 0 0", fontSize: "0.68rem", color: "var(--wg-muted)" }}>
            INPUT: {data.weather_summary} · {data.district}, {data.state} · COMPUTED, not an official IMD advisory
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.7rem", alignItems: "center" }}>
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.78rem" }}>
            Crop
            <select className="wg-input" style={{ width: "auto" }} value={crop} onChange={(e) => setCrop(e.target.value)} aria-label="Crop">
              {CROPS.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.78rem" }}>
            District
            <input className="wg-input" style={{ width: "10rem" }} value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District" />
          </label>
          <button className="wg-btn-ghost" onClick={readAloud} disabled={!data}>
            {voicing ? "⏹ Stop audio" : "🔊 Listen (Hindi)"}
          </button>
          <button className="wg-btn" onClick={() => onAsk(`Pest and irrigation advisory for ${crop} in ${district}`)}>
            Ask AI agronomist →
          </button>
        </div>
        {wx && (
          <p className="wg-mono" style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "var(--wg-muted)" }}>
            DISTRICT NOW: {wx.location} {wx.current_temp}°C · rain {wx.hourly?.[0]?.rain_prob ?? 0}% · wind {wx.wind_speed} km/h · {wx.updated_at_ist}
          </p>
        )}
      </div>

      {error && <div className="wg-alert error" role="alert">⚠️ {error}</div>}
      {busy && <div role="status" style={{ color: "var(--wg-muted)" }}>Loading advisory…</div>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(16rem,1fr))", gap: "0.7rem" }}>
          <div className="wg-card" style={{ padding: "0.95rem 1.05rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>💧 Irrigation</h3>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.6 }}>{data.irrigation_advice}</p>
          </div>
          <div className="wg-card" style={{ padding: "0.95rem 1.05rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>🐛 Spray timing</h3>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.6 }}>{data.pesticide_advice}</p>
          </div>
          <div className="wg-card" style={{ padding: "0.95rem 1.05rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>🌾 Harvest</h3>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.6 }}>{data.harvest_recommendation}</p>
          </div>
          <div className="wg-card" style={{ padding: "0.95rem 1.05rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.85rem" }}>⚡ Field safety</h3>
            <p style={{ margin: 0, fontSize: "0.83rem" }}>
              {data.damini_lightning_alert ? "High lightning risk — suspend open-field work." : "No lightning signal in current data."}
            </p>
            <p className="wg-mono" style={{ fontSize: "0.7rem", color: "var(--wg-muted)" }}>
              Stage {data.growth_stage} · {data.district}, {data.state} · suitability {data.suitability_score}%
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
