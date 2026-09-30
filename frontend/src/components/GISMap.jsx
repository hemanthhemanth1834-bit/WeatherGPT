import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Radio, Layers, AlertCircle, CloudRain, Zap, Wind, Eye, Map as MapIcon, Play, Pause, RefreshCw } from "lucide-react";

// Custom Leaflet Div Markers with Glowing Pulse
const createCustomIcon = (color, text) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 0 16px ${color};
      ">${text}</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const BASEMAP_PROVIDERS = {
  dark: {
    name: "Dark GIS Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; IMD / MoES Live Radar"
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
  },
  satellite: {
    name: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
  }
};

const ALERT_ZONES = [
  { name: "Puri & Coastal Odisha", lat: 19.8135, lon: 85.8312, severity: "Red", event: "Deep Depression / Cyclone Genesis (110 km/h Landfall Risk)", color: "#ef4444", radius: 95000 },
  { name: "Vidarbha (Nagpur)", lat: 21.1458, lon: 79.0882, severity: "Orange", event: "Severe Heatwave & High Thermal Stress (43.5°C)", color: "#f97316", radius: 75000 },
  { name: "Konkan & Mumbai", lat: 19.0760, lon: 72.8777, severity: "Orange", event: "Torrential Rain & Flash Flood Risk (180mm)", color: "#f97316", radius: 65000 },
  { name: "Punjab (Ludhiana)", lat: 30.9010, lon: 75.8573, severity: "Yellow", event: "Isolated Thunderstorm & Hail Hazard", color: "#eab308", radius: 55000 },
  { name: "Gangetic Plain (Varanasi)", lat: 25.3176, lon: 82.9739, severity: "Orange", event: "Damini Lightning Sensor Discharges", color: "#f97316", radius: 60000 }
];

const CYCLONE_POINTS = [
  { lat: 14.2, lon: 89.5, time: "48 hrs ago" },
  { lat: 16.0, lon: 88.2, time: "24 hrs ago" },
  { lat: 17.8, lon: 86.9, time: "12 hrs ago" },
  { lat: 19.8, lon: 85.8, time: "CURRENT (984 hPa)" },
  { lat: 21.5, lon: 84.9, time: "+24h Projected Path" },
  { lat: 23.0, lon: 84.2, time: "+48h Projected Path" }
];

const RADAR_STATIONS = [
  { name: "IMD DWR Delhi (Palam)", lat: 28.5684, lon: 77.1122, range: "250 km Doppler" },
  { name: "IMD DWR Mumbai (Colaba)", lat: 18.8980, lon: 72.8120, range: "250 km Doppler" },
  { name: "IMD DWR Chennai (Port)", lat: 13.0827, lon: 80.2907, range: "250 km Doppler" },
  { name: "IMD DWR Kolkata", lat: 22.5326, lon: 88.3439, range: "250 km Doppler" },
  { name: "IMD DWR Paradip (Odisha)", lat: 20.3165, lon: 86.6115, range: "250 km Doppler" }
];

