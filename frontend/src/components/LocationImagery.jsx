import React, { useEffect, useState } from "react";
import LiveImagery from "./LiveImagery";
import {
  frameTimeLabel,
  getRadarFrames,
  latestFrame,
  radarStaticUrl,
} from "../services/radar";
import { GIBS_LAYERS, gibsDate, gibsIndiaWms, gibsWms } from "../services/gibs";

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

/* Local true-color satellite context around a selected place. Daily product,
   previous day, with a generous bbox so the landscape is legible. */
export function LocalSatelliteImagery({ lat, lon, place, title, description, layerId = "viirs", layerIds }) {
  const available = (layerIds?.length ? layerIds : Object.keys(GIBS_LAYERS)).filter((id) => GIBS_LAYERS[id]);
  const [layer, setLayer] = useState(available.includes(layerId) ? layerId : available[0] || "viirs");
  const ready = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  if (!ready) return null;
  const date = gibsDate(1);
  const def = GIBS_LAYERS[layer] || GIBS_LAYERS.viirs;
  const bbox = `${Number(lon) - 1.6},${Number(lat) - 1.15},${Number(lon) + 1.6},${Number(lat) + 1.15}`;
  return (
    <LiveImagery
      title={title || `${def.label} satellite near ${place || "selected area"}`}
      src={gibsWms(def.layer, date, bbox)}
      alt={`NASA GIBS ${def.label} satellite view around ${place || "the selected area"}, ${date}`}
      sourceName="NASA GIBS (U.S. public domain)"
      sourceUrl="https://worldview.earthdata.nasa.gov/"
      observedAt={`${date} - ${def.cadence || "daily product"}`}
      description={
        description ||
        `Daily ${def.label.toLowerCase()} context around ${place || "the selected area"} from ${date}. Clouds can obscure the surface; this is not a ground-truth observation.`
      }
      status="DELAYED"
      aspectRatio="21 / 9"
      minHeight="10rem"
      layers={available.length > 1 ? available.map((id) => ({ id, label: GIBS_LAYERS[id].label })) : undefined}
      activeLayer={available.length > 1 ? layer : undefined}
      onLayer={available.length > 1 ? setLayer : undefined}
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
            src={gibsIndiaWms(def.layer, date)}

      alt={`NASA GIBS ${def.label} satellite over India, ${date}`}
      sourceName="NASA GIBS (U.S. public domain)"
      sourceUrl="https://worldview.earthdata.nasa.gov/"
      observedAt={`${date} · ${def.cadence || "daily product"}`}
      description={
        def.description
          ? `${def.description} Observation is from ${date}, not this minute.`
          : description ||
            `Daily true-color view (${def.label}, ${def.resolution}) for cloud context. Observation is from ${date}, not this minute.`
      }
      status="DELAYED"
      layers={Object.values(GIBS_LAYERS).map((l) => ({ id: l.id, label: l.label }))}
      activeLayer={layer}
      onLayer={pick}
    />
  );
}
