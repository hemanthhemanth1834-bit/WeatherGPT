import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search } from "lucide-react";
import { fetchRiskAssessment } from "../services/api";
import WxIcon from "./WxIcon";

import { getRadarFrames, radarTileUrl, frameTimeLabel } from "../services/radar";
import "./OverviewPremium.css";
import "./HomeCinematic.css";

const EMPTY_HOURLY = [];

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

const SECTION_INTROS = [
  ["Hourly Forecast", "Next 24 hours at this location. Temperature, rain chance, wind and humidity come from the latest Open-Meteo model run; rain chance is a probability, not measured depth."],
];

function Section({ eyebrow, title, intro, action, onClick, children }) {
  const autoIntro = intro || SECTION_INTROS.find(([prefix]) => title.startsWith(prefix))?.[1];
  return (
    <section className="wg-ref-section">
      <div className="wg-ref-section-head">
        <div>{eyebrow && <span className="wg-chip estimated">{eyebrow}</span>}<h2>{title}</h2></div>
        {action && onClick && <button className="wg-btn-ghost wg-ref-action" onClick={onClick}>{action} →</button>}
      </div>
      {autoIntro && <p className="wg-section-intro">{autoIntro}</p>}
      {children}
    </section>
  );
}


function LiveRadarPreview({ weather }) {
    const host = useRef(null);
  const providerHost = useRef(null);
  const mapRef = useRef(null);
  const radarRef = useRef(null);
  const markerRef = useRef(null);
  const [radarTime, setRadarTime] = useState(null);
  const [frames, setFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [radarError, setRadarError] = useState("");

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const lat = Number(weather?.lat), lon = Number(weather?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const map = L.map(host.current, { zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, touchZoom:false }).setView([lat,lon],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:19}).addTo(map);
    markerRef.current = L.circleMarker([lat,lon], {radius:6,color:"#a5f3fc",weight:2,fillColor:"#22d3ee",fillOpacity:1}).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current=null; radarRef.current=null; markerRef.current=null; };
  }, [weather?.lat, weather?.lon]);

    useEffect(() => {
    const map = mapRef.current;
    const lat = Number(weather?.lat), lon = Number(weather?.lon);
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    map.setView([lat, lon], 7, { animate: false });
    markerRef.current?.setLatLng([lat, lon]);
    let cancelled = false;
    setRadarError("");
    getRadarFrames().then((data) => {
      if (cancelled) return;
      providerHost.current = data.host;
      const past = Array.isArray(data.past) ? data.past : [];
      if (!past.length) { setRadarError("Radar provider returned no frames for this area."); return; }
      setFrames(past);
      setFrameIndex(past.length - 1);
    }).catch(() => {
      if (!cancelled) setRadarError("Radar frames are unavailable right now. The map base remains visible.");
    });
    return () => { cancelled = true; setPlaying(false); };
  }, [weather?.lat, weather?.lon]);

  useEffect(() => {
    const map = mapRef.current;
    const frame = frameIndex >= 0 ? frames[frameIndex] : null;
    if (!map || !frame) return;
    setRadarTime(frame.time);
    if (radarRef.current) map.removeLayer(radarRef.current);
    radarRef.current = L.tileLayer(radarTileUrl(providerHost.current, frame), { opacity: .78, maxNativeZoom: 7, maxZoom: 10 }).addTo(map);
  }, [frames, frameIndex]);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const id = setInterval(() => setFrameIndex((index) => (index + 1) % frames.length), 900);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  return (
    <div className="wg-explain-live">
      <div ref={host} className="wg-explain-live-map" />
      <div className="wg-explain-live-overlay">
        <span title="Recent-past composite frames, typically ~10 minutes delayed">● RADAR · RECENT HISTORY {radarTime ? `· ${new Date(radarTime*1000).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}` : ""}</span>
                <small>{weather?.location || "Selected location"} · recent precipitation</small>
      </div>
      <div className="wg-radar-controls">
        <button type="button" onClick={() => setPlaying((value) => !value)} disabled={frames.length < 2} aria-label={playing ? "Pause radar replay" : "Play radar replay"}>{playing ? "Pause" : "Play"}</button>
        <label>
          <span className="wg-sr-only">Radar frame</span>
          <input type="range" min="0" max={Math.max(0, frames.length - 1)} value={Math.max(0, frameIndex)} onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }} disabled={frames.length < 2} />
        </label>
        <span className="wg-radar-frame-time">{frameIndex >= 0 && frames[frameIndex] ? frameTimeLabel(frames[frameIndex]) : "Frame time unavailable"}</span>
        <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noreferrer">RainViewer · OSM</a>
      </div>
      {radarError && <p className="wg-radar-error" role="status">{radarError}</p>}
    </div>
  );
}

