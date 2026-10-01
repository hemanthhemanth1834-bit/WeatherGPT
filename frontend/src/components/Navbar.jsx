import React, { useEffect, useRef, useState } from "react";
import { searchLocations } from "../services/api";

const PERSONAS = [
  ["general", "Citizen"],
  ["farmer", "Farmer"],
  ["disaster_manager", "Disaster Mgr"],
  ["aviation", "Aviation"],
  ["marine", "Marine"],
  ["researcher", "Researcher"],
];

const LANGS = [
  ["auto", "Auto"],
  ["en", "English"],
  ["te", "తెలుగు"],
  ["hi", "हिन्दी"],
  ["ta", "தமிழ்"],
  ["kn", "ಕನ್ನಡ"],
  ["ml", "മലയാളം"],
  ["mr", "मराठी"],
  ["bn", "বাংলা"],
  ["gu", "ગુજરાતી"],
  ["pa", "ਪੰਜਾਬੀ"],
  ["or", "ଓଡ଼ିଆ"],
];

export default function Navbar({ onHome, persona, onPersona, language, onLanguage, place, onPlace, onSearch, onLocate, locating, gpsLabel, alertCount, onAlerts, saved, onRemoveSaved, weather, onVoice, onMenu }) {
  const [hints, setHints] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!place || place.trim().length < 2) return undefined;
    const timer = setTimeout(async () => setHints(await searchLocations(place.trim(), 6)), 250);
    return () => clearTimeout(timer);
  }, [place]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    setOpen(false);
    onSearch(place);
  };

  return (
    <>
      {alertCount > 0 && (
        <button onClick={onAlerts} aria-label={`${alertCount} active alerts. Open alerts.`}
          style={{ display: "block", width: "100%", border: "none", cursor: "pointer", padding: 0, background: "none" }}>
          <div className="wg-tickerbar" aria-hidden="true">
            <div>
              COMPUTED ALERTS (not official bulletins): {alertCount} active — open the Alerts tab for severity, areas and recommended actions.&nbsp;&nbsp;•&nbsp;&nbsp;COMPUTED ALERTS (not official bulletins): {alertCount} active.
            </div>
          </div>
        </button>
      )}
      <header className="wg-topbar">
        <div className="wg-wrap" style={{ display: "flex", alignItems: "center", gap: "0.55rem", paddingTop: "0.55rem", paddingBottom: "0.55rem", flexWrap: "wrap" }}>
          <button onClick={onHome} aria-label="WeatherGPT home" style={{ display: "flex", alignItems: "center", gap: "0.55rem", background: "none", border: "none", cursor: "pointer", color: "inherit", textAlign: "left", padding: 0 }}>
            <span aria-hidden="true" style={{ width: "2.3rem", height: "2.3rem", borderRadius: "0.8rem", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", background: "linear-gradient(135deg,#0369a1,#38bdf8)", boxShadow: "0 8px 20px -8px rgba(14,165,233,.8)" }}>
              ⛅
            </span>
            <span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "1.02rem" }}>
                WeatherGPT <span className="wg-chip live">SIH 2026</span>
              </span>
              <span style={{ display: "block", fontSize: "0.64rem", color: "var(--wg-muted)" }}>AI Weather Intelligence</span>
            </span>
          </button>

          <div ref={boxRef} className="wg-hsearch" style={{ position: "relative", flex: "1 1 11rem", maxWidth: "21rem", minWidth: "10rem" }}>
            <form onSubmit={submit} role="search" style={{ display: "flex", gap: "0.35rem" }}>
              <input className="wg-input" type="search" aria-label="Search for a city, district or locality" placeholder="📍 Search place…" value={place}
                onChange={(e) => {
                  onPlace(e.target.value);
                  if (e.target.value.trim().length < 2) {
                    setHints([]);
                    setOpen(false);
                  } else {
                    setOpen(true);
                  }
                }} onFocus={() => hints.length && setOpen(true)} style={{ padding: "0.5rem 0.7rem" }} />
              <button type="button" className="wg-util" onClick={onLocate} disabled={locating} aria-label={locating ? "Detecting your location" : "Use my current location"} title="Use my current location (GPS)" style={{ padding: "0.4rem 0.6rem" }}>
              {locating ? "…" : "◎"}
            </button>
              <button type="submit" className="wg-btn" aria-label="Load weather for this place" style={{ padding: "0.45rem 0.8rem" }}>Go</button>
            </form>
            {open && hints.length > 0 && (
              <ul style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 0.3rem)", margin: 0, padding: "0.3rem", listStyle: "none", background: "var(--wg-bg-2)", border: "1px solid var(--wg-line)", borderRadius: "0.8rem" }}>
                {hints.map((h) => (
                  <li key={`${h.name}-${h.lat}`}>
                    <button className="wg-tab" style={{ width: "100%", textAlign: "left" }}
                      onClick={() => { onPlace(h.name); setOpen(false); onSearch(h.name, h.lat, h.lon); }}>
                      <strong>{h.name}</strong><span style={{ color: "var(--wg-muted)" }}> — {h.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {gpsLabel && !locating && (
            <span className="wg-chip live" title="Last successful GPS fix (stored only in this browser)">
              📍 Current Location — {gpsLabel.name}{gpsLabel.state ? `, ${gpsLabel.state}` : ""}
            </span>
          )}
          {locating && (
            <span className="wg-chip static" role="status">Detecting location…</span>
          )}
          {weather && (
            <span className="wg-util wg-livepill" style={{ cursor: "default" }} aria-label={`Current: ${weather.current_temp} degrees in ${weather.location}`}>
              <span className="wg-pulse-dot" aria-hidden="true" style={{ background: "var(--wg-success)" }} />
              {weather.location} · {weather.current_temp}°
              <span className="sub">{weather.condition}</span>
            </span>
          )}

          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginLeft: "auto" }}>
            <button className="wg-util" onClick={onVoice} aria-label="Ask WeatherGPT by voice" title="Ask by voice">🎙</button>
            <select className="wg-input" style={{ width: "auto", padding: "0.45rem 0.6rem" }} value={language} onChange={(e) => onLanguage(e.target.value)} aria-label="Response language">
              {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <select className="wg-input" style={{ width: "auto", padding: "0.45rem 0.6rem" }} value={persona} onChange={(e) => onPersona(e.target.value)} aria-label="User profile">
              {PERSONAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <button className="wg-util" onClick={onAlerts} aria-label={`Open alerts, ${alertCount} active`} title="Alerts" style={{ position: "relative" }}>
              🔔{alertCount > 0 && <span className="wg-badge" style={{ position: "absolute", top: "-0.4rem", right: "-0.4rem" }}>{alertCount}</span>}
            </button>
            <button className="wg-util wg-burger" onClick={onMenu} aria-label="Open navigation menu">☰</button>
          </div>
        </div>

        {saved?.length > 0 && (
          <div className="wg-wrap" style={{ paddingBottom: "0.45rem" }}>
            <div className="wg-scrollrow" aria-label="Saved places">
              {saved.map((name) => (
                <span key={name} className="wg-chip" style={{ textTransform: "none" }}>
                  <button onClick={() => onSearch(name)} title={`Load ${name}`} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>★ {name}</button>
                  <button onClick={() => onRemoveSaved(name)} aria-label={`Remove ${name}`} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
