import React, { useEffect, useRef, useState } from "react";
import {
  GIBS_ATTRIBUTION,
  GIBS_LAYERS,
  GIBS_LICENSE_NOTE,
  GIBS_VIEWER,
  gibsDate,
  gibsWms,
} from "../services/gibs";
import "./SatelliteExplorer.css";

const LAYER_META = {
  viirs: {
    kind: "TRUE COLOR",
    description: "VIIRS true-color reflectance. Clouds, land and water appear as observed; this is not a photograph.",
  },
  modis: {
    kind: "TRUE COLOR",
    description: "MODIS Terra true-color reflectance at a coarser resolution than VIIRS.",
  },
  flood: {
    kind: "SURFACE WATER",
    description: "MODIS 2-day surface-water detection. Useful flood context, not an official flood warning.",
  },
  imerg: {
    kind: "PRECIPITATION",
    description: "GPM IMERG satellite rain-rate estimate. It is not radar and not a rain-gauge measurement.",
  },
  aod: {
    kind: "AEROSOL",
    description: "MODIS aerosol optical depth. It is not a ground-level AQI measurement.",
  },
};

const LAYERS = ["viirs", "modis", "flood", "imerg", "aod"];
const ZOOMS = [
  { id: "regional", label: "Regional", lonSpan: 10, latSpan: 5.625 },
  { id: "state", label: "State", lonSpan: 4, latSpan: 2.25 },
  { id: "local", label: "Local", lonSpan: 1.6, latSpan: 0.9 },
];
const DATE_OFFSETS = [2, 3, 4, 5, 6, 7, 8];

