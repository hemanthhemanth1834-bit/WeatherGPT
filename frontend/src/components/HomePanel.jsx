import React, { useEffect, useMemo, useState } from "react";
import { fetchCurrentWeather, fetchRiskAssessment } from "../services/api";
import WxIcon from "./WxIcon";
import Live3DIcon from "./Live3DIcon";

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

function Section({ title, action, onClick, children }) {
  return (
    <section className="wg-ref-section">
      <div className="wg-ref-section-head">
        <div><h2>{title}</h2></div>
        {action && <button className="wg-btn-ghost wg-ref-action" onClick={onClick}>{action} →</button>}
      </div>
      {children}
    </section>
  );
}

function iconKind(title = "") {
  const t = title.toLowerCase();
  if (t.includes("deep-cast") || t.includes("storm")) return "storm";
  if (t.includes("evacuation") || t.includes("road")) return "road";
  if (t.includes("flood")) return "flood";
  if (t.includes("climate")) return "climate";
  if (t.includes("life")) return "life";
  if (t.includes("farm") || t.includes("crop")) return "farm";
  if (t.includes("tree")) return "tree";
  if (t.includes("trip")) return "trip";
  if (t.includes("solar") || t.includes("energy")) return "solar";
  return "weather";
}

function FeatureCard({ icon, title, text, meta, action, onClick }) {
  return (
    <button className="wg-ref-feature wg-card hoverable" onClick={onClick}>
      <span className="wg-ref-icon"><Live3DIcon kind={iconKind(title)} /></span>
      <span className="wg-ref-feature-copy"><strong>{title}</strong><span>{text}</span>{action && <small className="wg-ref-feature-action">{action} →</small>}{meta && <small>{meta}</small>}</span>
      <span className="wg-ref-arrow">↗</span>
    </button>
  );
}

function StationCard({ name, place, weather, active, onClick }) {
  return (
    <button className={`wg-ref-station wg-card hoverable ${active ? "active" : ""}`} onClick={onClick}>
      {active && <span className="wg-ref-station-active">Active</span>}
      <strong>{name}</strong>
      <span className="wg-ref-station-place">{place}</span>
      {weather ? (
        <>
          <span className="wg-ref-station-weather"><WxIcon icon={weather.icon} size={38} /><b>{weather.current_temp}°</b><span>{weather.condition}</span></span>
          <span className="wg-ref-station-feels">Feels {weather.feels_like ?? "—"}° · H: {weather.daily?.[0]?.temp_max ?? "—"}° • L: {weather.daily?.[0]?.temp_min ?? "—"}°</span>
          <span className="wg-ref-station-metrics"><b>Rain {weather.hourly?.[0]?.rain_prob ?? weather.rain_prob ?? 0}%</b> · {weather.wind_speed ?? "—"} km/h · Hum {weather.humidity ?? "—"}% · AQI {weather.aqi ?? "—"} • {weather.aqi_status || "Poor"}</span>
          <span className="wg-ref-station-warning">[DEMO SCENARIO] Cyclone &amp; Monsoon Flash Flood Warning</span>
        </>
      ) : (
        <span className="wg-ref-station-weather muted">Select/search this place for live telemetry</span>
      )}
      <small>{active ? "Active Station" : "Focus Station"}</small>
    </button>
  );
}

