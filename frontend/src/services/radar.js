/* Shared RainViewer radar client. Free for personal/educational use with
   attribution (https://www.rainviewer.com/). Single-flight + short TTL cache
   so the map, home, evidence and region views share one metadata request.
   Only the documented `past` frames endpoint is used: nowcast frames and
   infrared layers are NOT assumed (they are frequently empty). */

const ENDPOINT = "https://api.rainviewer.com/public/weather-maps.json";
const TTL_MS = 5 * 60 * 1000;

let cached = null; // { at, data }
let inflight = null;

function isFresh() {
  return cached && Date.now() - cached.at < TTL_MS;
}

export async function getRadarFrames({ signal } = {}) {
  if (isFresh()) return cached.data;
  if (!inflight) {
    inflight = (async () => {
      const res = await fetch(ENDPOINT, { signal });
      if (!res.ok) throw new Error(`radar metadata ${res.status}`);
      const data = await res.json();
      const past = Array.isArray(data?.radar?.past) ? data.radar.past : [];
      if (!data?.host || past.length === 0) throw new Error("no radar frames");
      const out = { host: data.host, past, generated: data.generated || null };
      cached = { at: Date.now(), data: out };
      return out;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function latestFrame(frames) {
  const past = frames?.past;
  return past && past.length ? past[past.length - 1] : null;
}

/** Slippy-map tile URL for a frame (shared by Leaflet overlays). */
export function radarTileUrl(host, frame, color = 2, smooth = 1, snow = 1) {
  return `${host}${frame.path}/256/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}

/** Static single-image thumb centered near a location (cards, panels). */
export function radarStaticUrl(host, frame, lat, lon, zoom = 6, size = 512) {
  const z = Math.max(2, Math.min(8, zoom));
  return `${host}${frame.path}/${size}/${z}/${lat}/${lon}/2/1_1.png`;
}

export function frameTimeLabel(frame) {
  if (!frame?.time) return "—";
  try {
    return new Date(frame.time * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(frame.time * 1000).toISOString();
  }
}

export function clearRadarCache() {
  cached = null;
}