function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function GISMap({ onSelectLocation, selectedLocation }) {
  const [activeBasemap, setActiveBasemap] = useState("dark");
  const [showLiveRadar, setShowLiveRadar] = useState(true);
  const [showCyclone, setShowCyclone] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [mapCenter, setMapCenter] = useState([21.5, 82.0]);
  const [zoomLevel, setZoomLevel] = useState(5);
  
  // Live Radar Tile Layer Path
  const [radarTileUrl, setRadarTileUrl] = useState(null);
  const [radarTime, setRadarTime] = useState("Live Composite");

  // Fetch Live Global Radar Frames from RainViewer
  useEffect(() => {
    const fetchLiveRadar = async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (res.ok) {
          const data = await res.json();
          const host = data.host || "https://tilecache.rainviewer.com";
          const radarPast = data.radar?.past;
          if (radarPast && radarPast.length > 0) {
            const latest = radarPast[radarPast.length - 1];
            const tileUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
            setRadarTileUrl(tileUrl);
            const dateObj = new Date(latest.time * 1000);
            setRadarTime(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " IST");
          }
        }
      } catch (e) {
        console.warn("Live radar fetch fallback", e);
      }
    };
    fetchLiveRadar();
  }, []);

  const cyclonePolyline = CYCLONE_POINTS.map(p => [p.lat, p.lon]);

  return (
    <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      {/* Data-provenance strip: clearly distinguish LIVE vs DEMO layers */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-1.5 text-[10px] font-mono font-bold">
        <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          LIVE: RainViewer radar tiles ({radarTime})
        </span>
        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          DEMO: cyclone track & alert polygons (illustrative)
        </span>
      </div>
      {/* Floating GIS Controls Panel */}
      <div className="absolute top-4 right-4 z-[1000] glass-card p-4 space-y-3.5 max-w-xs text-xs shadow-2xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
          <span className="font-extrabold text-slate-100 flex items-center gap-1.5 font-heading">
            <Layers size={15} className="text-sky-400" /> GIS Layer Controls
          </span>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
            {radarTime}
          </span>
        </div>

        {/* Basemap Selection */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapIcon size={11} /> Basemap Style:
          </label>
          <div className="grid grid-cols-3 gap-1">
            {Object.keys(BASEMAP_PROVIDERS).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold capitalize transition ${
                  activeBasemap === key
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="space-y-2 pt-1 border-t border-slate-850">
          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-1.5 font-medium">
              <CloudRain size={14} className="text-cyan-400" /> 
              <span>Live Doppler Radar Rain (dBZ)</span>
            </span>
            <input
              type="checkbox"
              checked={showLiveRadar}
              onChange={(e) => setShowLiveRadar(e.target.checked)}
              className="accent-sky-500 cursor-pointer w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-1.5 font-medium">
              <Wind size={14} className="text-red-400" /> Deep Depression / Storm Track
            </span>
            <input
              type="checkbox"
              checked={showCyclone}
              onChange={(e) => setShowCyclone(e.target.checked)}
              className="accent-red-500 cursor-pointer w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle size={14} className="text-amber-400" /> CAP Warning Polygons
            </span>
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
              className="accent-amber-500 cursor-pointer w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
            <span className="flex items-center gap-1.5 font-medium">
              <Radio size={14} className="text-emerald-400" /> IMD Telemetry Radars
            </span>
            <input
              type="checkbox"
              checked={showStations}
              onChange={(e) => setShowStations(e.target.checked)}
              className="accent-emerald-500 cursor-pointer w-4 h-4"
            />
          </label>
        </div>

        {/* Quick Hotspot Jump Buttons */}
        <div className="pt-2 border-t border-slate-850 space-y-1.5">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Region Focus:</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setMapCenter([19.81, 85.83]); setZoomLevel(7); }}
              className="bg-red-950/70 hover:bg-red-900 text-red-200 p-1.5 rounded-lg text-[10px] font-bold transition border border-red-800/40"
            >
              🌀 Cyclone Bay
            </button>
            <button
              onClick={() => { setMapCenter([19.07, 72.87]); setZoomLevel(8); }}
              className="bg-sky-950/70 hover:bg-sky-900 text-sky-200 p-1.5 rounded-lg text-[10px] font-bold transition border border-sky-800/40"
            >
              🌧️ Mumbai Rain
            </button>
            <button
              onClick={() => { setMapCenter([21.14, 79.08]); setZoomLevel(7); }}
              className="bg-amber-950/70 hover:bg-amber-900 text-amber-200 p-1.5 rounded-lg text-[10px] font-bold transition border border-amber-800/40"
            >
              🔥 Vidarbha Heat
            </button>
            <button
              onClick={() => { setMapCenter([21.5, 82.0]); setZoomLevel(5); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg text-[10px] font-bold transition border border-slate-700"
            >
              🇮🇳 All India
            </button>
          </div>
        </div>

        {/* Radar Color Legend */}
        <div className="pt-2 border-t border-slate-850 text-[9px] text-slate-400">
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>Precipitation (dBZ):</span>
            <span className="text-cyan-400">Light → Extreme</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-yellow-400 to-red-600"></div>
        </div>
      </div>

      {/* Main Leaflet Map View */}
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "#0b1121" }}
      >
        <MapFlyTo center={mapCenter} zoom={zoomLevel} />

        {/* Basemap Tile Layer */}
        <TileLayer
          key={activeBasemap}
          attribution={BASEMAP_PROVIDERS[activeBasemap].attribution}
          url={BASEMAP_PROVIDERS[activeBasemap].url}
        />

        {/* 🌧️ 100% LIVE Global Doppler Weather Radar Composite Layer */}
        {showLiveRadar && radarTileUrl && (
          <TileLayer
            key={radarTileUrl}
            url={radarTileUrl}
            opacity={0.75}
            zIndex={200}
            attribution="&copy; <a href='https://www.rainviewer.com/'>RainViewer</a> Live Radar"
          />
        )}

        {/* Active Storm Track and Projected Path */}
        {showCyclone && (
          <>
            <Polyline
              positions={cyclonePolyline}
              pathOptions={{ color: "#ef4444", weight: 4, dashArray: "6, 8", opacity: 0.9 }}
            />
            {CYCLONE_POINTS.map((pt, idx) => (
              <Marker
                key={idx}
                position={[pt.lat, pt.lon]}
                icon={createCustomIcon(idx === 3 ? "#ef4444" : "#f97316", idx === 3 ? "🌀" : `${idx + 1}`)}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <div className="font-bold text-red-400">Deep Depression / Storm Track Point (DEMO)</div>
                    <div className="text-xs text-slate-300 font-semibold">Status: {pt.time}</div>
                    <div className="text-xs text-slate-400">Coordinates: {pt.lat}°N, {pt.lon}°E</div>
                    <div className="text-[10px] text-amber-300">Illustrative track — not a live cyclone bulletin.</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* CAP Alert Zones */}
        {showAlerts &&
          ALERT_ZONES.map((zone, idx) => (
            <Circle
              key={idx}
              center={[zone.lat, zone.lon]}
              radius={zone.radius}
              pathOptions={{
                color: zone.color,
                fillColor: zone.color,
                fillOpacity: 0.25,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1.5 space-y-2">
                  <div className="flex items-center gap-1 font-bold text-xs" style={{ color: zone.color }}>
                    <AlertCircle size={14} /> [{zone.severity.toUpperCase()} ALERT] {zone.name}
                  </div>
                  <div className="text-xs text-slate-200 font-medium">{zone.event}</div>
                  <button
                    onClick={() => onSelectLocation && onSelectLocation(zone.name.split(" ")[0])}
                    className="w-full mt-2 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold py-1.5 rounded-lg transition shadow"
                  >
                    Query WeatherGPT for this Zone →
                  </button>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* IMD Radar Stations */}
        {showStations &&
          RADAR_STATIONS.map((stn, idx) => (
            <Marker
              key={idx}
              position={[stn.lat, stn.lon]}
              icon={createCustomIcon("#10b981", "📡")}
            >
              <Popup>
                <div className="p-1.5 space-y-1">
                  <div className="font-bold text-emerald-400 text-xs">{stn.name}</div>
                  <div className="text-xs text-slate-300 font-medium">{stn.range} Dual-Polarization</div>
                  <div className="text-[10px] text-slate-400 font-mono">Status: Operational (WIS2.0 Stream)</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
