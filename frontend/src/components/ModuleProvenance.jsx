import React from "react";

/*
 * One consistent sentence about the kind of data on the current module.
 * It never upgrades a model, reanalysis or computed product to an
 * observation, and it never invents a source when the payload is missing.
 */
const MODULE_META = {
  dashboard: {
    kind: "Observed + forecast",
    note: "Current conditions plus model guidance. Rain chance is a probability, not measured depth.",
    usesWeather: true,
  },
  deep_cast: {
    kind: "Model guidance",
    note: "Forecast values come from numerical weather models. Agreement is not an accuracy guarantee.",
    usesWeather: true,
  },
  climate: {
    kind: "Reanalysis",
    note: "ERA5 is a gridded reanalysis of past weather, not a station observation at this exact point.",
    source: "Open-Meteo Historical Weather API",
    updated: "Coverage and retrieval time appear inside the module",
  },
  alerts: {
    kind: "Official + computed",
    note: "Official warnings and application-computed estimates are labelled separately. An empty feed is not a clearance.",
    source: "IMD RSS · GDACS · USGS · WeatherGPT",
    updated: "See each alert's issue and expiry times",
  },
  risk: {
    kind: "Computed proxy",
    note: "Rainfall and terrain context only. This is not a river-gauge reading or confirmed inundation.",
    source: "WeatherGPT FloodWatch",
    updated: "Refreshes with the current weather payload",
    usesWeather: true,
  },
  severe: {
    kind: "Reference guidance",
    note: "General preparedness education. Follow official NDMA, IMD and local authority instructions in an emergency.",
    source: "Public NDMA / IMD guidance",
    updated: "Guidance, not a live incident feed",
    showLocation: false,
  },
  chat: {
    kind: "Tool-grounded",
    note: "Answers are calculated by deterministic weather tools. A language model may explain a result when configured, but it never supplies weather values.",
    source: "WeatherGPT weather tools",
    updated: "Each answer reflects the data returned for that question",
    usesWeather: true,
  },
  agri: {
    kind: "Rule-based advisory",
    note: "Weather-derived rules, not soil sensors, pest diagnosis or a guaranteed yield forecast.",
    source: "WeatherGPT crop rules + Open-Meteo",
    updated: "Uses the latest available weather payload",
    usesWeather: true,
  },
  map: {
    kind: "Geospatial context",
    note: "Map layers show the selected place and available radar or satellite context. Blank tiles are not clear skies.",
    source: "OpenStreetMap · RainViewer · NASA GIBS",
    updated: "Layer timestamps appear on the map",
  },
  earth: {
    kind: "3D context",
    note: "The globe is an orientation aid. It is not a real-time global weather mosaic.",
    source: "NASA imagery · Three.js",
    updated: "Static Earth texture",
  },
  nwp: {
    kind: "Model comparison",
    note: "Differences between models show forecast spread, not an accuracy ranking.",
    source: "Open-Meteo GFS · ICON · ECMWF",
    updated: "Model run labels appear in the table",
  },
  satellite: {
    kind: "Satellite imagery",
    note: "Satellite layers are delayed atmospheric context, not ground-level observations.",
    source: "NASA GIBS",
    updated: "Imagery date appears in the layer controls",
  },
  aviation_marine: {
    kind: "Sector guidance",
    note: "Aviation and marine products are informational. Never use them for flight planning or navigation.",
    source: "NOAA ADDS · Open-Meteo Marine",
    updated: "See each product's issue time",
  },
  compare: {
    kind: "City comparison",
    note: "Compares current weather and forecast guidance for two places at the same retrieval time.",
    source: "Open-Meteo",
    updated: "Retrieval time appears with the result",
    usesWeather: true,
  },
};

const FALLBACK_META = {
  kind: "Module data",
  note: "Source, timestamp and limitations are stated inside the module.",
  source: "See module details",
  updated: "Timestamp appears inside the module",
};

function stateFor(online, dataState, meta) {
  if (meta.usesWeather && online === false) {
    return { tone: "offline", label: "Network unavailable" };
  }
  if (meta.usesWeather && dataState === "unavailable") {
    return { tone: "unavailable", label: "Data unavailable" };
  }
  if (meta.usesWeather && dataState === "live") {
    return { tone: "live", label: "Live link" };
  }
  return { tone: "reference", label: "Reference layer" };
}

export default function ModuleProvenance({
  tab,
  weather,
  selectedPlace,
  online,
  dataState,
  onOpenStatus,
}) {
  if (["home", "about", "privacy", "capabilities"].includes(tab)) return null;

  const meta = MODULE_META[tab] || FALLBACK_META;
  const state = stateFor(online, dataState, meta);
  const showLocation = meta.showLocation !== false;
  const location = weather?.location || selectedPlace || "No location selected";
  const source = meta.usesWeather
    ? weather?.data_source || "No live provider payload"
    : meta.source || FALLBACK_META.source;
  const updated = meta.usesWeather
    ? weather?.updated_at_ist
      ? `Updated ${weather.updated_at_ist}`
      : "Timestamp unavailable"
    : meta.updated || FALLBACK_META.updated;

  return (
    <aside className={`wg-provenance is-${state.tone}`} aria-label="Data provenance and status">
      <div className="wg-prov-main">
        <span className="wg-prov-dot" aria-hidden="true" />
        <strong>{meta.kind}</strong>
        <span className="wg-prov-state">{state.label}</span>
        {showLocation && (
          <>
            <span className="wg-prov-sep" aria-hidden="true" />
            <span>{location}</span>
          </>
        )}
        <span className="wg-prov-sep" aria-hidden="true" />
        <span>{source}</span>
        <span className="wg-prov-sep" aria-hidden="true" />
        <span>{updated}</span>
      </div>
      <div className="wg-prov-foot">
        <span>{meta.note}</span>
        {onOpenStatus && (
          <button type="button" className="wg-prov-link" onClick={onOpenStatus}>
            Data status →
          </button>
        )}
      </div>
    </aside>
  );
}
