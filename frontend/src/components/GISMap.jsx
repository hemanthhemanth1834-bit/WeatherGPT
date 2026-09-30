import React, { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchActiveAlerts, fetchCycloneTrack } from "../services/api";

function dot(color, glyph) {
  return L.divIcon({
    className: "wg-map-dot",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;border:2px solid #fff;font-size:12px">${glyph}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 7, { duration: 1.2 });
  }, [center, map]);
  return null;
}

const SEVERITY_COLOR = { Red: "#ef4444", Orange: "#f97316", Yellow: "#eab308" };

export default function GISMap({ onAsk }) {
  const [alerts, setAlerts] = useState([]);
  const [track, setTrack] = useState(null);
  const [radar, setRadar] = useState(null);
  const [radarTime, setRadarTime] = useState("");
  const [layers, setLayers] = useState({ radar: true, alerts: true, track: true });
  const [focus, setFocus] = useState(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [al, tr] = await Promise.all([fetchActiveAlerts(), fetchCycloneTrack()]);
        setAlerts(al);
        setTrack(tr);
      } catch {
        setProblem("Alert/track overlays failed to load — the base map still works.");
      }
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (res.ok) {
          const data = await res.json();
          const past = data.radar?.past || [];
          if (past.length) {
            const latest = past[past.length - 1];
            setRadar(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
            setRadarTime(new Date(latest.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        }
      } catch {
        /* radar optional */
      }
    })();
  }, []);

  const line = track?.features?.find((f) => f.geometry?.type === "LineString")?.geometry.coordinates.map(([lon, lat]) => [lat, lon]) || [];
  const point = track?.features?.find((f) => f.geometry?.type === "Point");

  return (
    <section aria-label="Weather map" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        <span className="wg-chip live">LIVE: RainViewer radar{radarTime ? ` ${radarTime}` : ""}</span>
        <span className="wg-chip demo">DEMO: alert zones + cyclone line (illustrative)</span>
        {["radar", "alerts", "track"].map((key) => (
          <label key={key} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
            <input type="checkbox" checked={layers[key]} onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })} />
            {key}
          </label>
        ))}
        <span style={{ flex: 1 }} />
        <button className="wg-btn-ghost" onClick={() => setFocus([19.81, 85.83])}>Bay of Bengal</button>
        <button className="wg-btn-ghost" onClick={() => setFocus([19.07, 72.87])}>Mumbai</button>
        <button className="wg-btn-ghost" onClick={() => setFocus([21.5, 82.0])}>All India</button>
      </div>

      {problem && (
        <div className="wg-alert warn" role="alert">{problem}</div>
      )}

      <div style={{ height: "62vh", minHeight: "24rem", borderRadius: "var(--wg-radius)", overflow: "hidden", border: "1px solid var(--wg-line)" }}>
        <MapContainer center={[21.5, 82.0]} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <FlyTo center={focus} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {layers.radar && radar && (
            <TileLayer url={radar} opacity={0.7} zIndex={200} attribution="Radar &copy; <a href='https://www.rainviewer.com/'>RainViewer</a>" />
          )}
          {layers.track && line.length > 0 && (
            <Polyline positions={line} pathOptions={{ color: "#ef4444", weight: 3, dashArray: "6 8" }} />
          )}
          {layers.track && point && (
            <Marker position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} icon={dot("#ef4444", "🌀")}>
              <Popup>
                <strong>Illustrative storm position (DEMO)</strong>
                <br />Not a live cyclone bulletin.
              </Popup>
            </Marker>
          )}
          {layers.alerts &&
            alerts.map((a) => (
              <Circle
                key={a.id}
                center={[a.lat, a.lon]}
                radius={70000}
                pathOptions={{ color: SEVERITY_COLOR[a.severity] || "#eab308", fillOpacity: 0.22, weight: 2 }}
              >
                <Popup>
                  <strong>[{a.severity}] {a.headline}</strong>
                  <br />{a.area_desc}
                  <br />
                  <button onClick={() => onAsk(a.district)} style={{ marginTop: "0.4rem" }}>
                    Ask WeatherGPT →
                  </button>
                </Popup>
              </Circle>
            ))}
        </MapContainer>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)", margin: 0 }}>
        Basemap © OpenStreetMap contributors © CARTO · Radar © RainViewer (live) · Zones and track are application illustrations, not official warnings.
      </p>
    </section>
  );
}
