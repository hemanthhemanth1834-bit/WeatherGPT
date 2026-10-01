import React, { useEffect, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchActiveAlerts, fetchCycloneTrack, fetchEarthquakes, fetchWildfires } from "../services/api";

function dot(color, glyph) {
  return L.divIcon({
    className: "wg-map-dot",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;border:2px solid #fff;font-size:12px">${glyph}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function pin(color) {
  return L.divIcon({
    className: "wg-map-pin",
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.5)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 16],
  });
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 7, { duration: 1.2 });
  }, [center, map]);
  return null;
}

function stampLabel(epoch) {
  return new Date(epoch * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const SEVERITY_COLOR = { Red: "#ef4444", Orange: "#f97316", Yellow: "#eab308" };

export default function GISMap({ weather, onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [track, setTrack] = useState(null);
  const [quakes, setQuakes] = useState([]);
  const [fires, setFires] = useState([]);
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState({ radar: true, alerts: true, track: true, quakes: true, fires: false });
  const [focus, setFocus] = useState(null);
  const [problem, setProblem] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [al, tr, qk, fr] = await Promise.all([
          fetchActiveAlerts(),
          fetchCycloneTrack(),
          fetchEarthquakes(5, 7).catch(() => null),
          fetchWildfires(25).catch(() => null),
        ]);
        setAlerts(al);
        setTrack(tr);
        setQuakes(qk?.events || []);
        setFires((fr?.events || []).filter((e) => e.lat != null));
      } catch {
        setProblem("Alert/track overlays failed to load — the base map still works.");
      }
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (res.ok) {
          const data = await res.json();
          const past = data.radar?.past || [];
          const built = past.map((f) => ({ url: `${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, time: f.time }));
          setFrames(built);
          setFrameIdx(Math.max(0, built.length - 1));
        }
      } catch {
        /* radar optional */
      }
    })();
  }, []);

  useEffect(() => {
    if (playing && frames.length > 1) {
      timer.current = setInterval(() => setFrameIdx((i) => (i + 1) % frames.length), 900);
      return () => clearInterval(timer.current);
    }
    return undefined;
  }, [playing, frames.length]);

  useEffect(() => () => clearInterval(timer.current), []);

  const line = track?.features?.find((f) => f.geometry?.type === "LineString")?.geometry.coordinates.map(([lon, lat]) => [lat, lon]) || [];
  const point = track?.features?.find((f) => f.geometry?.type === "Point");
  const frame = frames[frameIdx];

  return (
    <section aria-label="GIS weather console" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div className="wg-card" style={{ padding: "0.8rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
          <span className="wg-chip live">LIVE RADAR{frame ? ` · ${stampLabel(frame.time)}` : ""}</span>
          <span className="wg-chip demo">DEMO: zones + cyclone line</span>
          {["radar", "alerts", "track", "quakes", "fires"].map((key) => (
            <label key={key} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
              <input type="checkbox" className="wg-check" checked={layers[key]} onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })} />
              {key}
            </label>
          ))}
          <span style={{ flex: 1 }} />
          <button className="wg-btn-ghost" onClick={() => setFocus([19.81, 85.83])}>Bay of Bengal</button>
          <button className="wg-btn-ghost" onClick={() => setFocus([19.07, 72.87])}>Mumbai</button>
          <button className="wg-btn-ghost" onClick={() => setFocus([21.5, 82.0])}>All India</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }} role="group" aria-label="Region quick filters">
          <span style={{ fontSize: "0.7rem", color: "var(--wg-muted)" }}>Region:</span>
          {[["All India", [21.5, 82.0]], ["North", [30.5, 78.0]], ["South", [13.0, 78.0]], ["West", [20.5, 73.5]], ["East", [24.0, 87.5]], ["Central", [23.5, 80.0]]].map(([label, center]) => (
            <button key={label} className="wg-tab" style={{ fontSize: "0.7rem", padding: "0.3rem 0.6rem" }} onClick={() => setFocus(center)}>
              {label}
            </button>
          ))}
        </div>
        {frames.length > 1 && layers.radar && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }} aria-label="Radar timeline">
            <button className="wg-btn-ghost" style={{ minWidth: "3rem" }} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause radar loop" : "Play radar loop"}>
              {playing ? "⏸" : "▶"}
            </button>
            <input type="range" min={0} max={frames.length - 1} value={frameIdx} onChange={(e) => { setFrameIdx(Number(e.target.value)); setPlaying(false); }}
              aria-label="Radar frame" style={{ flex: 1, accentColor: "var(--wg-accent)" }} />
            <span className="wg-mono" style={{ fontSize: "0.7rem", color: "var(--wg-muted)", minWidth: "7.5rem" }}>
              frame {frameIdx + 1}/{frames.length} · {frame ? stampLabel(frame.time) : "—"}
            </span>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", fontSize: "0.68rem", color: "var(--wg-muted)" }} aria-label="Legend">
          <strong>Legend:</strong>
          <span><span aria-hidden="true">🟦→🟥</span> rain intensity</span>
          <span style={{ color: "#ef4444" }}>━ ━</span><span>DEMO track</span>
          <span style={{ color: "#f97316" }}>◯</span><span>alert zone</span>
          <span>📍 selected place</span>
          <span>🟣 quake (USGS)</span>
          <span>🟠 wildfire (EONET)</span>
        </div>
      </div>

      {problem && <div className="wg-alert warn" role="alert">{problem}</div>}

      <div style={{ height: "60vh", minHeight: "22rem", borderRadius: "var(--wg-radius)", overflow: "hidden", border: "1px solid var(--wg-line)" }}>
        <MapContainer center={[21.5, 82.0]} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <FlyTo center={focus} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layers.radar && frame && (
            <TileLayer key={frame.url} url={frame.url} opacity={0.7} zIndex={200} attribution="Radar &copy; <a href='https://www.rainviewer.com/'>RainViewer</a>" />
          )}
          {layers.track && line.length > 0 && (
            <Polyline positions={line} pathOptions={{ color: "#ef4444", weight: 3, dashArray: "6 8" }} />
          )}
          {layers.track && point && (
            <Marker position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} icon={dot("#ef4444", "🌀")}>
              <Popup><strong>Illustrative storm position (DEMO)</strong><br />Not a live cyclone bulletin.</Popup>
            </Marker>
          )}
          {weather && (
            <Marker position={[weather.lat, weather.lon]} icon={pin("#38bdf8")}>
              <Popup>
                <strong>{weather.location}</strong><br />
                {weather.current_temp}°C · {weather.condition}<br />
                <button onClick={() => onAsk(weather.location)}>Ask WeatherGPT →</button>
              </Popup>
            </Marker>
          )}
          {layers.quakes && quakes.map((q, i) => (
            q.lat != null && (
              <CircleMarker key={`q${i}`} center={[q.lat, q.lon]}
                radius={4 + Math.min(10, (q.magnitude || 0))}
                pathOptions={{ color: "#c084fc", fillColor: "#c084fc", fillOpacity: 0.55, weight: 1 }}>
                <Popup>
                  <strong>M{q.magnitude} — {q.place}</strong>
                  <br />Depth {q.depth_km} km · USGS (official third-party)
                  <br /><a href={q.url} target="_blank" rel="noreferrer">USGS event page</a>
                </Popup>
              </CircleMarker>
            )
          ))}
          {layers.fires && fires.map((f, i) => (
            <Marker key={`f${i}`} position={[f.lat, f.lon]} icon={dot("#fb923c", "🔥")}>
              <Popup>
                <strong>{f.title}</strong>
                <br />{f.date ? f.date.slice(0, 10) : ""} · NASA EONET
                <br /><a href={f.report_url} target="_blank" rel="noreferrer">Event report</a>
              </Popup>
            </Marker>
          ))}
          {layers.alerts && alerts.map((a) => (
            <Circle key={a.id} center={[a.lat, a.lon]} radius={70000}
              pathOptions={{ color: SEVERITY_COLOR[a.severity] || "#eab308", fillOpacity: 0.22, weight: 2 }}>
              <Popup>
                <strong>[{a.severity}] {a.headline}</strong><br />{a.area_desc}<br />
                <button onClick={() => onAsk(a.district)}>Ask WeatherGPT →</button>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)", margin: 0 }}>
        Basemap © OpenStreetMap contributors · Radar © RainViewer (live frames) · Zones and track are application illustrations, not official warnings.
      </p>
    </section>
  );
}
