import React, { useEffect, useState } from "react";
import LiveImagery from "./LiveImagery";
import {
  frameTimeLabel,
  getRadarFrames,
  latestFrame,
  radarStaticUrl,
} from "../services/radar";
import { GIBS_LAYERS, gibsDate, gibsIndiaWms } from "../services/gibs";

/* Location-aware radar thumb: recent-past RainViewer composite near a place.
   Shared cached metadata; honest DELAYED status; graceful UNAVAILABLE. */
export function LocationRadarImagery({ lat, lon, place, title, description }) {
  const [radar, setRadar] = useState(null);
  const [failedFor, setFailedFor] = useState(null);
  const [tries, setTries] = useState(0);
  const ready = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  const key = ready ? `${lat},${lon},${tries}` : null;
  const failed = failedFor !== null && failedFor === key;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getRadarFrames()
      .then((data) => {
        if (cancelled) return;
        const frame = latestFrame(data);
        if (!frame) {
          setFailedFor(key);
          return;
        }
        setRadar({
          src: radarStaticUrl(data.host, frame, lat, lon),
          observedAt: `${frameTimeLabel(frame)} IST · recent-past composite`,
        });
      })
      .catch(() => {
        if (!cancelled) setFailedFor(key);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!ready) return null;
  return (
    <LiveImagery
      title={title || `Precipitation radar near ${place || "selected location"}`}
      description={
        description ||
        "Recent-past radar composite. Blank areas mean no radar coverage, not clear skies — pair with the forecast."
      }
      src={failed ? "" : radar?.src}
      loading={!failed && !radar}
      error={failed}
      onRetry={() => {
        setRadar(null);
        setTries((t) => t + 1);
      }}
      alt={`Recent precipitation radar near ${place || "the selected location"}`}
      sourceName="RainViewer (personal/educational use)"
      sourceUrl="https://www.rainviewer.com/"
      observedAt={radar?.observedAt}
      status={failed ? "UNAVAILABLE" : radar ? "DELAYED" : "STATIC"}
      legend="🟦 light → 🟥 intense precipitation"
    />
  );
}

/* India true-color satellite context (daily product, previous day). */
export function IndiaSatelliteImagery({ title, description, layerId = "viirs", onLayerChange }) {
  const [layer, setLayer] = useState(GIBS_LAYERS[layerId] ? layerId : "viirs");
  const date = gibsDate(1);
  const def = GIBS_LAYERS[layer];
  const pick = (id) => {
    setLayer(id);
    onLayerChange?.(id);
  };
  return (
    <LiveImagery
      title={title || "True-color satellite · India"}
      description={
        description ||
        `Daily true-color view (${def.label}, ${def.resolution}) for cloud context. Observation is from ${date}, not this minute.`
      }
      src={gibsIndiaWms(def.layer, date)}
      alt={`NASA GIBS ${def.label} satellite over India, ${date}`}
      sourceName="NASA GIBS (U.S. public domain)"
      sourceUrl="https://worldview.earthdata.nasa.gov/"
      observedAt={`${date} · daily product`}
      status="DELAYED"
      layers={Object.values(GIBS_LAYERS).map((l) => ({ id: l.id, label: l.label }))}
      activeLayer={layer}
      onLayer={pick}
    />
  );
}
