import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GIBS_LAYERS, gibsDate, gibsWmtsTile } from "../services/gibs";

const COLORS = {
  Red: "#f87171",
  Orange: "#fb923c",
  Yellow: "#facc15",
  Official: "#38bdf8",
  Computed: "#a78bfa",
};

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

function colorFor(item) {
  return COLORS[item.severity] || COLORS[item.kind === "computed" ? "Computed" : "Official"] || "#38bdf8";
}

export default function SafetyMap({ weather, items = [], title = "Hazard map", height = 360 }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const alertLayerRef = useRef(null);
  const satelliteRef = useRef(null);
  const selectedRef = useRef(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [layer, setLayer] = useState("flood");
  const lat = num(weather?.lat);
  const lon = num(weather?.lon);

  const points = useMemo(
    () =>
      items
        .map((item) => {
          const pointLat = num(item.geometry?.lat ?? item.lat);
          const pointLon = num(item.geometry?.lon ?? item.lon);
          return pointLat != null && pointLon != null ? { ...item, pointLat, pointLon } : null;
        })
        .filter(Boolean),
    [items]
  );

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return undefined;
    const center = lat != null && lon != null ? [lat, lon] : [22.8, 79.2];
    const map = L.map(boxRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(center, lat != null ? 7 : 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    alertLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const timer = window.setTimeout(() => map.invalidateSize(), 180);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      alertLayerRef.current = null;
      satelliteRef.current = null;
      selectedRef.current = null;
    };
    // The map is initialized once; location changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (lat != null && lon != null) mapRef.current.setView([lat, lon], 7);
  }, [lat, lon]);

  useEffect(() => {
    if (!mapRef.current) return undefined;
    if (selectedRef.current) {
      selectedRef.current.remove();
      selectedRef.current = null;
    }
    if (lat != null && lon != null) {
      selectedRef.current = L.circleMarker([lat, lon], {
        radius: 9,
        color: "#eaf1fb",
        weight: 3,
        fillColor: "#0ea5e9",
        fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${escapeHtml(weather?.location || "Selected location")}</strong><br/>Selected place`)
        .addTo(mapRef.current);
    }
    return undefined;
  }, [lat, lon, weather?.location]);

  useEffect(() => {
    if (!mapRef.current || !alertLayerRef.current) return;
    alertLayerRef.current.clearLayers();
    if (!showAlerts) return;
    points.forEach((item) => {
      const color = colorFor(item);
      const titleText = item.title || item.headline || item.event || "Warning";
      const source = item.source || item.sender_name || "Unknown source";
      const status = item.status || "active";
      L.circleMarker([item.pointLat, item.pointLon], {
        radius: 8,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.82,
      })
        .bindPopup(
          `<strong>${escapeHtml(titleText)}</strong><br/>` +
            `${escapeHtml(source)}<br/>` +
            `Status: ${escapeHtml(status)}<br/>` +
            `${item.link || item.report_url ? `<a href="${escapeHtml(item.link || item.report_url)}" target="_blank" rel="noreferrer">Original source</a>` : "No source link in feed"}`
        )
        .addTo(alertLayerRef.current);
    });
  }, [points, showAlerts]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (satelliteRef.current) {
      satelliteRef.current.remove();
      satelliteRef.current = null;
    }
    if (!showSatellite) return;
    const def = GIBS_LAYERS[layer] || GIBS_LAYERS.flood;
    satelliteRef.current = L.tileLayer(gibsWmtsTile(def.layer, gibsDate(2)), {
      opacity: 0.62,
      maxNativeZoom: 9,
      attribution: "NASA GIBS (U.S. public domain)",
    }).addTo(mapRef.current);
  }, [showSatellite, layer]);

  return (
    <section className="wg-safety-map-panel" aria-label={title}>
      <div className="wg-safety-map-head">
        <div>
          <span className="wg-safety-kicker">GEOSPATIAL CONTEXT</span>
          <h2>{title}</h2>
        </div>
        <div className="wg-safety-map-controls" role="group" aria-label="Map layer controls">
          <button type="button" className={`wg-safety-btn${showAlerts ? " is-on" : ""}`} aria-pressed={showAlerts} onClick={() => setShowAlerts((value) => !value)}>
            Warning points
          </button>
          <button type="button" className={`wg-safety-btn${showSatellite ? " is-on" : ""}`} aria-pressed={showSatellite} onClick={() => setShowSatellite((value) => !value)}>
            NASA satellite
          </button>
          <label className="wg-safety-select">
            <span>Layer</span>
            <select value={layer} onChange={(event) => setLayer(event.target.value)} aria-label="NASA GIBS satellite layer">
              <option value="flood">Flood water</option>
              <option value="imerg">IMERG rainfall</option>
              <option value="viirs">True colour</option>
              <option value="aod">Aerosol</option>
            </select>
          </label>
        </div>
      </div>
      <div className="wg-safety-map-canvas" ref={boxRef} style={{ height }} role="application" aria-label={`${title}. OpenStreetMap with warning points and optional NASA satellite overlay.`} />
      <div className="wg-safety-map-foot">
        <span><i className="wg-safety-dot official" /> Official / third-party warning point</span>
        <span><i className="wg-safety-dot computed" /> Computed alert point</span>
        <span><i className="wg-safety-dot place" /> Selected location</span>
        <span className="wg-safety-map-note">Official feeds expose point geometry only in this app — no warning polygons are invented. Satellite overlay is delayed and may be cloud-covered. OSM + NASA GIBS attribution applies.</span>
      </div>
    </section>
  );
}