function HourlyChart({ points, location }) {
  const data = (points || []).map((point, index) => ({ ...point, index })).filter((point) => Number.isFinite(Number(point.temp)));
  if (data.length < 2) return <div className="wg-ref-empty">A 24-hour chart is unavailable until the forecast loads.</div>;
  const width = 920, height = 214, padX = 34, tempTop = 24, tempHeight = 112, rainTop = 158, rainHeight = 30;
  const temps = data.map((point) => Number(point.temp));
  const min = Math.min(...temps), max = Math.max(...temps);
  const spread = Math.max(1, max - min);
  const x = (index) => padX + (index * (width - padX * 2)) / Math.max(1, data.length - 1);
  const y = (value) => tempTop + ((max - value) / spread) * tempHeight;
  const line = data.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(Number(point.temp)).toFixed(1)}`).join(" ");
  const rainValues = data.map((point) => Number(point.rain_mm)).filter((value) => Number.isFinite(value));
  const rainTotal = rainValues.length === data.length ? rainValues.reduce((sum, value) => sum + value, 0) : null;
  const peakRain = data.reduce((best, point) => Math.max(best, Number(point.rain_prob) || 0), 0);
  return (
    <div className="wg-hourly-chart">
      <div className="wg-hourly-chart-summary">
        <span>Next 24 hours <b>{max.toFixed(1)}°</b> peak / <b>{min.toFixed(1)}°</b> low</span>
        <span>Peak rain probability <b>{peakRain}%</b></span>
        <span>Rainfall <b>{rainTotal == null ? "unavailable" : `${rainTotal.toFixed(1)} mm`}</b></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`24-hour temperature, rain probability and rainfall forecast for ${location || "selected location"}`}>
        <title>24-hour forecast: temperature line, rain-probability bars and rainfall tooltips</title>
        {[0, 0.5, 1].map((ratio) => <line key={ratio} x1={padX} x2={width - padX} y1={tempTop + tempHeight * ratio} y2={tempTop + tempHeight * ratio} className="wg-hourly-grid" />)}
        <path d={line} className="wg-hourly-temp-line" />
        {data.map((point, index) => (
          <g key={`${point.time}-${index}`}>
            <rect x={x(index) - 9} y={rainTop + rainHeight - ((Number(point.rain_prob) || 0) / 100) * rainHeight} width="18" height={((Number(point.rain_prob) || 0) / 100) * rainHeight} rx="3" className="wg-hourly-rain-bar">
              <title>{`${point.time} · rain probability ${Number.isFinite(Number(point.rain_prob)) ? `${point.rain_prob}%` : "unavailable"}${point.rain_mm != null ? ` · ${point.rain_mm} mm` : ""}`}</title>
            </rect>
            <circle cx={x(index)} cy={y(Number(point.temp))} r="4" className="wg-hourly-temp-dot">
              <title>{`${point.time} · ${Number(point.temp).toFixed(1)}°C · ${point.condition || "Forecast"}${point.wind_gust != null ? ` · gust ${point.wind_gust} km/h` : ""}`}</title>
            </circle>
            {index % 3 === 0 && <text x={x(index)} y={height - 8} textAnchor="middle" className="wg-hourly-axis">{index === 0 ? "NOW" : point.time}</text>}
          </g>
        ))}
      </svg>
      <div className="wg-hourly-chart-legend"><span><i className="temp" /> Temperature °C</span><span><i className="rain" /> Rain probability %</span><span>Hover or focus points for rain amount and wind gusts</span></div>
    </div>
  );
}

function HourlyStrip({ hourly, location, onTab }) {
  const points = (hourly || []).slice(0, 24);
  return (
    <Section eyebrow="NEXT 24 HOURS" title={`Hourly Forecast · ${location || "Selected location"}`} action="Open Live Weather" onClick={() => onTab("dashboard")}>
      <HourlyChart points={points} location={location} />
      {points.length ? (
        <div className="wg-ref-hourly" role="list" aria-label={`Hourly forecast for ${location || "selected location"}`}>
          {points.map((h, i) => (
            <div className="wg-ref-hourly-item wg-card" role="listitem" key={`${h.time}-${i}`}>
              <span>{i === 0 ? "NOW" : h.time}</span>
              <WxIcon icon={h.icon} size={30} />
              <b>{h.temp != null ? `${h.temp}°` : "—"}</b>
              <small>{h.condition || "Forecast"}</small>
              <em>{h.rain_prob != null && Number.isFinite(Number(h.rain_prob)) ? `${h.rain_prob}% rain` : "Rain n/a"}</em>
            </div>
          ))}
        </div>
      ) : <div className="wg-ref-empty">Hourly forecast is unavailable for this location. Try refreshing or choosing another place.</div>}
    </Section>
  );
}

function SevenDayOutlook({ daily, location, onTab }) {
  const days = (daily || []).slice(0, 7);
  return (
    <Section eyebrow="7-DAY OUTLOOK" title={`Extended Forecast · ${location || "Selected location"}`} action="Open Live Weather" onClick={() => onTab("dashboard")}>
      <p className="wg-section-intro">Daily model forecast from Open-Meteo. Timing, intensity and rain amounts can still change; this is not an official warning.</p>
      {days.length ? (
        <div className="wg-week-grid" role="list" aria-label={`Seven day forecast for ${location || "selected location"}`}>
          {days.map((day, index) => (
            <div className="wg-week-day wg-card" role="listitem" key={`${day.date}-${index}`}>
              <span className="wg-week-day-name">{day.day || (index === 0 ? "Today" : `Day ${index + 1}`)}</span>
              <small className="wg-week-day-date">{day.date || "Date unavailable"}</small>
              <WxIcon icon={day.icon} size={26} />
              <b className="wg-week-day-temps">
                {day.temp_max != null ? `${Math.round(day.temp_max)}°` : "—"}
                <em>{day.temp_min != null ? `${Math.round(day.temp_min)}°` : "—"}</em>
              </b>
              <small className="wg-week-day-condition">{day.condition || "Forecast"}</small>
              <em className="wg-week-day-rain">
                {day.rain_prob != null && Number.isFinite(Number(day.rain_prob)) ? `${day.rain_prob}% chance` : "Chance n/a"}
                {" · "}
                {day.rain_sum != null && Number.isFinite(Number(day.rain_sum)) ? `${Number(day.rain_sum)} mm` : "Amount n/a"}
              </em>
            </div>
          ))}
        </div>
      ) : <div className="wg-ref-empty">Daily outlook is unavailable for this location. Values are not estimated or substituted.</div>}
    </Section>
  );
}

function AlertSummary({ alerts, onTab }) {
  const items = (alerts || []).slice(0, 3);
  return (
    <section className="wg-ref-section" aria-label="Severe alert summary">
      <div className="wg-ref-section-head"><div><span className="wg-chip estimated">SEVERE ALERTS</span><h2>Active Alert Summary</h2></div><button className="wg-btn-ghost" onClick={() => onTab("alerts")}>Open Severe Alerts →</button></div>
      <p className="wg-section-intro">Official and computed warnings that currently affect this location. An empty list is not a safety clearance — check the source feeds.</p>
      {items.length ? (
        <div className="wg-ref-alert-summary">
          {items.map((a) => (
            <button key={a.id || a.headline} className="wg-card wg-ref-alert-summary-item" onClick={() => onTab("alerts")}>
              <span className="wg-chip" style={{borderColor: a.color || "var(--wg-line)", color: a.color || "var(--wg-muted)"}}>{a.severity || "ALERT"}</span>
              <strong>{a.headline || a.event || "Weather alert"}</strong>
              <small>{a.area_desc || a.district || "Area unavailable"} · Expires {a.expires || "not stated"}</small>
              <em>{a.sender_name || "Source not stated"}</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="wg-card wg-ref-empty wg-ref-alert-empty">
          <b>No active computed alerts returned for this check.</b>
          <span>This is not an all-clear. Follow official IMD, NDMA and local authority warnings. <button type="button" className="wg-link-button" onClick={() => onTab("alerts")}>Review alert sources →</button></span>
        </div>
      )}
    </section>
  );
}

function RiskSummary({ risk, onTab }) {
  const levels = risk?.levels || {};
  const drivers = ["heat", "rainfall", "flood", "wind", "thunderstorm", "cyclone"];
  return (
    <section className="wg-ref-section" aria-label="Computed risk and flood summary">
      <div className="wg-ref-section-head"><div><span className="wg-chip estimated">COMPUTED RISK</span><h2>Risk &amp; FloodWatch Context</h2></div><button className="wg-btn-ghost" onClick={() => onTab("risk")}>Open FloodWatch →</button></div>
      <p className="wg-section-intro">Computed rainfall and terrain proxy for flood susceptibility. This is not observed flooding and not an official warning.</p>
      <div className="wg-ref-risk-summary wg-card">
        {risk ? (
          <>
            <div className="wg-ref-risk-overall"><span>OVERALL</span><b className={`level-${String(risk.overall || "").toLowerCase()}`}>{risk.overall || "UNKNOWN"}</b><small>{risk.data_type || "ESTIMATED"} · deterministic thresholds, not an official warning</small></div>
            <div className="wg-ref-risk-levels">
              {drivers.map((key) => <div key={key}><span>{key}</span><b className={`level-${String(levels[key] || "").toLowerCase()}`}>{levels[key] || "UNKNOWN"}</b></div>)}
            </div>
            <div className="wg-ref-risk-meta"><span>{risk.source || "WeatherGPT Risk Engine"}</span><span>{risk.advisories?.[0] || "Review the risk panel for drivers and limitations."}</span></div>
          </>
        ) : <div className="wg-ref-empty">Risk estimate is unavailable for this location right now. No value is being inferred or substituted.</div>}
      </div>
    </section>
  );
}

function WeatherBriefing({ weather, risk, alerts, hours, onAsk, askLocation }) {
  if (!weather) return null;
  const next = (hours?.length ? hours : weather.hourly || []).slice(0, 7);
  const probs = next.map((hour) => Number(hour.rain_prob)).filter((value) => Number.isFinite(value));
  const rainMax = probs.length ? Math.max(...probs) : null;
  const rainAmounts = next.map((hour) => Number(hour.rain_mm)).filter((value) => Number.isFinite(value));
  const rainSum = rainAmounts.length === next.length && next.length ? rainAmounts.reduce((sum, value) => sum + value, 0) : null;
  const gusts = next.map((hour) => Number(hour.wind_gust)).filter((value) => Number.isFinite(value));
  const gustMax = gusts.length ? Math.max(...gusts) : null;
  const nowTemp = Number(weather.current_temp);
  const laterTemp = Number(next[next.length - 1]?.temp);
  const temperatureDelta = Number.isFinite(nowTemp) && Number.isFinite(laterTemp) ? laterTemp - nowTemp : null;
  const activeAlerts = Array.isArray(alerts) ? alerts : [];
  const riskDrivers = risk?.levels ? Object.entries(risk.levels).filter(([, level]) => !["LOW", "UNKNOWN", "NONE", "MINIMAL"].includes(String(level).toUpperCase())) : [];
  const trendText = temperatureDelta == null
    ? "The next-six-hour temperature trend is unavailable."
    : Math.abs(temperatureDelta) < 1
      ? "Temperatures should stay close to the current reading over the next six hours."
      : `Temperatures trend ${temperatureDelta > 0 ? "up" : "down"} by about ${Math.abs(temperatureDelta).toFixed(1)}°C over the next six hours.`;
  const rainText = rainMax == null
    ? "Rain probability is unavailable for the next six hours."
    : rainMax < 20
      ? `Rain probability stays low, peaking at ${rainMax}% in the next six hours.`
      : `Rain probability peaks at ${rainMax}% in the next six hours${rainSum == null ? "; hourly rainfall amount is unavailable." : `, with about ${rainSum.toFixed(1)} mm expected.`}`;
  return (
    <section id="wg-live-snapshot" className="wg-ref-section wg-briefing" aria-label="Deterministic weather briefing">
      <div className="wg-ref-section-head">
        <div><span className="wg-chip live">DETERMINISTIC BRIEFING</span><h2>AI Weather Briefing</h2></div>
        <button className="wg-btn-ghost" onClick={() => onAsk(`Summarize the current weather, next six hours, and risks for ${askLocation}.`)}>Ask the assistant →</button>
      </div>
      <div className="wg-briefing-card wg-card">
        <ul>
          <li><b>Now.</b> {weather.location || askLocation} is {weather.current_temp != null ? `${weather.current_temp}°C` : "temperature unavailable"}{weather.feels_like != null ? `, feeling like ${weather.feels_like}°C` : ""}{weather.condition ? `, with ${String(weather.condition).toLowerCase()}` : ""}. {weather.humidity != null ? `Humidity is ${weather.humidity}%` : "Humidity is unavailable"}{weather.wind_speed != null ? ` and wind is ${weather.wind_speed} km/h` : ""}{gustMax != null ? `, gusting to ${gustMax} km/h` : ""}.</li>
          <li><b>Next six hours.</b> {trendText} {rainText}</li>
          <li><b>Risk and alerts.</b> {risk ? `App screening is ${risk.overall || "UNKNOWN"}${riskDrivers.length ? `, with elevated ${riskDrivers.map(([key]) => key).join(", ")} signals` : ""}. This is a deterministic screening estimate, not an official warning.` : "The app risk screening is unavailable right now; no level is being inferred."} {activeAlerts.length ? `${activeAlerts.length} active alert record${activeAlerts.length === 1 ? "" : "s"} returned; review the Severe Alerts panel and follow official instructions.` : "No active alert records were returned, which is not an all-clear."}</li>
          <li><b>What to watch.</b> {riskDrivers.length ? `Monitor the ${riskDrivers.map(([key]) => key).join(" and ")} signal${riskDrivers.length === 1 ? "" : "s"} and any official updates.` : "Monitor the hourly rain signal, wind gusts, and official alerts; forecasts can change as new model runs arrive."} {" "}This briefing is rule-based and uses the values shown on this page; it is not generated by a large language model.</li>
        </ul>
        <div className="wg-briefing-meta"><span>Evidence: {weather.data_source || "provider unavailable"} · updated {agoLabel(weather.updated_at_ist) || "timestamp unavailable"}</span><span>Forecast values remain model-dependent.</span></div>
      </div>
    </section>
  );
}


export default function HomePanel({ weather, busy, detecting, locStatus = "IDLE", alerts, onAsk, onTab, onRefresh }) {

    const [risk, setRisk] = useState(null);
  const [auto, setAuto] = useState(false);
  const [hours, setHours] = useState([]);
  const [localNow, setLocalNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setLocalNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const lat = Number(weather?.lat), lon = Number(weather?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: lat, longitude: lon, timezone: "Asia/Kolkata", forecast_days: "7", wind_speed_unit: "kmh",
      hourly: "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m",
      daily: "precipitation_probability_max,uv_index_max,sunrise,sunset",
    });
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((data) => {
        const times = data?.hourly?.time || [];
        let start = times.findIndex((time) => new Date(`${time}:00+05:30`).getTime() >= Date.now() - 3600000);
        if (start < 0) start = 0;
        const base = weather?.hourly || [];
        setHours(times.slice(start, start + 24).map((time, index) => ({
          ...base[index], time: time.slice(11, 16), date: time.slice(0, 10),
          temp: data.hourly.temperature_2m?.[start + index],
          rain_prob: data.hourly.precipitation_probability?.[start + index],
          rain_mm: data.hourly.precipitation?.[start + index],
          wind_speed: data.hourly.wind_speed_10m?.[start + index],
          wind_gust: data.hourly.wind_gusts_10m?.[start + index],
        })));
      })
      .catch((error) => { if (error.name !== "AbortError") { setHours([]); } });
    return () => controller.abort();
  }, [weather?.lat, weather?.lon, weather?.hourly]);

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

  const hourly = weather?.hourly ?? EMPTY_HOURLY;
  const askLocation = weather?.location || "my city";

  return (
    <section className="wg-ref-home wg-overview-v2" aria-label="WeatherGPT Intelligence Hub">
      <div className="wg-ref-hero wg-cine-hero">
        <div className="wg-cine-hero-media" aria-hidden="true">
          <img src="/imagery/cinematic/hero-supercell-kansas.webp" alt="" fetchPriority="high" decoding="async" />
        </div>
        <div className="wg-cine-hero-shell">
          <div className="wg-cine-hero-topline">
            <span className="wg-cine-live-tag"><i aria-hidden="true" /> Live atmospheric intelligence</span>
            <div className="wg-cine-clock">
              <time dateTime={localNow.toISOString()}>{localNow.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })} IST</time>
              <span>{weather?.location || "Location unavailable"}{weather?.state ? `, ${weather.state}` : ""}</span>
            </div>
          </div>
          <div className="wg-cine-hero-grid">
            <div className="wg-cine-hero-copy">
              <p className="wg-cine-eyebrow">WeatherGPT · Command Center</p>
              <h1>WeatherGPT<span className="wg-cine-h1-sub">Atmospheric intelligence, <em>decoded.</em></span></h1>
              <p className="wg-cine-deck">Live observations, hourly and seven-day guidance, recent radar, satellite context and computed risk — assembled into one honest view of the sky above you, with every source and limitation stated.</p>
              <button type="button" className="wg-cine-search" onClick={() => window.dispatchEvent(new CustomEvent("weathergpt:open-location"))} aria-haspopup="dialog">
                <Search size={18} aria-hidden="true" />
                <span><b>Search a city, district or postcode</b><small>{weather?.location ? `Currently viewing ${weather.location}` : "Use GPS or search manually — GPS is optional"}</small></span>
                <em>Change</em>
              </button>
              <div className="wg-cine-hero-actions">
                <button className="wg-btn" onClick={() => onTab("deep_cast")}>AI Weather Deep-Cast</button>
                <button className="wg-btn-ghost" onClick={() => onTab("map")}>Explore radar</button>
                <button className="wg-btn-ghost" onClick={() => onTab("alerts")}>Severe alerts</button>
                <button className="wg-btn-ghost" onClick={() => onAsk(`What should I know about weather and risks in ${askLocation} today?`)}>Ask the copilot</button>
              </div>
              <p className="wg-cine-hero-caption">Editorial image: supercell thunderstorm, Kansas · NOAA NSSL · public domain. Not live imagery. Live observations appear in the panel to the right.</p>
            </div>
            <aside className="wg-ref-live-card wg-card wg-cine-live-card" aria-label="Current weather observation">
              <div className="wg-cine-live-head"><span><i aria-hidden="true" /> Current observation</span><span className={`wg-chip ${weather?.status === "LIVE" ? "live" : "estimated"}`}>{weather?.status || "Unavailable"}</span></div>
              {weather ? (
                <>
                  <div className="wg-cine-live-main">
                    <div className="wg-cine-temp"><b>{weather.current_temp ?? "—"}</b><sup>°C</sup></div>
                    <div className="wg-cine-condition"><strong>{weather.condition || "Condition unavailable"}</strong><span>{weather.location || "Location unavailable"}{weather.state ? `, ${weather.state}` : ""}</span></div>
                  </div>
                  <p className="wg-cine-feels">Feels like <b>{weather.feels_like != null ? `${weather.feels_like}°C` : "unavailable"}</b><span aria-hidden="true">·</span><span>{weather.data_source || "Source unavailable"}</span></p>
                  <div className="wg-cine-live-grid">
                    <div className="wg-cine-metric"><span>Rain probability</span><b>{weather.hourly?.[0]?.rain_prob != null && Number.isFinite(Number(weather.hourly[0].rain_prob)) ? `${weather.hourly[0].rain_prob}%` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>Wind</span><b>{weather.wind_speed != null ? `${weather.wind_speed} km/h` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>Humidity</span><b>{weather.humidity != null ? `${weather.humidity}%` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>Precip now</span><b>{weather.precipitation != null ? `${weather.precipitation} mm` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>AQI</span><b>{weather.aqi ?? "—"}</b></div>
                    <div className="wg-cine-metric"><span>Pressure</span><b>{weather.pressure != null ? `${weather.pressure} hPa` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>Gusts</span><b>{hours[0]?.wind_gust != null ? `${hours[0].wind_gust} km/h` : weather.wind_gusts != null ? `${weather.wind_gusts} km/h` : "—"}</b></div>
                    <div className="wg-cine-metric"><span>UV index</span><b>{weather.uv_index ?? "—"}</b></div>
                    <div className="wg-cine-metric"><span>Sunrise / sunset</span><b>{weather.sunrise || "—"} / {weather.sunset || "—"}</b></div>
                  </div>
                  <div className="wg-cine-live-source">{weather.status || "UNKNOWN"} · UPDATED {agoLabel(weather.updated_at_ist) || "timestamp unavailable"} · AQI SOURCE {weather.aqi_source || "UNAVAILABLE"} · NWP {weather.nwp_model || "UNAVAILABLE"}</div>
                </>
              ) : <div className="wg-ref-empty">{detecting ? "Detecting your location…" : busy ? "Loading live weather…" : (locStatus === "ERROR" || locStatus === "DENIED" || locStatus === "UNAVAILABLE") ? "Weather unavailable for this location — use the search field to pick a place." : "Search a place above to start."}</div>}
            </aside>
          </div>
          <a className="wg-cine-scroll" href="#wg-live-snapshot"><span aria-hidden="true">↓</span> Scroll to intelligence</a>
        </div>
      </div>

            <WeatherBriefing weather={weather} risk={risk} alerts={alerts} hours={hours} onAsk={onAsk} askLocation={askLocation} />

      <HourlyStrip hourly={hours.length ? hours : hourly} location={weather?.location} onTab={onTab} />

      <SevenDayOutlook daily={weather?.daily || []} location={weather?.location} onTab={onTab} />

      <AlertSummary alerts={alerts} onTab={onTab} />

      <RiskSummary risk={risk} onTab={onTab} />

      <Section eyebrow="OBSERVED PRECIPITATION" title={`Radar Replay · ${weather?.location || "Selected location"}`} action="Open Map" onClick={() => onTab("map")}>
        <div className="wg-radar-replay wg-card">
          <LiveRadarPreview weather={weather} />
          <p className="wg-radar-note">Recent-past RainViewer frames, usually delayed by about 10 minutes. This is not a nowcast and blank areas do not mean clear skies.</p>
        </div>
      </Section>

      <Section eyebrow="FRESHNESS" title="Auto-Refresh &amp; Data Source">
        <p className="wg-section-intro">Freshness and provenance of the data behind this page. When a provider cannot be reached, the value is marked unavailable rather than estimated.</p>
        <div className="wg-ref-freshness wg-card">
          {weather?.location ? (
            <>
              <div><b>{weather?.data_source || "Source unavailable"}</b><span>{weather?.status || "STATUS UNKNOWN"} · Updated {agoLabel(weather?.updated_at_ist) || "timestamp unavailable"}</span></div>
              <label><input type="checkbox" className="wg-check" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh every 60 seconds</label>
              <button className="wg-btn-ghost" onClick={() => onRefresh(weather.location)}>↻ Refresh {weather.location}</button>
            </>
          ) : (
            <div><b>No location selected</b><span>Choose a location from the header search to load live weather and see its source status.</span></div>
          )}
        </div>
      </Section>

            <div className="wg-ref-bottom-command" aria-label="Overview shortcuts">
        {[
          ["home", "⌂", "Home"],
          ["dashboard", "◉", "Weather"],
          ["deep_cast", "✦", "Deep-Cast"],
          ["chat", "✧", "Assistant"],
          ["alerts", "⚠", "Alerts"],
          ["risk", "≈", "FloodWatch"],
          ["agri", "🌾", "Farm"],
        ].map(([id, icon, label]) => (
          <button key={id} onClick={() => onTab(id)}>
            <span>{icon}</span><b>{label}</b>
          </button>
        ))}
      </div>

    </section>
  );
}