function dateLabel(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function makeBbox(lat, lon, zoom) {
  const halfLon = zoom.lonSpan / 2;
  const halfLat = zoom.latSpan / 2;
  const west = Math.max(-180, lon - halfLon);
  const east = Math.min(180, lon + halfLon);
  const south = Math.max(-85, lat - halfLat);
  const north = Math.min(85, lat + halfLat);
  return [west, south, east, north].map((value) => Number(value.toFixed(4))).join(",");
}

export default function SatelliteExplorer({ lat, lon, place }) {
  const [layerId, setLayerId] = useState("viirs");
  const [daysAgo, setDaysAgo] = useState(2);
  const [zoomId, setZoomId] = useState("regional");
  const [retry, setRetry] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const [fullOpen, setFullOpen] = useState(false);
  const closeRef = useRef(null);

  const latNum = Number(lat);
  const lonNum = Number(lon);
  const hasLocation = Number.isFinite(latNum) && Number.isFinite(lonNum);
  const layer = GIBS_LAYERS[layerId] || GIBS_LAYERS.viirs;
  const meta = LAYER_META[layerId] || LAYER_META.viirs;
  const zoom = ZOOMS.find((item) => item.id === zoomId) || ZOOMS[0];
  const date = gibsDate(daysAgo);
  const bbox = hasLocation ? makeBbox(latNum, lonNum, zoom) : "";
  const src = hasLocation
    ? `${gibsWms(layer.layer, date, bbox, 1600, 900)}&retry=${retry}`
    : "";
  const status = !hasLocation
    ? "unavailable"
    : failedSrc === src
      ? "error"
      : loadedSrc === src
        ? "loaded"
        : "loading";

  useEffect(() => {
    if (!fullOpen) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setFullOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullOpen]);

  const retryImage = () => {
    setFailedSrc("");
    setRetry((value) => value + 1);
  };

  return (
    <div className="wg-satellite-explorer">
      <div className="wg-sat-header">
        <div>
          <span className={`wg-sat-status ${status === "error" ? "error" : ""}`}>
            {hasLocation ? "DELAYED · DAILY MOSAIC" : "LOCATION REQUIRED"}
          </span>
          <strong>{layer.label}</strong>
          <span>{meta.kind} · {layer.resolution}</span>
        </div>
        <div className="wg-sat-location">
          <b>{place || "Selected location"}</b>
          <span>{hasLocation ? `${latNum.toFixed(3)}°N, ${lonNum.toFixed(3)}°E` : "Choose a location to load imagery"}</span>
        </div>
      </div>

      <div className="wg-sat-grid">
        <div className="wg-sat-stage">
          {status === "loading" && (
            <div className="wg-sat-skeleton" role="status" aria-live="polite">
              <span className="wg-sat-spinner" aria-hidden="true" />
              Loading NASA GIBS {layer.label} for {dateLabel(date)}…
            </div>
          )}
          {status === "error" && (
            <div className="wg-sat-empty" role="alert">
              <b>Imagery unavailable</b>
              <span>The NASA GIBS request did not return an image for this layer and date. Try another date, layer or zoom, or retry.</span>
              <button type="button" onClick={retryImage}>Retry image</button>
            </div>
          )}
          {status === "unavailable" && (
            <div className="wg-sat-empty">
              <b>Location needed</b>
              <span>Select a location to center the regional satellite view and show its coordinates.</span>
            </div>
          )}
          {hasLocation && status !== "error" && (
            <img
              key={`${src}-${retry}`}
              className="wg-sat-image"
              src={src}
              alt={`NASA GIBS ${layer.label} over ${place || "the selected location"}, ${date}`}
              width="1600"
              height="900"
              loading="lazy"
              decoding="async"
              onLoad={() => setLoadedSrc(src)}
              onError={() => setFailedSrc(src)}
            />
          )}
          {status === "loaded" && (
            <div className="wg-sat-stage-actions">
              <button type="button" onClick={() => setFullOpen(true)}>View full image</button>
              <a href={src} target="_blank" rel="noreferrer">Open original JPEG</a>
            </div>
          )}
          <div className="wg-sat-stage-caption">
            <span>{zoom.label} window · {bbox || "no coordinates"}</span>
            <span>{dateLabel(date)} · {layer.resolution}</span>
          </div>
        </div>

        <aside className="wg-sat-panel" aria-label="Satellite layer and archive controls">
          <div className="wg-sat-control-block">
            <div className="wg-sat-label"><b>Layer</b><span>NASA GIBS</span></div>
            <div className="wg-sat-chips">
              {LAYERS.map((id) => {
                const item = GIBS_LAYERS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={layerId === id}
                    className={layerId === id ? "active" : ""}
                    onClick={() => setLayerId(id)}
                  >
                    <span>{item.label}</span>
                    <small>{LAYER_META[id].kind}</small>
                  </button>
                );
              })}
            </div>
            <p className="wg-sat-layer-note">{meta.description}</p>
          </div>

          <div className="wg-sat-control-block">
            <div className="wg-sat-label"><b>Product date</b><span>Archive</span></div>
            <div className="wg-sat-dates">
              {DATE_OFFSETS.map((offset) => {
                const value = gibsDate(offset);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={daysAgo === offset}
                    className={daysAgo === offset ? "active" : ""}
                    onClick={() => setDaysAgo(offset)}
                  >
                    <b>{offset === 2 ? "DEFAULT" : `${offset}D AGO`}</b>
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wg-sat-control-block">
            <div className="wg-sat-label"><b>Zoom window</b><span>Centered</span></div>
            <div className="wg-sat-zooms">
              {ZOOMS.map((item) => (
                <button key={item.id} type="button" aria-pressed={zoomId === item.id} className={zoomId === item.id ? "active" : ""} onClick={() => setZoomId(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="wg-sat-meta">
            <div><span>Observed product</span><b>{date}</b></div>
            <div><span>Cadence</span><b>{layer.cadence || "daily mosaic"}</b></div>
            <div><span>Coordinates</span><b>{hasLocation ? `${latNum.toFixed(2)}, ${lonNum.toFixed(2)}` : "—"}</b></div>
          </div>

          <p className="wg-sat-disclaimer">
            Daily mosaics can lag 1–2 days. Dark or black gaps are missing data, not night or clear skies. True color is reflectance, not a photograph. Flood, IMERG rain and AOD layers are context products, not official warnings, gauges or ground AQI.
          </p>
          <div className="wg-sat-source">
            <span>{GIBS_LICENSE_NOTE}</span>
            <a href={GIBS_VIEWER} target="_blank" rel="noreferrer">{GIBS_ATTRIBUTION} Worldview ↗</a>
          </div>
        </aside>
      </div>

      {fullOpen && (
        <div className="wg-sat-modal" role="dialog" aria-modal="true" aria-label={`Full satellite image: ${layer.label}, ${date}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setFullOpen(false); }}>
          <div className="wg-sat-modal-inner">
            <div className="wg-sat-modal-head">
              <div><b>{layer.label}</b><span>{place || "Selected location"} · {dateLabel(date)} · {zoom.label}</span></div>
              <button ref={closeRef} type="button" onClick={() => setFullOpen(false)} aria-label="Close full satellite image">Close</button>
            </div>
            <img src={src} alt={`Full-resolution NASA GIBS ${layer.label} over ${place || "the selected location"}, ${date}`} width="1600" height="900" />
            <div className="wg-sat-modal-foot">
              <span>{GIBS_LICENSE_NOTE} · delayed daily product</span>
              <a href={src} target="_blank" rel="noreferrer">Open original JPEG ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
