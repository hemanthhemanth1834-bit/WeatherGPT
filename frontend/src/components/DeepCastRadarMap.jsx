import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { radarTileUrl } from "../services/radar";

/**
 * Small, location-centred Leaflet map with an observed RainViewer frame on
 * top of OpenStreetMap. The frame is controlled by the parent so playback and
 * the timeline slider share one source of truth.
 */
export default function DeepCastRadarMap({ lat, lon, host, frame, label }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const radarRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const map = L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 4,
      maxZoom: 9,
    }).setView([lat, lon], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    const timer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      radarRef.current = null;
    };
    // The map is created once; location and frame changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lon], 6, { animate: false });
  }, [lat, lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    if (radarRef.current) {
      map.removeLayer(radarRef.current);
      radarRef.current = null;
    }
    if (!host || !frame) return undefined;
    radarRef.current = L.tileLayer(radarTileUrl(host, frame, 2, 1, 1), {
      opacity: 0.68,
      maxNativeZoom: 7,
      maxZoom: 9,
      attribution: "RainViewer",
    }).addTo(map);
    return () => {
      if (radarRef.current) {
        map.removeLayer(radarRef.current);
        radarRef.current = null;
      }
    };
  }, [host, frame]);

  return <div ref={hostRef} className="wg-dc-radar-map" role="img" aria-label={label} />;
}
