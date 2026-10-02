import React, { useEffect, useMemo, useState } from "react";
import { fetchRiskAssessment } from "../services/api";
import WxIcon from "./WxIcon";

const RISK_TONE = { LOW: "live", MODERATE: "static", HIGH: "demo", EXTREME: "off" };

function agoLabel(ist) {
  if (!ist) return "";
  const m = ist.match(/(\d+)\s+(\w+)\s+(\d{4}),\s+(\d+):(\d+)/);
  if (!m) return "";
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const then = Date.UTC(+m[3], months[m[2]], +m[1], +m[4] - 5, +m[5] - 30);
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
}

function Section({ eyebrow, title, action, onClick, children }) {
  return (
    <section className="wg-ref-section">
      <div className="wg-ref-section-head">
        <div>
          <div className="wg-section-title">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {action && <button className="wg-btn-ghost wg-ref-action" onClick={onClick}>{action} →</button>}
      </div>
      {children}
    </section>
  );
}

function FeatureCard({ icon, title, text, meta, onClick }) {
  return (
    <button className="wg-ref-feature wg-card hoverable" onClick={onClick}>
      <span className="wg-ref-icon">{icon}</span>
      <span className="wg-ref-feature-copy">
        <strong>{title}</strong>
        <span>{text}</span>
        {meta && <small>{meta}</small>}
      </span>
      <span className="wg-ref-arrow">↗</span>
    </button>
  );
}

function StationCard({ name, tag, weather, onClick }) {
  return (
    <button className="wg-ref-station wg-card hoverable" onClick={onClick}>
      <span className="wg-ref-station-top"><span>{tag}</span><span>LIVE</span></span>
      <strong>{name}</strong>
      {weather ? (
        <span className="wg-ref-station-weather">
          <WxIcon icon={weather.icon} size={38} />
          <b>{weather.current_temp}°</b>
          <span>{weather.condition}</span>
        </span>
      ) : (
        <span className="wg-ref-station-weather muted">Search this place for a live snapshot</span>
      )}
      <small>Open-Meteo · NWP ensemble</small>
    </button>
  );
}

