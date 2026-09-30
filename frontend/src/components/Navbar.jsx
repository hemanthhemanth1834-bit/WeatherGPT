import React, { useEffect, useRef, useState } from "react";
import { searchLocations } from "../services/api";

const TABS = [
  ["chat", "Chat"],
  ["dashboard", "Forecast"],
  ["map", "Map"],
  ["agri", "Agri"],
  ["aviation_marine", "Air·Sea"],
  ["alerts", "Alerts"],
  ["compare", "Compare"],
  ["climate", "Climate"],
  ["risk", "Risk"],
  ["nwp", "NWP·Sat"],
  ["about", "About"],
];

const PERSONAS = [
  ["general", "Public"],
  ["farmer", "Farmer"],
  ["disaster_manager", "Disaster cell"],
  ["aviation", "Aviation"],
  ["marine", "Marine"],
];

const LANGS = [
  ["auto", "Auto"],
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["mr", "मराठी"],
  ["ta", "தமிழ்"],
  ["te", "తెలుగు"],
  ["bn", "বাংলা"],
  ["gu", "ગુજરાતી"],
  ["pa", "ਪੰਜਾਬੀ"],
  ["kn", "ಕನ್ನಡ"],
  ["ml", "മലയാളം"],
  ["or", "ଓଡ଼ିଆ"],
];

export default function Navbar({ tab, onTab, persona, onPersona, language, onLanguage, place, onPlace, onSearch, onLocate, alertCount, saved }) {
  const [hints, setHints] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!place || place.trim().length < 2) {
      setHints([]);
      return;
    }
    const timer = setTimeout(async () => {
      setHints(await searchLocations(place.trim(), 6));
    }, 250);
    return () => clearTimeout(timer);
  }, [place]);

  useEffect(() => {
    const close = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (event) => {
    event?.preventDefault();
    setOpen(false);
    onSearch(place);
  };

  return (
    <header className="wg-topbar">
      <div className="wg-wrap" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.7rem", paddingTop: "0.6rem", paddingBottom: "0.45rem" }}>
        <button onClick={() => onTab("chat")} aria-label="WeatherGPT home" style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", color: "inherit", textAlign: "left" }}>
          <span aria-hidden="true" style={{ width: "2.3rem", height: "2.3rem", borderRadius: "0.8rem", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", background: "linear-gradient(135deg,#0369a1,#38bdf8)" }}>
            ⛅
          </span>
          <span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 800, fontSize: "1.05rem" }}>
              WeatherGPT <span className="wg-chip live">SIH 2026</span>
            </span>
            <span style={{ display: "block", fontSize: "0.68rem", color: "var(--wg-muted)" }}>
              AI Weather Intelligence · MoES / IMD problem statement
            </span>
          </span>
        </button>

        <div ref={boxRef} style={{ position: "relative", flex: "1 1 220px", maxWidth: "26rem" }}>
          <form onSubmit={submit} role="search" style={{ display: "flex", gap: "0.4rem" }}>
            <input
              className="wg-input"
              type="search"
              aria-label="Search for a city, district or locality"
              placeholder="Search city, district, locality…"
              value={place}
              onChange={(e) => {
                onPlace(e.target.value);
                setOpen(true);
              }}
              onFocus={() => hints.length && setOpen(true)}
            />
            <button type="button" className="wg-btn-ghost" onClick={onLocate} aria-label="Use my current location" title="Use my current location">
              ◎
            </button>
            <button type="submit" className="wg-btn" aria-label="Load weather for this place">
              Go
            </button>
          </form>
          {open && hints.length > 0 && (
            <ul style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 0.3rem)", margin: 0, padding: "0.3rem", listStyle: "none", background: "var(--wg-surface)", border: "1px solid var(--wg-line)", borderRadius: "0.8rem" }}>
              {hints.map((h) => (
                <li key={`${h.name}-${h.lat}`}>
                  <button
                    className="wg-tab"
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => {
                      onPlace(h.name);
                      setOpen(false);
                      onSearch(h.name, h.lat, h.lon);
                    }}
                  >
                    <strong>{h.name}</strong>
                    <span style={{ color: "var(--wg-muted)" }}> — {h.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {saved?.length > 0 && (
            <div className="wg-scrollrow" style={{ marginTop: "0.35rem" }} aria-label="Saved places">
              {saved.map((name) => (
                <button key={name} className="wg-chip" style={{ cursor: "pointer", textTransform: "none" }} onClick={() => onSearch(name)} title={`Load ${name}`}>
                  ★ {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
          Language
          <select className="wg-input" style={{ width: "auto" }} value={language} onChange={(e) => onLanguage(e.target.value)} aria-label="Response language">
            {LANGS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--wg-muted)" }}>
          Profile
          <select className="wg-input" style={{ width: "auto" }} value={persona} onChange={(e) => onPersona(e.target.value)} aria-label="User profile">
            {PERSONAS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="wg-wrap" style={{ paddingBottom: "0.55rem" }}>
        <nav className="wg-scrollrow" role="tablist" aria-label="WeatherGPT sections">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="wg-tab" onClick={() => onTab(id)}>
              {label}
              {id === "alerts" && alertCount > 0 ? ` (${alertCount})` : ""}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
