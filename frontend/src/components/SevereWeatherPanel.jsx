import React, { useEffect, useState } from "react";
import { fetchDisasters, fetchEarthquakes, fetchWildfires } from "../services/api";
import PreparednessCenter from "./PreparednessCenter";
import "./SafetyCenter.css";

function eventTitle(event) {
  return event.name?.startsWith(event.event_label) ? event.name : `${event.event_label || "Hazard"} — ${event.name || "Unnamed event"}`;
}

export default function SevereWeatherPanel({ weather, selectedPlace = "", onAsk, onTab }) {
  const [global, setGlobal] = useState(null);
  const [quakes, setQuakes] = useState(null);
  const [fires, setFires] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchDisasters("world"), fetchEarthquakes(4.5, 7), fetchWildfires(12)]).then(([gd, qk, fr]) => {
      if (cancelled) return;
      const nextErrors = {};
      setGlobal(gd.status === "fulfilled" ? gd.value : null);
      setQuakes(qk.status === "fulfilled" ? qk.value : { events: [] });
      setFires(fr.status === "fulfilled" ? fr.value : { events: [] });
      if (gd.status === "rejected") nextErrors.global = gd.reason?.message || "GDACS unavailable";
      if (qk.status === "rejected") nextErrors.quakes = qk.reason?.message || "USGS unavailable";
      if (fr.status === "rejected") nextErrors.fires = fr.reason?.message || "EONET unavailable";
      setErrors(nextErrors);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wg-safety">
      <PreparednessCenter weather={weather} selectedPlace={selectedPlace} onAsk={onAsk} onTab={onTab} />

      <section className="wg-safety-panel" aria-label="Third-party global hazard context">
        <div className="wg-safety-panel-head">
          <div>
            <span className="wg-safety-kicker">THIRD-PARTY CONTEXT · NOT AN INDIAN OFFICIAL BULLETIN</span>
            <h2>Global hazard watch</h2>
            <p>GDACS, USGS, and NASA EONET are shown for context. They do not replace IMD, NDMA, CWC, or district instructions.</p>
          </div>
          <span className="wg-safety-badge third-party">GDACS · USGS · EONET</span>
        </div>
        {Object.keys(errors).length ? (
          <div className="wg-safety-notice warn" role="status">
            <strong>Partial feed.</strong> {Object.entries(errors).map(([key, value]) => `${key}: ${value}`).join(" · ")}. Missing events are not replaced with guesses.
          </div>
        ) : null}

        <div className="wg-safety-grid three" style={{ marginTop: "0.65rem" }}>
          <div className="wg-safety-panel">
            <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">USGS</span><h3>Recent earthquakes</h3></div><span className="wg-safety-badge official">OFFICIAL</span></div>
            {quakes?.events?.length ? (
              <div className="wg-safety-list">
                {quakes.events.slice(0, 6).map((quake, index) => (
                  <div className="wg-safety-alert" key={`${quake.time || index}`}>
                    <div className="wg-safety-alert-head"><span className="wg-safety-chip orange">M{quake.magnitude}</span>{quake.tsunami ? <span className="wg-safety-chip red">TSUNAMI FLAG</span> : null}</div>
                    <h3>{quake.place || "Location not stated"}</h3>
                    <div className="wg-safety-meta"><span>Depth: {quake.depth_km ?? "not supplied"} km</span><span>Source: USGS</span></div>
                  </div>
                ))}
              </div>
            ) : <div className="wg-safety-empty">No USGS events were returned, or the feed is unavailable. This is not a seismic all-clear.</div>}
          </div>

          <div className="wg-safety-panel">
            <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">NASA EONET</span><h3>Open wildfires</h3></div><span className="wg-safety-badge official">SATELLITE</span></div>
            {fires?.events?.length ? (
              <div className="wg-safety-list">
                {fires.events.slice(0, 6).map((fire, index) => (
                  <div className="wg-safety-alert" key={`${fire.title || index}`}>
                    <h3>{fire.title || "Wildfire detection"}</h3>
                    <div className="wg-safety-meta"><span>{fire.date ? fire.date.slice(0, 10) : "date not supplied"}</span><span>{fire.satellite || "satellite detection"}</span></div>
                  </div>
                ))}
              </div>
            ) : <div className="wg-safety-empty">No EONET events were returned, or the feed is unavailable.</div>}
            <p className="wg-safety-credit">Satellite hotspot detections are not a confirmed fire perimeter. Verify with local authorities.</p>
          </div>

          <div className="wg-safety-panel">
            <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">GDACS / UN JRC</span><h3>Global disasters</h3></div><span className="wg-safety-badge third-party">CONTEXT</span></div>
            {global?.events?.length ? (
              <div className="wg-safety-list">
                {global.events.slice(0, 6).map((event, index) => (
                  <a className="wg-safety-alert" key={`${event.name || index}`} href={event.report_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="wg-safety-alert-head"><span className={`wg-safety-chip ${event.alert_level === "Red" ? "red" : event.alert_level === "Orange" ? "orange" : "yellow"}`}>{event.alert_level || "—"}</span>{event.near_india ? <span className="wg-safety-chip official">NEAR INDIA</span> : null}</div>
                    <h3>{eventTitle(event)}</h3>
                    <div className="wg-safety-meta"><span>{event.from ? event.from.slice(0, 10) : "start not supplied"} → {event.to ? event.to.slice(0, 10) : "ongoing"}</span><span>GDACS</span></div>
                  </a>
                ))}
              </div>
            ) : <div className="wg-safety-empty">No GDACS events were returned, or the feed is unavailable.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
