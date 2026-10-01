import React, { useEffect, useState } from "react";
import { fetchAirQuality, fetchRegionalTalukas, fetchUV } from "../services/api";
import { speechEngine } from "../services/voice";
import { glyphFor } from "../services/weatherGlyph";
import WeatherBrief from "./WeatherBrief";
import WxIcon from "./WxIcon";

function Metric({ label, value, sub }) {
  return (
    <div className="wg-card wg-tile">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

function SourceLine({ source, status, hint }) {
  const tone = status === "LIVE" ? "live" : status === "STATIC" ? "static" : "estimated";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", fontSize: "0.7rem", color: "var(--wg-muted)" }}>
      <span className="wg-mono">SOURCE: {source}</span>
      <span className={`wg-chip ${tone}`}>STATUS: {status}</span>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function TempSpark({ hourly }) {
  if (!hourly?.length) return null;
  const temps = hourly.slice(0, 24).map((h) => h.temp);
  const min = Math.min(...temps);
  const span = Math.max(...temps) - min || 1;
  const pts = temps.map((t, i) => `${(i / (temps.length - 1)) * 100},${34 - ((t - min) / span) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 36" role="img" aria-label="24-hour temperature curve" style={{ width: "100%", height: "3.2rem" }}>
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      {temps.filter((_, i) => i % 6 === 0).map((t, k) => (
        <text key={k} x={(k * 6 / (temps.length - 1)) * 100} y="35" fontSize="4" fill="#93a1b8">{t}°</text>
      ))}
    </svg>
  );
}

export default function WeatherDashboard({ weather, busy, onAsk }) {
  const [areas, setAreas] = useState([]);
  const [metric, setMetric] = useState("temp");
  const [aqi, setAqi] = useState(null);
  const [uv, setUv] = useState(null);
  const [brief, setBrief] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (weather?.location) {
      fetchRegionalTalukas(weather.location).then(setAreas).catch(() => setAreas([]));
    }
  }, [weather?.location]);

  useEffect(() => {
    let cancelled = false;
    if (weather?.location) {
      fetchAirQuality(weather.location, weather.lat, weather.lon)
        .then((a) => !cancelled && setAqi(a))
        .catch(() => !cancelled && setAqi(null));
      fetchUV(weather.location)
        .then((u) => !cancelled && setUv(u))
        .catch(() => !cancelled && setUv(null));
    }
    return () => {
      cancelled = true;
    };
  }, [weather?.location, weather?.lat, weather?.lon]);

  if (busy && !weather) {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", padding: "4rem 0" }}>
        <div className="wg-spin" aria-label="Loading weather" />
        <p style={{ color: "var(--wg-muted)", fontSize: "0.85rem" }}>Fetching live model data…</p>
      </div>
    );
  }
  if (!weather) {
    return (
      <div className="wg-alert info" role="status">
        No weather loaded yet. Search a place above, or allow location access.
      </div>
    );
  }

  const today = weather.daily?.[0];
  return (
    <section aria-label="Forecast dashboard" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
        <span className="wg-mono">SOURCE: {weather.data_source}</span>
        <span className="wg-mono">UPDATED: {weather.updated_at_ist || "—"}</span>
        <span className={`wg-chip ${weather.status === "LIVE" ? "live" : "simulated"}`}>STATUS: {weather.status}</span>
        <span className="wg-mono">{weather.nwp_model}</span>
      </div>

      <div className="wg-card" style={{ padding: "1.2rem 1.3rem", display: "flex", flexWrap: "wrap", gap: "1.2rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--wg-accent)", fontWeight: 700 }}>
            {weather.location}, {weather.state} · {weather.lat.toFixed(2)}°N {weather.lon.toFixed(2)}°E
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.8rem", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "3.2rem", fontWeight: 800 }}>{weather.current_temp}°</span>
            <WxIcon icon={weather.icon} size={52} />
          </div>
          <div style={{ fontWeight: 700 }}>{weather.condition}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--wg-muted)" }}>
            Feels {weather.feels_like}°C
            {today && (
              <>
                {" "}· high {today.temp_max}° / low {today.temp_min}°
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
          <div className="wg-card" style={{ padding: "0.5rem 0.9rem", textAlign: "right" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>AQI (estimated)</div>
            <div style={{ fontWeight: 800 }}>{weather.aqi} · {weather.aqi_status}</div>
          </div>
          <button className="wg-btn" onClick={() => onAsk(`Full weather and hazard outlook for ${weather.location} this week`)}>
            Ask WeatherGPT →
          </button>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="wg-btn-ghost" style={{ fontSize: "0.72rem" }} onClick={() => setBrief(true)}>
              📄 Brief
            </button>
            <button
              className="wg-btn-ghost"
              style={{ fontSize: "0.72rem" }}
              onClick={() => {
                if (speaking) {
                  speechEngine.stopSpeaking();
                  setSpeaking(false);
                } else {
                  speechEngine.speak(
                    `${weather.location}: ${weather.condition}, ${weather.current_temp} degrees. Feels like ${weather.feels_like}. Rain chance ${weather.hourly?.[0]?.rain_prob ?? 0} percent.`,
                    "en",
                    () => setSpeaking(false)
                  );
                  setSpeaking(true);
                }
              }}
              aria-label={speaking ? "Stop audio briefing" : "Listen to audio briefing"}
            >
              {speaking ? "⏹ Stop" : "🔊 Audio"}
            </button>
          </div>
        </div>
      </div>
      {brief && <WeatherBrief weather={weather} onClose={() => setBrief(false)} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(9rem,1fr))", gap: "0.6rem" }}>
        <Metric label="Humidity" value={`${weather.humidity}%`} />
        <Metric label="Wind" value={`${weather.wind_speed} km/h`} sub={weather.wind_direction} />
        <Metric label="Pressure" value={`${weather.pressure} hPa`} />
        <Metric label="Precipitation" value={`${weather.precipitation} mm`} />
        <Metric label="Cloud cover" value={`${weather.cloud_cover ?? 0}%`} sub="LIVE sky" />
        <Metric label="UV index" value={weather.uv_index} />
        <Metric label="Visibility" value={`${weather.visibility} km`} />
        <Metric label="Sunrise" value={`${weather.sunrise} IST`} />
        <Metric label="Sunset" value={`${weather.sunset} IST`} />
      </div>
      <SourceLine source={`${weather.data_source} · current conditions`} status={weather.status} hint={`Updated ${weather.updated_at_ist || "—"}`} />

      <div className="wg-grid-panels">
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>🍃 Air quality {aqi && <span className={`wg-chip ${aqi.status === "LIVE" ? "live" : "estimated"}`} style={{ marginLeft: "0.4rem" }}>{aqi.status}</span>}</h3>
          {aqi ? (
            <>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{aqi.us_aqi} <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{aqi.band}</span></div>
              <p style={{ fontSize: "0.74rem", color: "var(--wg-muted)", margin: "0.3rem 0 0", lineHeight: 1.55 }}>
                {aqi.band === "Good" && "Air looks clean — normal outdoor activity is fine."}
                {aqi.band === "Moderate" && "Air is acceptable; sensitive people should shorten long outdoor exertion."}
                {aqi.band === "Unhealthy for Sensitive Groups" && "Sensitive groups should limit prolonged outdoor exertion."}
                {aqi.band !== "Good" && aqi.band !== "Moderate" && aqi.band !== "Unhealthy for Sensitive Groups" && "Limit outdoor exertion; follow official health advisories."}
                {(weather.hourly?.[0]?.rain_prob ?? 0) >= 40 && " Incoming rain may temporarily wash out particles."}
              </p>
              <div className="wg-mono" style={{ fontSize: "0.66rem", color: "var(--wg-muted)" }}>{aqi.standard}{aqi.dominant_pollutant && aqi.dominant_pollutant !== "—" ? ` · worst: ${aqi.dominant_pollutant}` : ""}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.3rem", marginTop: "0.5rem", fontSize: "0.72rem" }}>
                {[["PM2.5", aqi.pm2_5], ["PM10", aqi.pm10], ["NO₂", aqi.nitrogen_dioxide], ["O₃", aqi.ozone], ["SO₂", aqi.sulphur_dioxide], ["CO", aqi.carbon_monoxide]].map(([k, v]) => (
                  <span key={k} style={{ color: "var(--wg-muted)" }}>{k} <strong style={{ color: "var(--wg-ink)" }}>{v ?? "—"}</strong></span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>Air-quality feed loading…</p>
          )}
        </div>
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>☀ UV protection</h3>
          {uv ? (
            <>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{uv.uv_index} <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{uv.level}</span></div>
              <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)", margin: "0.3rem 0 0" }}>{uv.advice}</p>
              <p className="wg-mono" style={{ fontSize: "0.66rem", color: "var(--wg-muted)" }}>SOURCE {uv.data_source} · {uv.status}</p>
            </>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>UV guidance loading…</p>
          )}
        </div>
      </div>

      {areas.length > 0 && (
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>Nearby areas</h3>
          <div className="wg-scrollrow">
            {areas.map((a) => (
              <button key={a.name} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => onAsk(`Weather for ${a.name}`)}>
                {a.name} <span style={{ color: "var(--wg-muted)" }}>· {a.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem" }}>Next 24 hours (LIVE NWP)</h3>
          <div role="group" aria-label="Hourly metric" style={{ display: "flex", gap: "0.3rem" }}>
            {[["temp", "°C"], ["rain", "Rain %"], ["wind", "Wind"], ["hum", "Humidity"]].map(([id, label]) => (
              <button key={id} className="wg-tab" aria-selected={metric === id} onClick={() => setMetric(id)} style={{ fontSize: "0.7rem", padding: "0.35rem 0.6rem" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <TempSpark hourly={weather.hourly} />
        <div className="wg-scrollrow" style={{ marginTop: "0.4rem" }}>
          {(weather.hourly || []).map((h, i) => (
            <div key={i} className="wg-card" style={{ minWidth: "5.4rem", padding: "0.55rem", textAlign: "center" }}>
              <div className="wg-mono" style={{ fontSize: "0.7rem" }}>{h.time}</div>
              <div style={{ fontSize: "1.2rem" }} aria-hidden="true">{glyphFor(h.icon)}</div>
              <div style={{ fontWeight: 800 }}>
                {metric === "temp" && <>{h.temp}°</>}
                {metric === "rain" && <>{h.rain_prob}%</>}
                {metric === "wind" && <>{h.wind_speed}<span style={{ fontSize: "0.65rem" }}> km/h</span></>}
                {metric === "hum" && <>{h.humidity ?? weather.humidity}<span style={{ fontSize: "0.65rem" }}>%</span></>}
              </div>
              <div style={{ fontSize: "0.7rem", color: h.rain_prob >= 60 ? "var(--wg-accent)" : "var(--wg-muted)" }}>💧{h.rain_prob}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.8rem" }}>7-day outlook</h3>
        <SourceLine source={`${weather.data_source} · daily NWP`} status={weather.status} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
          {(weather.daily || []).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.7rem", fontSize: "0.82rem", padding: "0.45rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
              <strong style={{ width: "4.2rem" }}>{d.day}</strong>
              <span aria-hidden="true">{glyphFor(d.icon)}</span>
              <span style={{ flex: 1, color: "var(--wg-muted)" }}>{d.condition}</span>
              <span className="wg-mono">💧{d.rain_sum}mm</span>
              <strong>{d.temp_max}°</strong>
              <span style={{ color: "var(--wg-muted)" }}>{d.temp_min}°</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
