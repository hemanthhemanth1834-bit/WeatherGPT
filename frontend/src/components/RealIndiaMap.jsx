import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchCurrentWeather } from "../services/api";

const HUBS = [
  ["New Delhi", 28.6139, 77.2090], ["Mumbai", 19.0760, 72.8777],
  ["Chennai", 13.0827, 80.2707], ["Bengaluru", 12.9716, 77.5946],
  ["Kolkata", 22.5726, 88.3639], ["Hyderabad", 17.3850, 78.4867],
  ["Kochi", 9.9312, 76.2673], ["Ahmedabad", 23.0225, 72.5714]
];

const icon = (active=false) => L.divIcon({
  className: "wg-real-map-marker-wrap",
  html: `<span class="wg-real-map-marker ${active ? "active" : ""}"><i></i></span>`,
  iconSize: [22,22], iconAnchor: [11,11]
});

export default function RealIndiaMap({ weather, onAsk }) {
  const host = useRef(null);
  const mapRef = useRef(null);
  const radarRef = useRef(null);
  const satelliteRef = useRef(null);
  const [mode, setMode] = useState("radar");
  const [stations, setStations] = useState(HUBS.map(([name,lat,lon]) => ({name,lat,lon})));
  const [radarTime, setRadarTime] = useState(null);

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const lat = Number(weather?.lat) || 20.5937, lon = Number(weather?.lon) || 78.9629;
    const map = L.map(host.current, { zoomControl: false, attributionControl: true, minZoom: 4, maxZoom: 10 }).setView([lat, lon], 5);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !weather?.lat || !weather?.lon) return;
    mapRef.current.setView([Number(weather.lat), Number(weather.lon)], 6, { animate: true });
  }, [weather?.lat, weather?.lon]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(HUBS.map(async ([name,lat,lon]) => {
      try {
        const w = await fetchCurrentWeather(name, lat, lon);
        return {name,lat,lon,weather:w};
      } catch { return {name,lat,lon}; }
    })).then(results => {
      if (!cancelled) setStations(results.map(x => x.status === "fulfilled" ? x.value : null).filter(Boolean));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = stations.map(s => {
      const active = weather?.location && s.name.toLowerCase() === weather.location.toLowerCase();
      const marker = L.marker([s.lat,s.lon], {icon: icon(active), title: s.name});
      const temp = s.weather?.current_temp ?? "—";
      const condition = s.weather?.condition ?? "Live telemetry";
      marker.bindPopup(`<b>${s.name}</b><br/>${temp}°C · ${condition}`);
      marker.on("click", () => onAsk?.(`Live weather, hazards and radar for ${s.name}`));
      marker.addTo(map);
      return marker;
    });
    return () => layers.forEach(m => map.removeLayer(m));
  }, [stations, weather?.location, onAsk]);

  useEffect(() => {
    let cancelled = false;
    if (mode !== "radar") {
      if (radarRef.current && mapRef.current) mapRef.current.removeLayer(radarRef.current);
      radarRef.current = null;
      return;
    }
    fetch("https://api.rainviewer.com/public/weather-maps.json").then(r => r.json()).then(data => {
      if (cancelled || !mapRef.current || !data?.radar?.past?.length) return;
      const frame = data.radar.past[data.radar.past.length - 1];
      setRadarTime(frame.time);
      if (radarRef.current) mapRef.current.removeLayer(radarRef.current);
      radarRef.current = L.tileLayer(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: .62, maxNativeZoom: 7, maxZoom: 10, attribution: "RainViewer"
      }).addTo(mapRef.current);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (satelliteRef.current) map.removeLayer(satelliteRef.current);
    satelliteRef.current = null;
    if (mode !== "satellite") return;
    satelliteRef.current = L.tileLayer(
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2026-10-02/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
      { opacity: .78, maxNativeZoom: 9, maxZoom: 10, attribution: "NASA GIBS" }
    ).addTo(map);
  }, [mode]);

  return <div className="wg-real-map">
    <div ref={host} className="wg-real-map-canvas" />
    <div className="wg-real-map-status">
      <span className="wg-real-live-dot" /> REAL-TIME MAP
      {radarTime && mode === "radar" && <small>{new Date(radarTime*1000).toLocaleTimeString()}</small>}
    </div>
    <div className="wg-real-map-credit">OpenStreetMap · {mode === "radar" ? "RainViewer radar" : mode === "satellite" ? "NASA GIBS" : "Base map"}</div>
  </div>;
}
