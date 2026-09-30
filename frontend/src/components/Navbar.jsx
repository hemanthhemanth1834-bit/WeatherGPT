import React, { useEffect, useRef, useState } from "react";
import { searchLocations } from "../services/api";

const TABS = [
  ["home", "Weather"],
  ["chat", "AI Chat"],
  ["dashboard", "Forecast"],
  ["map", "Radar · GIS"],
  ["alerts", "Alerts"],
  ["severe", "Severe"],
  ["risk", "Risk"],
  ["agri", "Agriculture"],
  ["aviation_marine", "Air · Sea"],
  ["compare", "Compare"],
  ["climate", "Climate"],
  ["nwp", "NWP"],
  ["satellite", "Satellite"],
  ["saved", "Saved"],
  ["about", "About"],
];

const PERSONAS = [
  ["general", "Citizen"],
  ["farmer", "Farmer"],
  ["disaster_manager", "Disaster Mgr"],
  ["aviation", "Aviation"],
  ["marine", "Marine"],
  ["researcher", "Researcher"],
];

export function personaForApi(uiPersona) {
  return uiPersona === "researcher" ? "general" : uiPersona || "general";
}

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

export default function Navbar({ tab, onTab, persona, onPersona, language, onLanguage, place, onPlace, onSearch, onLocate, alertCount, saved, onRemoveSaved, weather, onVoice }) {
  const [hints, setHints] = useState([]);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!place || place.trim().length < 2) {
      setHints([]);
      return;
    }
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
  const go = (id) => {
    onTab(id);
    setMenu(false);
  };

  return (
    <header className="wg-topbar">
      <div className="wg-wrap" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.7rem", paddingTop: "0.6rem", paddingBottom: "0.45rem" }}>
        <button onClick={() => go("home")} aria-label="WeatherGPT home" style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", color: "inherit", textAlign: "left" }}>
          <span aria-hidden="true" style={{ width: "2.4rem", height: "2.4rem", borderRadius: "0.85rem", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", background: "linear-gradient(135deg,#0369a1,#38bdf8)", boxShadow: "0 8px 20px -8px rgba(14,165,233,.8)" }}>
            ⛅
          </span>
          <span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 800, fontSize: "1.08rem" }}>
              WeatherGPT <span className="wg-chip live">SIH 2026</span>
            </span>
            <span style={{ display: "block", fontSize: "0.68rem", color: "var(--wg-muted)" }}>AI Weather Intelligence</span>
          </span>
        </button>

        {weather && (
          <button onClick={() => go("dashboard")} title="Open forecast" aria-label={`Current: ${weather.current_temp} degrees in ${weather.location}. Open forecast.`}
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.3)", color: "inherit", borderRadius: "0.8rem", padding: "0.35rem 0.7rem", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
            <span className="wg-pulse-dot" aria-hidden="true" style={{ background: "var(--wg-success)" }} />
            {weather.location} · {weather.current_temp}°
            <span style={{ color: "var(--wg-muted)", fontWeight: 500 }}>{weather.condition}</span>
          </button>
        )}

        <div ref={boxRef} style={{ position: "relative", flex: "1 1 200px", maxWidth: "22rem" }}>
          <form onSubmit={submit} role="search" style={{ display: "flex", gap: "0.4rem" }}>
            <input className="wg-input" type="search" aria-label="Search for a city, district or locality" placeholder="Search city, district, locality…" value={place}
              onChange={(e) => { onPlace(e.target.value); setOpen(true); }} onFocus={() => hints.length && setOpen(true)} />
            <button type="button" className="wg-btn-ghost" onClick={onLocate} aria-label="Use my current location" title="Use my current location">◎</button>
            <button type="submit" className="wg-btn" aria-label="Load weather for this place">Go</button>
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
          {saved?.length > 0 && (
            <div className="wg-scrollrow" style={{ marginTop: "0.35rem" }} aria-label="Saved places">
              {saved.map((name) => (
                <span key={name} className="wg-chip" style={{ textTransform: "none" }}>
                  <button onClick={() => onSearch(name)} title={`Load ${name}`} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>★ {name}</button>
                  <button onClick={() => onRemoveSaved(name)} aria-label={`Remove ${name}`} title="Remove" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginLeft: "auto" }}>
          <button className="wg-btn-ghost" onClick={onVoice} aria-label="Ask WeatherGPT by voice" title="Ask by voice (opens chat)">🎙</button>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
            <span className="wg-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Response language</span>
            <select className="wg-input" style={{ width: "auto" }} value={language} onChange={(e) => onLanguage(e.target.value)} aria-label="Response language">
              {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
            <span className="wg-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>User profile</span>
            <select className="wg-input" style={{ width: "auto" }} value={persona} onChange={(e) => onPersona(e.target.value)} aria-label="User profile">
              {PERSONAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <button className="wg-btn-ghost" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation menu">
            {menu ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <div className="wg-wrap" style={{ paddingBottom: "0.55rem" }}>
        <nav className="wg-scrollrow" role="tablist" aria-label="WeatherGPT sections" style={{ display: menu ? "none" : undefined }}>
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="wg-tab" onClick={() => go(id)}>
              {label}{id === "alerts" && alertCount > 0 ? ` (${alertCount})` : ""}
            </button>
          ))}
        </nav>
        {menu && (
          <nav aria-label="WeatherGPT sections menu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(9rem,1fr))", gap: "0.4rem", paddingBottom: "0.3rem" }}>
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className="wg-tab" style={{ textAlign: "left", border: "1px solid var(--wg-line-soft)" }} onClick={() => go(id)}>
                {label}{id === "alerts" && alertCount > 0 ? ` (${alertCount})` : ""}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