export default function HomePanel({ weather, busy, detecting, alertCount, alerts, onAsk, onTab, onRefresh }) {
  const [risk, setRisk] = useState(null);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (weather?.location) {
      fetchRiskAssessment(weather.location, weather.lat, weather.lon)
        .then((r) => !cancelled && setRisk(r))
        .catch(() => !cancelled && setRisk(null));
    }
    return () => { cancelled = true; };
  }, [weather?.location, weather?.lat, weather?.lon]);

  useEffect(() => {
    if (!auto || !weather?.location) return undefined;
    const id = setInterval(() => onRefresh(weather.location), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [auto, weather?.location, onRefresh]);

  const topAlert = alerts?.[0];
  const regional = useMemo(() => [
    ["Vijayawada", "AP", "dashboard"],
    ["Hyderabad", "TS", "dashboard"],
    ["Bengaluru", "KA", "dashboard"],
    ["Chennai", "TN", "dashboard"],
    ["Mumbai", "MH", "dashboard"],
    ["Delhi NCR", "DL", "dashboard"],
  ], []);

  const askLocation = weather?.location || "my city";
  const riskLabel = risk ? `${risk.overall} · ESTIMATED` : "CALCULATING";

  return (
    <section className="wg-ref-home" aria-label="WeatherGPT Intelligence Hub">
      <div className="wg-ref-hero">
        <div className="wg-ref-hero-grid">
          <div className="wg-ref-hero-copy">
            <span className="wg-chip live">● LIVE · INDIA WEATHER INTELLIGENCE</span>
            <h1>AI Weather &amp; <span>Planetary Disaster Intelligence</span></h1>
            <p>WeatherGPT turns live weather, forecasts, hazards, maps and climate signals into clear actions — by text or voice, in your language.</p>
            <div className="wg-ref-hero-actions">
              <button className="wg-btn" onClick={() => onTab("dashboard")}>☁ AI Weather Deep-Cast</button>
              <button className="wg-btn-ghost" onClick={() => onTab("alerts")}>🚨 Disaster &amp; Evacuation Hub</button>
              <button className="wg-btn-ghost" onClick={() => onAsk(`What should I know about the weather and risks in ${askLocation} today?`)}>✦ Ask WeatherGPT Copilot</button>
            </div>
            <div className="wg-ref-hero-stats">
              <span><b>LIVE</b> Open-Meteo NWP</span>
              <span><b>{alertCount}</b> active alerts</span>
              <span><b>10+</b> intelligence modules</span>
            </div>
          </div>
          <div className="wg-ref-live-card wg-card">
            <div className="wg-ref-live-head">
              <span>⌖ CURRENT WEATHER</span>
              <span className="wg-chip live">LIVE</span>
            </div>
            {weather ? (
              <>
                <div className="wg-ref-temp-row">
                  <WxIcon icon={weather.icon} size={68} />
                  <div><b>{weather.current_temp}°</b><span>Feels {weather.feels_like}°C</span></div>
                </div>
                <strong className="wg-ref-condition">{weather.condition}</strong>
                <div className="wg-ref-location">{weather.location}{weather.state ? `, ${weather.state}` : ""}</div>
                <div className="wg-ref-metrics">
                  <span>💧 {weather.humidity}%<small>Humidity</small></span>
                  <span>💨 {weather.wind_speed}<small>km/h wind</small></span>
                  <span>🌧 {weather.hourly?.[0]?.rain_prob ?? 0}%<small>Rain chance</small></span>
                  <span>🍃 {weather.aqi ?? "—"}<small>AQI</small></span>
                </div>
                <div className="wg-ref-source">SOURCE {weather.data_source} · {weather.status} · UPDATED {agoLabel(weather.updated_at_ist) || "now"}</div>
              </>
            ) : (
              <div className="wg-ref-empty">{detecting ? "Detecting your location…" : busy ? "Loading live weather…" : "Search a place above to start."}</div>
            )}
          </div>
        </div>
      </div>

      {topAlert && (
        <button className="wg-ref-alertbar" onClick={() => onTab("alerts")}>
          <span>⚠ ACTIVE ALERT</span><strong>{topAlert.headline}</strong><em>{topAlert.severity}</em><b>View alerts →</b>
        </button>
      )}

      {weather && (
        <div className="wg-ref-now wg-card">
          <div className="wg-ref-now-main">
            <div>
              <span className="wg-section-title">PINNED WEATHER DASHBOARD</span>
              <h2>{weather.location} <small>{weather.state || "India"}</small></h2>
              <p>Updated {agoLabel(weather.updated_at_ist) || "just now"} · {weather.nwp_model || "NWP ensemble"}</p>
            </div>
            <div className="wg-ref-now-temp"><WxIcon icon={weather.icon} size={50} /><b>{weather.current_temp}°</b></div>
          </div>
          <div className="wg-ref-now-grid">
            <div><span>Condition</span><b>{weather.condition}</b></div>
            <div><span>Risk</span><b className={`wg-risk-${(risk?.overall || "moderate").toLowerCase()}`}>{riskLabel}</b></div>
            <div><span>Alerts</span><b>{alertCount} active</b></div>
            <div><span>Rain</span><b>{weather.precipitation ?? 0} mm</b></div>
            <div><span>Wind</span><b>{weather.wind_speed} km/h {weather.wind_direction || ""}</b></div>
          </div>
          <div className="wg-ref-now-actions">
            <button className="wg-btn-ghost" onClick={() => onRefresh(weather.location)}>↻ Refresh</button>
            <label><input type="checkbox" className="wg-check" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto-refresh 10 min</label>
            <button className="wg-btn-ghost" onClick={() => onAsk(`Give me a concise deep-cast for ${weather.location} today and tomorrow.`)}>Deep-cast →</button>
          </div>
        </div>
      )}

      <Section eyebrow="AI INTELLIGENCE" title="WeatherGPT Intelligence Hub" action="Open command center" onClick={() => onTab("dashboard")}>
        <div className="wg-ref-feature-grid">
          <FeatureCard icon="✦" title="AI Deep-Cast Ensemble" text="Multi-signal forecast interpretation with live NWP, precipitation and risk context." meta="FORECAST · LIVE" onClick={() => onTab("dashboard")} />
          <FeatureCard icon="⌁" title="Evacuation Routing" text="Move from warning to action with shelters, roads, maps and safety context." meta="DISASTER · MAPS" onClick={() => onTab("alerts")} />
          <FeatureCard icon="◈" title="FloodWatch Digital Twin" text="Explore rainfall, terrain and hazard layers around a selected location." meta="RISK · GIS" onClick={() => onTab("risk")} />
          <FeatureCard icon="◷" title="12-Month Climate Trends" text="Review climate signals, anomalies and long-range context in one workspace." meta="CLIMATE · ANALYTICS" onClick={() => onTab("climate")} />
        </div>
      </Section>

      <Section eyebrow="PINNED PLACES" title="Regional Weather Dashboard" action="Compare places" onClick={() => onTab("compare")}>
        <div className="wg-ref-station-grid">
          {regional.map(([name, tag]) => <StationCard key={name} name={name} tag={tag} weather={weather?.location?.toLowerCase().includes(name.split(" ")[0].toLowerCase()) ? weather : null} onClick={() => onTab("dashboard")} />)}
        </div>
      </Section>

      <Section eyebrow="FORECAST TRAJECTORY" title="7-Day Synoptic Weather Outlook" action="Open forecast" onClick={() => onTab("dashboard")}>
        <div className="wg-ref-outlook wg-card">
          <div className="wg-ref-days">
            {(weather?.daily || []).slice(0, 7).map((d, i) => (
              <button key={d.date || i} onClick={() => onTab("dashboard")} className={i === 0 ? "active" : ""}>
                <span>{i === 0 ? "TODAY" : d.date?.slice(5) || `D+${i}`}</span>
                <b>{d.temp_max ?? "—"}°</b>
                <small>{d.condition || "Forecast"}</small>
                <em>🌧 {d.rain_prob ?? "—"}%</em>
              </button>
            ))}
            {!weather?.daily?.length && <div className="wg-ref-empty">Load a location to populate the live 7-day trajectory.</div>}
          </div>
        </div>
      </Section>

      <Section eyebrow="SECTORAL INTELLIGENCE" title="Climate & Lifestyle Hubs">
        <div className="wg-ref-feature-grid six">
          <FeatureCard icon="☀" title="Life Cast" text="Health, heat, UV and everyday weather guidance." onClick={() => onAsk(`Give me today's life-cast for ${askLocation}.`)} />
          <FeatureCard icon="🌾" title="Farm & Crop Advisory" text="Weather-aware crop, spray and harvest guidance." onClick={() => onTab("agri")} />
          <FeatureCard icon="🛣" title="RoadWatch Transit" text="Travel and road-weather awareness for routes." onClick={() => onAsk(`Give me road-weather advice for ${askLocation}.`)} />
          <FeatureCard icon="🌳" title="TreeGuard Urban Canopy" text="Heat, rainfall and urban environment context." onClick={() => onTab("climate")} />
          <FeatureCard icon="🧳" title="Weather Trip Planner" text="Build weather-aware travel decisions from live forecasts." onClick={() => onAsk(`Help me plan a weather-safe trip around ${askLocation}.`)} />
          <FeatureCard icon="☼" title="Solar & Clean Energy" text="Use sunlight, UV and weather signals for planning." onClick={() => onTab("dashboard")} />
        </div>
      </Section>

      <div className="wg-ref-command-grid">
        <button className="wg-ref-command-card wg-card" onClick={() => onTab("map")}><span>🛰</span><div><b>Interactive Subcontinent Mini-Map</b><small>Radar · GIS · satellite layers · live location</small></div><strong>→</strong></button>
        <button className="wg-ref-command-card wg-card" onClick={() => onTab("severe")}><span>🌀</span><div><b>Severe Weather Desk</b><small>Cyclones · heavy rain · heat · hazard context</small></div><strong>→</strong></button>
        <button className="wg-ref-command-card wg-card" onClick={() => onTab("aviation")}><span>✈</span><div><b>Aviation &amp; Marine Intelligence</b><small>Air/sea conditions and operational weather</small></div><strong>→</strong></button>
      </div>

      <div className="wg-ref-emergency">
        <div><span>EMERGENCY CONNECTIONS</span><b>Need help now?</b><small>Use WeatherGPT for information and route to local emergency services for urgent assistance.</small></div>
        <button className="wg-btn" onClick={() => onTab("alerts")}>Open Emergency Hub →</button>
      </div>

      <footer className="wg-ref-footer">
        <span>WEATHERGPT · AI WEATHER INTELLIGENCE</span>
        <span>Open-Meteo · RainViewer · NASA GIBS · public geospatial sources</span>
        <span>Live status labels reflect provider availability.</span>
      </footer>
    </section>
  );
}
