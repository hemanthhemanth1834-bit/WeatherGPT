import React, { useEffect, useState } from "react";
import { fetchAirQuality, fetchRegionalTalukas, fetchSolar, fetchUV } from "../services/api";
import { download, provenanceFooter, toCSV } from "../services/exportData";
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

function LifeTips({ weather }) {
  if (!weather) return null;
  const tips = [];
  const rain = weather.hourly?.[0]?.rain_prob ?? 0;
  if (rain >= 60) tips.push("☂ Carry an umbrella — rain likely within hours.");
  else if (rain >= 30) tips.push("☂ Keep rainwear handy — showers possible.");
  if (weather.uv_index >= 6) tips.push("🧴 High UV — sunscreen, hat, and midday shade.");
  if (weather.current_temp >= 38) tips.push("💧 Heat — hydrate often, avoid 12–3 PM exertion.");
  if (weather.current_temp <= 10) tips.push("🧥 Cold — layer up, especially morning/evening.");
  if (weather.wind_speed >= 25) tips.push("💨 Gusty — secure loose items, ride carefully.");
  if (weather.visibility < 5) tips.push("🌫 Low visibility — drive slow, lights on.");
  if (!tips.length) tips.push("✅ Comfortable day for commute, errands, and outdoor plans.");
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem", lineHeight: 1.7 }}>
      {tips.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function TempSpark({ hourly, metric }) {
  if (!hourly?.length) return null;
  const rows = hourly.slice(0, 24);
  const cfg = {
    temp: ["Temperature", "°C", h => Number(h.temp)],
    rain: ["Rain probability", "%", h => Number(h.rain_prob)],
    wind: ["Wind speed", "km/h", h => Number(h.wind_speed)],
    hum: ["Humidity", "%", h => Number(h.humidity)]
  }[metric] || ["Temperature", "°C", h => Number(h.temp)];
  const values = rows.map(cfg[2]).map(Number);
  const min = Math.min(...values.filter(Number.isFinite));
  const max = Math.max(...values.filter(Number.isFinite));
  const pad = Math.max((max - min) * .15, .5);
  const lo = min - pad, hi = max + pad;
  const W = 1000, H = 230, L = 54, R = 18, T = 18, B = 38;
  const pts = rows.map((h,i) => {
    const v = Number(cfg[2](h));
    const x = L + i / Math.max(1, rows.length - 1) * (W-L-R);
    const y = H-B - ((v-lo)/(hi-lo))*(H-T-B);
    return {x,y,v,h};
  });
  const path = pts.map((p,i) => (i ? "L " : "M ") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  const area = path + ` L ${pts.at(-1)?.x || L} ${H-B} L ${pts[0]?.x || L} ${H-B} Z`;
  const format = v => metric === "rain" || metric === "hum" ? Math.round(v) : v.toFixed(1);
  return (
    <div className="wg-hourly-chart" role="img" aria-label={`24 hour ${cfg[0]} chart`}>
      <div className="wg-hourly-chart-head">
        <div><b>{cfg[0]}</b><span>{format(values.at(-1))} {cfg[1]} now</span></div>
        <small>Last 24 hours · hourly forecast</small>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0,1,2,3].map(i => {
          const y = T + i*((H-T-B)/3), v = hi-i*((hi-lo)/3);
          return <g key={i}><line x1={L} x2={W-R} y1={y} y2={y} className="wg-hourly-grid"/><text x="6" y={y+4} className="wg-hourly-axis">{format(v)}</text></g>;
        })}
        {pts.filter((_,i)=>i%Math.max(1,Math.floor(rows.length/6))===0).map((p,i)=>
          <text key={i} x={p.x} y={H-10} textAnchor="middle" className="wg-hourly-time">{String(p.h.time).slice(-5)}</text>
        )}
        <path d={area} className="wg-hourly-area"/>
        <path d={path} className="wg-hourly-line"/>
        {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?5:3} className={i===pts.length-1?"wg-hourly-dot current":"wg-hourly-dot"}><title>{p.h.time}: {format(p.v)} {cfg[1]}</title></circle>)}
      </svg>
      <div className="wg-hourly-legend"><span>Y-axis: {cfg[1]}</span><span>X-axis: local time</span><span>● {rows.length} real hourly points</span></div>
    </div>
  );
}


export default function WeatherDashboard({ weather, busy, onAsk }) {
  const [areas, setAreas] = useState([]);
  const [metric, setMetric] = useState("temp");
  const [aqi, setAqi] = useState(null);
  const [uv, setUv] = useState(null);
  const [solar, setSolar] = useState(null);
  const [brief, setBrief] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const exportWeather = (format) => {
    if (!weather) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `${weather.location}-weather-${stamp}`;
    const payload = { ...weather, ...provenanceFooter(weather) };
    if (format === "csv") {
      const rows = [["metric", "value"]];
      ["location", "state", "current_temp", "feels_like", "condition", "humidity",
       "wind_speed", "wind_direction", "precipitation", "pressure", "uv_index",
       "visibility", "aqi", "aqi_status", "sunrise", "sunset"].forEach((k) =>
        rows.push([k, payload[k]])
      );
      (payload.hourly || []).slice(0, 24).forEach((h) =>
        rows.push([`hourly ${h.time}`, `${h.temp}C, rain ${h.rain_prob}%, wind ${h.wind_speed} km/h`])
      );
      download(`${base}.csv`, toCSV(rows), "text/csv");
    } else {
      download(`${base}.json`, JSON.stringify(payload, null, 2));
    }
  };

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
      fetchSolar(weather.location)
        .then((s) => !cancelled && setSolar(s))
        .catch(() => !cancelled && setSolar(null));
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
          <div className="wg-mono" style={{ fontSize: "0.66rem", color: "var(--wg-faint)" }} aria-label="Location hierarchy">
            {weather.country || "India"} › {weather.state} › {weather.location}
          </div>
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
        <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>🔆 Solar rooftop (ESTIMATED)</h3>
          {solar ? (
            <>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{solar.daily_kwh_per_kw} <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>kWh/day per kW</span></div>
              <p style={{ fontSize: "0.74rem", color: "var(--wg-muted)", margin: "0.3rem 0 0" }}>
                {solar.peak_sun_hours} peak sun hours · {solar.daylight_hours} h daylight. Textbook proxy from live UV + cloud — not metered output.
              </p>
            </>
          ) : (
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)" }}>Solar estimate loading…</p>
          )}
        </div>
      </div>

      <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>🧭 Today for you (COMPUTED tips)</h3>
        <LifeTips weather={weather} />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="wg-btn-ghost" onClick={() => exportWeather("json")}>⬇ Export JSON</button>
        <button className="wg-btn-ghost" onClick={() => exportWeather("csv")}>⬇ Export CSV</button>
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
        <TempSpark hourly={weather.hourly} metric={metric} />
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
