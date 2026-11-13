import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCurrentWeather, fetchFloodRisk, fetchImdWarnings, fetchRiskAssessment } from "../services/api";
import { GIBS_LAYERS, gibsDate, gibsWms } from "../services/gibs";
import EmergencyContacts from "./EmergencyContacts";
import LiveImagery from "./LiveImagery";
import SafetyMap from "./SafetyMap";
import { LocationRadarImagery } from "./LocationImagery";
import "./SafetyCenter.css";

const SNAPSHOT_KEY = "weathergpt.floodSnapshots.v1";
const LEVEL_TONE = { LOW: "low", MODERATE: "moderate", HIGH: "high", EXTREME: "extreme" };

function listSnapshots() {
  try {
    const data = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
    return Array.isArray(data) ? data.slice(-8).reverse() : [];
  } catch {
    return [];
  }
}

function timeLabel(value) {
  if (!value) return "time not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function parseRain(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hazardText(item) {
  return `${item.title || ""} ${item.description || ""} ${item.event || ""}`.toLowerCase();
}

export default function RiskPanel({ location, weather, onAsk, onTab }) {
  const [risk, setRisk] = useState(null);
  const [flood, setFlood] = useState(null);
  const [current, setCurrent] = useState(weather || null);
  const [official, setOfficial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceErrors, setSourceErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [snapshots, setSnapshots] = useState(listSnapshots);
  const [showContacts, setShowContacts] = useState(false);

  const target = (location || weather?.location || "").trim();

  const load = useCallback(async () => {
    if (!target) {
      setError("Search a location first — FloodWatch needs a place to assess.");
      return;
    }
    setLoading(true);
    setError("");
    setSourceErrors({});
    const lat = Number(weather?.lat);
    const lon = Number(weather?.lon);
    const point = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;

    const weatherPromise =
      weather && weather.location === target
        ? Promise.resolve(weather)
        : fetchCurrentWeather(target).catch((reason) => {
            setSourceErrors((previous) => ({ ...previous, weather: reason?.message || "weather unavailable" }));
            return null;
          });

    const [weatherResult, riskResult, floodResult, imdResult] = await Promise.all([
      weatherPromise,
      fetchRiskAssessment(target, point?.lat ?? null, point?.lon ?? null).catch((reason) => {
        setSourceErrors((previous) => ({ ...previous, risk: reason?.message || "risk engine unavailable" }));
        return null;
      }),
      fetchFloodRisk(target, point?.lat ?? null, point?.lon ?? null).catch((reason) => {
        setSourceErrors((previous) => ({ ...previous, flood: reason?.message || "flood proxy unavailable" }));
        return null;
      }),
      fetchImdWarnings(40).catch((reason) => {
        setSourceErrors((previous) => ({ ...previous, imd: reason?.message || "IMD feed unavailable" }));
        return null;
      }),
    ]);

    setCurrent(weatherResult || weather || null);
    setRisk(riskResult);
    setFlood(floodResult);
    setOfficial(imdResult);

    if (floodResult && !floodResult.error) {
      const snapshot = {
        at: new Date().toISOString(),
        location: target,
        risk: floodResult.risk,
        score: floodResult.score,
        rain24: parseRain(floodResult.rain_24h ?? weatherResult?.daily?.[0]?.rain_sum),
      };
      try {
        const previous = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "[]");
        const next = [...(Array.isArray(previous) ? previous : []), snapshot].slice(-8);
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
        setSnapshots(next.slice().reverse());
      } catch {
        /* local history is optional */
      }
    }
    if (!weatherResult && !riskResult && !floodResult) {
      setError("FloodWatch sources did not answer. No rainfall, elevation, or flood values are being fabricated.");
    }
    setLastRefresh(new Date().toISOString());
    setLoading(false);
  }, [target, weather]);

  useEffect(() => {
    load();
  }, [load]);

  const hourly = Array.isArray(current?.hourly) ? current.hourly.slice(0, 24) : [];
  const rainNow = parseRain(current?.precipitation);
  const rain24 = parseRain(current?.daily?.[0]?.rain_sum) ?? parseRain(flood?.rain_24h);
  const rain7 = current?.daily ? current.daily.slice(0, 7).reduce((sum, day) => sum + (parseRain(day.rain_sum) || 0), 0) : null;
  const maxHourly = Math.max(1, ...hourly.map((hour) => parseRain(hour.rain) || 0));
  const elevation = parseRain(flood?.elevation_m);
  const officialFloodItems = useMemo(() => {
    const items = Array.isArray(official?.items) ? official.items : [];
    return items
      .filter((item) => /flood|rain|cyclone|thunder|storm|inundat|waterlog|cloudburst/i.test(hazardText(item)))
      .slice(0, 8);
  }, [official]);

  const level = flood?.risk || (flood?.error ? "UNAVAILABLE" : "LOADING");
  const tone = LEVEL_TONE[level] || "unknown";
  const riskLevels = risk?.levels || {};

  return (
    <section className="wg-safety" aria-label="FloodWatch flood monitoring">
      <header className="wg-safety-hero">
        <img className="wg-safety-hero-media" src="/imagery/cinematic/flood-affected-village.webp" alt="Flood-affected village, illustrative flood-context image only" loading="eager" />
        <div className="wg-safety-hero-inner">
          <span className="wg-safety-kicker">FLOODWATCH · OBSERVED + FORECAST + LIMITS</span>
          <h1 className="wg-safety-title">Rain is context. Flooding needs evidence.</h1>
          <p className="wg-safety-lede">
            Observed rainfall, forecast accumulation, radar and satellite context are shown separately from the computed
            rain-plus-elevation susceptibility proxy. No river gauge, inundation depth, damage, or road closure is inferred.
          </p>
          <div className="wg-safety-hero-row">
            <span className="wg-safety-status-item"><strong>Location</strong> {target || "not selected"}</span>
            <span className="wg-safety-status-item"><span className={`wg-safety-chip ${official?.status === "LIVE" ? "live" : "unavailable"}`}>IMD {official?.status === "LIVE" ? "LIVE" : "UNAVAILABLE"}</span></span>
            <span className="wg-safety-status-item"><strong>Refreshed</strong> {lastRefresh ? timeLabel(lastRefresh) : "not yet"}</span>
          </div>
          <div className="wg-safety-toolbar">
            <button type="button" className="wg-safety-btn primary" onClick={load} disabled={loading}>{loading ? "Assessing…" : "Refresh FloodWatch"}</button>
            <button type="button" className="wg-safety-btn" onClick={() => setShowContacts(true)}>Emergency contacts</button>
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("alerts")}>Severe Alerts</button> : null}
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("severe")}>Preparedness</button> : null}
          </div>
        </div>
      </header>

      {showContacts ? <EmergencyContacts onClose={() => setShowContacts(false)} /> : null}

      {error ? <div className="wg-safety-error" role="alert">{error} <button type="button" className="wg-safety-btn" onClick={load}>Retry</button></div> : null}
      {Object.keys(sourceErrors).length ? (
        <div className="wg-safety-notice warn" role="status">
          <strong>Partial data.</strong> {Object.entries(sourceErrors).map(([key, value]) => `${key}: ${value}`).join(" · ")}. Missing values stay missing.
        </div>
      ) : null}

      <div className="wg-safety-kpis" aria-label="FloodWatch summary">
        <div className={`wg-safety-kpi ${tone}`}><span className="label">Computed flood proxy</span><strong>{loading && !flood ? "…" : level}</strong><small>{flood?.score != null ? `${flood.score}/100 · rain + elevation only` : "not an official flood warning"}</small></div>
        <div className="wg-safety-kpi cyan"><span className="label">Rain now</span><strong>{rainNow != null ? `${rainNow} mm` : "—"}</strong><small>current Open-Meteo value</small></div>
        <div className="wg-safety-kpi cyan"><span className="label">Next 24h rain</span><strong>{rain24 != null ? `${rain24} mm` : "—"}</strong><small>model forecast, not observed</small></div>
        <div className="wg-safety-kpi"><span className="label">7-day rain</span><strong>{rain7 != null ? `${rain7.toFixed(1)} mm` : "—"}</strong><small>forecast accumulation</small></div>
      </div>

      <div className="wg-safety-grid two">
        <section className="wg-safety-panel" aria-label="Rainfall timeline">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">FORECAST CONTEXT</span><h2>Next 24 hours of rainfall</h2><p>Model rainfall, not a gauge observation. Bars are scaled to the largest hourly value.</p></div>
            <span className="wg-safety-badge computed">OPEN-METEO</span>
          </div>
          {hourly.length ? (
            <>
              <div className="wg-safety-bars" role="img" aria-label="Hourly rainfall forecast bars">
                {hourly.map((hour, index) => {
                  const value = parseRain(hour.rain) || 0;
                  return (
                    <div className="wg-safety-bar" key={`${hour.time || index}`}>
                      <i style={{ height: `${Math.max(2, (value / maxHourly) * 100)}%` }} title={`${value} mm at ${hour.time || "hour"}`} />
                      <span>{String(hour.time || "").slice(11, 16) || `${index}h`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="wg-safety-bars-caption"><span>Next hours</span><span>Maximum hourly {maxHourly.toFixed(1)} mm</span></div>
            </>
          ) : <div className="wg-safety-empty">Hourly forecast is unavailable for this location. No bars are generated.</div>}
        </section>

        <section className="wg-safety-panel" aria-label="Computed flood evidence">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">COMPUTED SUSCEPTIBILITY</span><h2>Flood evidence and limits</h2><p>This is not observed flooding and not an official warning.</p></div>
            <span className="wg-safety-badge computed">RAIN + ELEVATION</span>
          </div>
          {flood && !flood.error ? (
            <>
              <ul className="wg-safety-timeline">
                {(flood.drivers || []).map((driver, index) => (<li key={index}><strong>{driver}</strong><span>computed driver</span></li>))}
                <li><strong>Point elevation: {elevation != null ? `${elevation} m` : "not available"}</strong><span>single-point sample; no slope, drainage, soil, river, or tide input</span></li>
              </ul>
              <div className="wg-safety-notice warn" style={{ marginTop: "0.55rem" }}>
                {flood.data_type || "COMPUTED proxy"} · {flood.limits || "No hydrological model, river gauge, or depth estimate is connected."}
              </div>
            </>
          ) : <div className="wg-safety-empty">{loading ? "Computing rain + elevation proxy…" : "The computed proxy did not answer. No risk level is shown rather than guessed."}</div>}
          {risk ? (
            <div className="wg-safety-notice" style={{ marginTop: "0.55rem" }}>
              General risk engine: <strong>{risk.overall}</strong> overall for {risk.location}. Flood level {riskLevels.flood || "—"}. {risk.disclaimer || ""}
            </div>
          ) : null}
          {onAsk ? <button type="button" className="wg-safety-btn" style={{ marginTop: "0.55rem" }} onClick={() => onAsk(`Explain the FloodWatch evidence for ${target}: rainfall now ${rainNow ?? "unavailable"} mm, next 24h ${rain24 ?? "unavailable"} mm, computed flood proxy ${level}, elevation ${elevation ?? "unavailable"} m. Separate observed, forecast, and computed information. Do not invent river levels or flood depth.`)}>Ask WeatherGPT to explain</button> : null}
        </section>
      </div>

      <SafetyMap weather={current || weather} items={officialFloodItems.map((item) => ({
        ...item,
        title: item.title,
        description: item.description,
        severity: item.severity,
        source: item.source,
        link: item.link,
        geometry: item.geometry,
      }))} title={`Flood warning context near ${target || "India"}`} />

      <div className="wg-safety-grid two">
        <LocationRadarImagery
          lat={current?.lat ?? weather?.lat}
          lon={current?.lon ?? weather?.lon}
          place={target}
          title={`Observed radar near ${target || "the selected area"}`}
          description="Latest RainViewer composite. Blank areas mean no radar coverage, not dry ground. The radar is not a flood extent map."
        />
        <LiveImagery
          title={`NASA flood-water composite · ${gibsDate(1)}`}
          description={`${GIBS_LAYERS.flood.description} A two-day MODIS composite is not a live depth measurement. It can miss small floods, clouds, and urban water.`}
          src={gibsWms(GIBS_LAYERS.flood.layer, gibsDate(1), `${Number(weather?.lon ?? 78.9629) - 4},${Number(weather?.lat ?? 20.5937) - 3},${Number(weather?.lon ?? 78.9629) + 4},${Number(weather?.lat ?? 20.5937) + 3}`)}
          alt={`NASA GIBS flood-water composite near ${target || "India"}, ${gibsDate(1)}`}
          sourceName="NASA GIBS (U.S. public domain)"
          sourceUrl="https://worldview.earthdata.nasa.gov/"
          observedAt={`${gibsDate(1)} · 2-day composite`}
          status="DELAYED"
          minHeight="11rem"
        />
      </div>

      <section className="wg-safety-panel" aria-label="Official flood warnings">
        <div className="wg-safety-panel-head">
          <div><span className="wg-safety-kicker">OFFICIAL SOURCE TEXT</span><h2>IMD flood, rain, and cyclone nowcasts</h2><p>Official RSS records filtered by hazard words. No severity, polygon, or expiry is invented.</p></div>
          <span className={`wg-safety-badge ${official?.status === "LIVE" ? "live" : "unavailable"}`}>{official?.status === "LIVE" ? "OFFICIAL FEED LIVE" : "OFFICIAL FEED UNAVAILABLE"}</span>
        </div>
        {officialFloodItems.length ? (
          <div className="wg-safety-list">
            {officialFloodItems.map((item, index) => (
              <article className="wg-safety-alert sev-official" key={`${item.title}-${index}`}>
                <div className="wg-safety-alert-head">
                  <span className="wg-safety-badge official">OFFICIAL</span>
                  <span className="wg-safety-chip official">SOURCE SEVERITY NOT STATED</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="wg-safety-meta"><span>Source: {item.source || "IMD"}</span><span>Published: {timeLabel(item.published)}</span></div>
                {item.link ? <a className="wg-safety-btn" style={{ marginTop: "0.5rem" }} href={item.link} target="_blank" rel="noreferrer">Original IMD item</a> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={`wg-safety-notice ${official?.status === "LIVE" ? "" : "warn"}`}>
            {official?.status === "LIVE" ? "The official feed returned no flood/rain/cyclone items in this filtered view. This is not a flood clearance." : "The IMD feed is unavailable or timed out. No official warning or flood polygon is being displayed. Call 112 for an emergency."}
          </div>
        )}
      </section>

      <div className="wg-safety-grid two">
        <section className="wg-safety-panel wg-safety-data-gap" aria-label="Flood data gaps">
          <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">NOT CONNECTED</span><h2>What FloodWatch cannot tell you</h2></div></div>
          <p><strong>River gauge levels and discharge:</strong> not connected. No river height, flow, or threshold is inferred from rainfall.</p>
          <p><strong>Inundation depth:</strong> not modeled. The app has no hydraulic model, terrain slope, drainage network, soil moisture, or tide inputs, so it does not predict depth.</p>
          <p><strong>Road closures, affected buildings, shelters:</strong> not connected. No location is marked safe or cut off without a verified source.</p>
          <p><strong>Official warning polygons:</strong> the current IMD RSS integration provides text and links, not machine polygons. Point markers on the map are not a flood extent.</p>
          <p><strong>Catchment and terrain:</strong> only a point elevation is available from the proxy. No HydroSHEDS/OpenTopography layer is loaded in this local build.</p>
        </section>

        <section className="wg-safety-panel" aria-label="Local flood snapshot history">
          <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">LOCAL HISTORY</span><h2>Your recent computed snapshots</h2><p>Stored in this browser only. These are historical computed values, not an official flood event archive.</p></div></div>
          {snapshots.length ? (
            <ol className="wg-safety-timeline">
              {snapshots.map((snapshot, index) => (
                <li key={`${snapshot.at}-${index}`} className="computed">
                  <strong>{snapshot.location || target} · {snapshot.risk || "—"} {snapshot.score != null ? `(${snapshot.score}/100)` : ""}</strong>
                  <span>{timeLabel(snapshot.at)} · {snapshot.rain24 != null ? `${snapshot.rain24} mm 24h` : "rain unavailable"} · computed</span>
                </li>
              ))}
            </ol>
          ) : <div className="wg-safety-empty">No local snapshots yet. A successful computed flood-proxy refresh will add one.</div>}
          <p className="wg-safety-credit">Hero image: Flood-affected village by KEmel49 (CC BY-SA 4.0), illustrative context only — not current flooding at this location. Clear this history in your browser storage if you do not want local snapshots retained.</p>
        </section>
      </div>
    </section>
  );
}