export default function HomePanel({ weather, busy, detecting, alertCount, alerts, onAsk, onTab, onRefresh }) {
  const [risk, setRisk] = useState(null);
  const [auto, setAuto] = useState(false);
  const [stationCount, setStationCount] = useState(3);
  const [metric, setMetric] = useState("dual");
  const [manageStations, setManageStations] = useState(false);
  const [regionalWeather, setRegionalWeather] = useState({});

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
    const id = setInterval(() => onRefresh(weather.location), 60 * 1000);
    return () => clearInterval(id);
  }, [auto, weather?.location, onRefresh]);

  useEffect(() => {
    let cancelled = false;
    const stations = ["New Delhi", "Mumbai", "Bengaluru", "Chennai"];
    Promise.allSettled(stations.map((name) => fetchCurrentWeather(name)))
      .then((results) => {
        if (cancelled) return;
        const next = {};
        results.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) next[stations[index]] = result.value;
        });
        setRegionalWeather(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [weather?.location]);

  const askLocation = weather?.location || "my city";
  const topAlert = alerts?.[0];
  const daily = weather?.daily || [];
  const maxTemps = daily.map((d) => Number(d.temp_max)).filter(Number.isFinite);
  const minTemps = daily.map((d) => Number(d.temp_min)).filter(Number.isFinite);
  const hourly = weather?.hourly || [];
  const rainProbByDate = useMemo(() => {
    const map = {};
    hourly.forEach((h) => {
      const date = String(h.time || "").slice(0, 10);
      const value = Number(h.rain_prob);
      if (!date || !Number.isFinite(value)) return;
      map[date] = Math.max(map[date] ?? 0, value);
    });
    return map;
  }, [hourly]);
  const rainVals = daily.map((d) => Number.isFinite(Number(d.rain_prob)) ? Number(d.rain_prob) : (rainProbByDate[d.date] ?? 0));
  const weeklyMax = maxTemps.length ? Math.max(...maxTemps) : null;
  const weeklyMin = minTemps.length ? Math.min(...minTemps) : null;
  const peakRain = rainVals.length ? Math.max(...rainVals) : null;
  const rainTotal = daily.reduce((sum, d) => sum + (Number(d.rain_sum) || 0), 0);
  const trendRange = Math.max(1, (weeklyMax ?? 35) - (weeklyMin ?? 23));
  const regional = useMemo(() => [
    ["New Delhi", "Central Delhi, Delhi NCR"],
    ["Mumbai", "Mumbai City, Maharashtra"],
    ["Bengaluru", "Bengaluru Urban, Karnataka"],
    ["Chennai", "Chennai, Tamil Nadu"],
  ], []);

  return (
    <section className="wg-ref-home" aria-label="WeatherGPT Intelligence Hub">
      <div className="wg-ref-hero">
        <div className="wg-ref-hero-location">WeatherGPT Intelligence Hub <span>{weather?.location || "New Delhi"}, {weather?.state || "Delhi NCR"}</span></div>
        <div className="wg-ref-hero-grid">
          <div className="wg-ref-hero-copy">
            <span className="wg-chip live">● LIVE · INDIA WEATHER INTELLIGENCE</span>
            <h1>AI Weather &amp; <span>Planetary Disaster Intelligence</span></h1>
            <p>Autonomous multi-model meteorological consensus, early warning disaster blueprints, dynamic live-traffic evacuation routing, and hyperlocal sectoral advisories.</p>
            <div className="wg-ref-hero-actions">
              <button className="wg-btn" onClick={() => onTab("deep_cast")}>☁ AI Weather Deep-Cast</button>
              <button className="wg-btn-ghost" onClick={() => onTab("evacuation")}>🚨 Disaster &amp; Evacuation Hub</button>
              <button className="wg-btn-ghost" onClick={() => onAsk(`What should I know about weather and risks in ${askLocation} today?`)}>✦ Ask WeatherGPT Copilot</button>
            </div>
          </div>
          <div className="wg-ref-live-card wg-card">
            <div className="wg-ref-live-head"><span>⌖ CURRENT WEATHER</span><span className="wg-chip live">LIVE</span></div>
            {weather ? (
              <>
                <div className="wg-ref-temp-row"><Live3DIcon kind={weather?.condition?.toLowerCase?.().includes("rain") ? "rain" : "weather"} size="lg" /><WxIcon icon={weather.icon} size={48} /><div><b>{weather.current_temp}°</b><span>Feels like {weather.feels_like}°C</span></div></div>
                <strong className="wg-ref-condition">{weather.condition}</strong>
                <div className="wg-ref-location">{weather.location}, {weather.state || "India"}</div>
                <div className="wg-ref-metrics">
                  <span>🌧 {weather.hourly?.[0]?.rain_prob ?? 0}%<small>Rain Prob</small></span>
                  <span>💨 {weather.wind_speed} km/h<small>Wind</small></span>
                  <span>💧 {weather.humidity}%<small>Humidity</small></span>
                  <span>🍃 {weather.aqi ?? "—"}<small>AQI</small></span>
                  <span>◉ 4<small>Models</small></span>
                </div>
                <div className="wg-ref-source">SOURCE {weather.data_source} · {weather.status} · UPDATED {agoLabel(weather.updated_at_ist) || "now"}</div>
              </>
            ) : <div className="wg-ref-empty">{detecting ? "Detecting your location…" : busy ? "Loading live weather…" : "Search a place above to start."}</div>}
          </div>
        </div>
      </div>

      {topAlert && <button className="wg-ref-alertbar" onClick={() => onTab("alerts")}><span>⚠ ACTIVE ALERT</span><strong>{topAlert.headline}</strong><em>{topAlert.severity}</em><b>View alerts →</b></button>}

      <Section eyebrow="AI INTELLIGENCE" title="Deep-Cast & Disaster Engines">
        <div className="wg-ref-feature-grid">
          <FeatureCard icon="✦" title="AI Deep-Cast Ensemble" text="ECMWF, GFS, WRF & IMD consensus, thermodynamic CAPE stability, and What-If simulation sandbox." meta="4 MODELS" action="Explore Soundings" onClick={() => onTab("deep_cast")} />
          <FeatureCard icon="⌁" title="Evacuation Routing" text="Traffic-aware line-path escape routes avoiding flooded subways, high-ground shelters & SOS beacon." meta="LIVE TRAFFIC" action="Launch Evacuation Map" onClick={() => onTab("evacuation")} />
          <FeatureCard icon="◈" title="FloodWatch Digital Twin" text="Real-time CWC river gauges, ward-level inundation mapping, and reservoir spillway alerts." meta="HYDROLOGY" action="View Digital Twin" onClick={() => onTab("risk")} />
          <FeatureCard icon="◷" title="12-Month Climate Trends" text="Compare regional temperature & precipitation against 1991–2020 climatological normal to spot shifts." meta="30-YR NORMAL" action="Analyze Anomalies" onClick={() => onTab("climate")} />
        </div>
      </Section>

      <Section eyebrow="PRIORITY OBSERVATION NETWORK" title="Pinned Weather Dashboard">
        <div className="wg-ref-dashboard-toolbar"><span><b>{stationCount} / 4 STATIONS</b> · Live concurrent telemetry across your designated priority observation stations</span><span className="wg-ref-toolbar-actions"><label><input type="checkbox" className="wg-check" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh <span className="wg-ref-refresh-age">57s</span></label><button className="wg-btn-ghost" onClick={() => weather && onRefresh(weather.location)}>↻ Refresh All</button><button className="wg-btn-ghost" onClick={() => setManageStations(true)}>Select &amp; Manage</button></span></div>
        <div className="wg-ref-station-grid">
          {regional.slice(0, stationCount).map(([name, stationPlace], i) => {
            const stationWeather = i === 0 && weather ? weather : regionalWeather[name] || null;
            return <StationCard key={name} name={name} place={stationPlace} weather={stationWeather} active={i === 0 && !!stationWeather} onClick={() => onTab("dashboard")} />;
          })}
        </div>
        {stationCount < 4 && <button className="wg-ref-pin-another wg-card" onClick={() => setStationCount(4)}>＋ <span><b>Pin Another Station</b><small>Monitor up to 4 stations ({stationCount} active)</small></span><em>＋ Browse Indian Observatories</em></button>}
      </Section>

      <Section eyebrow="SYNOPTIC ANALYSIS" title="7-Day Synoptic Weather Trajectory" action="Full Meteorology" onClick={() => onTab("dashboard")}>
        <div className="wg-ref-synoptic wg-card">
          <div className="wg-ref-synoptic-head"><span>Day-by-day temperature ranges, rain probability curve, and wind velocity projections for {askLocation}</span><button className="wg-btn-ghost" onClick={() => onAsk(`Give me synoptic trend analysis for ${askLocation}.`)}>Synoptic Trend Analysis →</button></div>
          <div className="wg-ref-synoptic-days">
            {daily.slice(0, 7).map((d, i) => <button key={i} onClick={() => onTab("dashboard")}><b>{i === 0 ? "TODAY" : d.day || d.date?.slice(5) || `D+${i}`}</b><span>{d.temp_max ?? "—"}° / {d.temp_min ?? "—"}°</span><small>🌧 {rainProbByDate[d.date] ?? d.rain_prob ?? 0}%</small><em>💨 {d.wind_speed ?? d.wind_max ?? "—"}</em></button>)}
            {!daily.length && <div className="wg-ref-empty">Load a location to populate live synoptic trajectory.</div>}
          </div>
        </div>
      </Section>

      <Section eyebrow="MULTIVARIABLE PROJECTION" title="7-Day Temperature & Precipitation Outlook">
        <div className="wg-ref-outlook-panel wg-card">
          <div className="wg-ref-outlook-top"><span>Multivariable atmospheric projection model for {askLocation}</span><div><button className={metric === "dual" ? "active" : ""} onClick={() => setMetric("dual")}>Dual Trend</button><button className={metric === "temperature" ? "active" : ""} onClick={() => setMetric("temperature")}>Temperature</button><button className={metric === "precipitation" ? "active" : ""} onClick={() => setMetric("precipitation")}>Precipitation</button></div></div>
          <div className="wg-ref-summary-grid">
            <div><span>Thermal Trajectory</span><b>{maxTemps.length ? `${weeklyMax - (weeklyMin || weeklyMax)}° spread` : "—"}</b><small>Diurnal spread from live NWP</small></div>
            <div><span>Weekly Extremes</span><b>{weeklyMax != null ? `${weeklyMax}° / ${weeklyMin}°` : "—"}</b><small>Peak / minimum</small></div>
            <div><span>Peak Rain Probability</span><b>{peakRain != null ? `${peakRain}%` : "—"}</b><small>{peakRain >= 60 ? "Elevated storm/rain risk" : "Current forecast signal"}</small></div>
            <div><span>7-Day Accumulation</span><b>{rainTotal.toFixed(1)} mm</b><small>{rainTotal >= 50 ? "High accumulation watch" : "Forecast accumulation"}</small></div>
          </div>
          <div className="wg-ref-chart">
            <div className="wg-ref-chart-y"><span>{weeklyMax ?? 38}°</span><span>{Math.round((weeklyMax ?? 38) - trendRange / 2)}°</span><span>{weeklyMin ?? 20}°</span></div>
            <div className="wg-ref-bars">
              {(daily.length ? daily.slice(0, 7) : Array.from({length:7},(_,i)=>({day:`D+${i}`,temp_max:null,temp_min:null,rain_prob:null}))).map((d,i) => {
                const high = Number(d.temp_max); const low = Number(d.temp_min); const rain = Number(d.rain_prob);
                const h = Number.isFinite(high) ? Math.max(12, ((high - (weeklyMin ?? 20)) / trendRange) * 100) : 18;
                return <button key={i} onClick={() => onTab("dashboard")} className="wg-ref-bar-day"><div className="wg-ref-bar-track"><span className="wg-ref-bar" style={{height:`${h}%`}} /><i style={{height:`${Number.isFinite(rain) ? Math.max(4,rain) : 8}%`}} /></div><b>{d.day || d.date?.slice(5) || `D+${i}`}</b><small>{Number.isFinite(high) ? high : "—"}°</small><em>{Number.isFinite(rain) ? rain : "—"}%</em></button>;
              })}
            </div>
          </div>
          <div className="wg-ref-legend"><span>Max Temperature (°C)</span><span>Min Temperature (°C)</span><span>Rain Probability (%)</span><span>Rain mm</span><b>Tap columns or data points to inspect daily synoptics</b></div>
        </div>
      </Section>

      <Section eyebrow="GEOSPATIAL INTELLIGENCE" title="Interactive Subcontinent Mini-Map">
        <div className="wg-ref-map-card wg-card">
          <div className="wg-ref-map-head"><span>CLICK TO SELECT</span><span>Click anywhere on the map or tap a station pin to instantly set your active location.</span></div>
          <div className="wg-ref-map-body">
            <div className="wg-ref-map-grid">
              <span className="wg-ref-map-label n10">10°N</span><span className="wg-ref-map-label n20">20°N</span><span className="wg-ref-map-label n30">30°N</span>
              <span className="wg-ref-map-label e72">72°E</span><span className="wg-ref-map-label e80">80°E</span><span className="wg-ref-map-label e88">88°E</span>
              <span className="wg-ref-map-ocean arabian">ARABIAN SEA</span><span className="wg-ref-map-ocean bay">BAY OF BENGAL</span><span className="wg-ref-map-ocean indian">INDIAN OCEAN</span>
              <button className="wg-ref-map-land" onClick={() => onTab("map")} aria-label="Open interactive India map"><span>INDIA</span><i>●</i></button>
              <button className="wg-ref-map-pin p-del" onClick={() => onAsk("Weather and hazards for New Delhi")}>●<small>New Delhi</small></button>
              <button className="wg-ref-map-pin p-mum" onClick={() => onAsk("Weather and hazards for Mumbai")}>●<small>Mumbai</small></button>
              <button className="wg-ref-map-pin p-blr" onClick={() => onAsk("Weather and hazards for Bengaluru")}>●<small>Bengaluru</small></button>
            </div>
            <div className="wg-ref-map-side"><b>Active Station</b><strong>{weather?.location || "New Delhi"}</strong><span>{weather?.lat?.toFixed?.(1) || "28.6"}°N, {weather?.lon?.toFixed?.(1) || "77.2"}°E</span><strong>{weather?.current_temp ?? "31"}°C</strong><div><button className="wg-ref-gps" onClick={() => onTab("map")}>GPS</button><button className="active" onClick={() => onTab("map")}>Radar</button><button onClick={() => onTab("satellite")}>Satellite</button></div></div>
          </div>
          <div className="wg-ref-map-tabs">{["All India","North","South","West","East & NE","Central"].map((x) => <button key={x} onClick={() => onTab("map")}>{x}</button>)}</div>
          <div className="wg-ref-hubs"><b>Quick Hubs:</b>{["New Delhi","Mumbai","Chennai","Bengaluru","Kolkata","Hyderabad","Kochi","Ahmedabad"].map((x) => <button key={x} onClick={() => onAsk(`Weather for ${x}`)}>{x}</button>)}</div>
        </div>
      </Section>

      <Section eyebrow="SECTORAL INTELLIGENCE" title="Sectoral Climate & Lifestyle Hubs">
        <div className="wg-ref-sector-header"><span>Hyperlocal decision engines tailored to key socio-economic activities</span><b>6 Real-Time Engines</b></div>
        <div className="wg-ref-feature-grid six">
          <FeatureCard icon="☀" title="Life Cast" text="Personal lifestyle weather forecasts: jogging, cycling, laundry drying, drone flights, and outdoor health ratings." onClick={() => onAsk(`Give me today's life-cast for ${askLocation}.`)} />
          <FeatureCard icon="🌾" title="Farm & Crop Advisory" text="GKMS agricultural advisories, sowing/harvesting schedules, and chemical spraying windows." onClick={() => onTab("agri")} />
          <FeatureCard icon="🛣" title="RoadWatch Transit" text="Highway hydroplaning risks, dense fog visibility warnings, and crosswind alerts." onClick={() => onAsk(`Give me road-weather advice for ${askLocation}.`)} />
          <FeatureCard icon="🌳" title="TreeGuard Urban Canopy" text="Urban tree vulnerability, branch-fall danger, windthrow risk, and root anchorage." onClick={() => onTab("climate")} />
          <FeatureCard icon="🧳" title="Weather Trip Planner" text="Multi-waypoint routing with weather-at-arrival forecasting and departure optimization." onClick={() => onAsk(`Help me plan a weather-safe trip around ${askLocation}.`)} />
          <FeatureCard icon="☼" title="Solar & Clean Energy" text="GHI solar irradiance modeling, hourly generation estimation, and cleaning advisories." onClick={() => onTab("dashboard")} />
        </div>
      </Section>

      <div className="wg-ref-emergency">
        <div><span>NATIONAL CRISIS &amp; EMERGENCY DISPATCH</span><b>24/7 direct toll-free connections to control centers</b></div>
        <div className="wg-ref-emergency-links"><a href="tel:112">Dial 112 (National)</a><a href="tel:1078">1078 (NDMA)</a><a href="tel:1070">1070 (Relief Comm.)</a></div>
      </div>

      <div className="wg-ref-bottom-command" aria-label="Reference command navigation">
        {[
          ["home", "⌂", "Home"],
          ["chat", "✦", "AI Chat"],
          ["compare", "⇄", "Compare"],
          ["alerts", "⚠", "Alerts"],
          ["__settings", "⚙", "Settings"],
          ["capabilities", "▦", "Modules"],
        ].map(([id, icon, label]) => (
          <button key={id} onClick={() => id === "__settings" ? onTab("capabilities") : onTab(id)}>
            <span>{icon}</span><b>{label}</b>
          </button>
        ))}
      </div>
      {manageStations && <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:120,background:"rgba(2,6,23,.72)",backdropFilter:"blur(8px)",display:"grid",placeItems:"center",padding:"1rem"}} onClick={()=>setManageStations(false)}>
        <div className="wg-card" style={{width:"min(34rem,100%)",padding:"1rem",background:"#0b1328"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:".5rem"}}><div><b>Station Management</b><small style={{display:"block",color:"var(--wg-muted)"}}>Choose up to 4 priority observation stations.</small></div><button className="wg-btn-ghost" onClick={()=>setManageStations(false)}>✕</button></div>
          <div style={{display:"grid",gap:".4rem",marginTop:".8rem"}}>
            {regional.map(([name,stationPlace],i)=><label key={name} style={{display:"flex",alignItems:"center",gap:".6rem",padding:".55rem .65rem",border:"1px solid var(--wg-line)",borderRadius:".7rem"}}><input type="checkbox" checked={i < stationCount} onChange={()=>setStationCount(n=>i<n?Math.max(1,n-1):Math.min(4,n+1))}/><span><b>{name}</b><small style={{display:"block",color:"var(--wg-muted)"}}>{stationPlace}</small></span></label>)}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:".4rem",marginTop:".8rem"}}><button className="wg-btn" onClick={()=>setManageStations(false)}>Done</button></div>
        </div>
      </div>}
      <footer className="wg-ref-footer"><span>WEATHERGPT · AI WEATHER INTELLIGENCE</span><span>Theme: Auto · {weather?.condition || "Live Weather"}</span><span>Open-Meteo · RainViewer · NASA GIBS · public geospatial sources</span></footer>
    </section>
  );
}
