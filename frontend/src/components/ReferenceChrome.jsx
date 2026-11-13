import React, { useEffect, useRef, useState } from "react";
import "./ReferenceChrome.css";
import "./PremiumRefresh.css";
import {
  Bell, Bot, CloudSun, FileText, Globe, LayoutDashboard, LocateFixed, Map,
  MapPin, Menu, Plane, Satellite, Search, Settings, ShieldAlert, Sparkles,
  Sprout, TrendingUp, Type, Waves, X
} from "lucide-react";
import Live3DIcon from "./Live3DIcon";
import { recordEvent } from "../services/privacyAnalytics";
import { searchLocations } from "../services/api";

const THEME_KEY = "weathergpt.theme";
const FONT_KEY = "weathergpt.fontLarge";
const THEMES = ["auto", "midnight", "high-contrast"];

function readLocalPreference(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

// Primary navigation only exposes features with a verified data path.
// Experimental modules remain implemented and are reachable from Platform
// Status (secondary preview), never from the main sidebar.
const GROUPS = [
  ["Overview", [
    ["home", LayoutDashboard, "Overview"],
  ]],
  ["Weather & Forecasts", [
    ["dashboard", CloudSun, "Live Weather"],
    ["deep_cast", Sparkles, "AI Weather Deep-Cast"],
    ["climate", TrendingUp, "Climate Trends"],
  ]],
  ["Earth & Climate", [
    ["map", Map, "Radar & Map"],
    ["satellite", Satellite, "Satellite"],
    ["earth", Globe, "3D Earth"],
  ]],
  ["Alerts & Safety", [
    ["alerts", ShieldAlert, "Severe Alerts"],
    ["risk", Waves, "FloodWatch"],
    ["severe", ShieldAlert, "Disaster Preparedness"],
  ]],
  ["AI Assistant", [
    ["chat", Bot, "AI Weather Assistant"],
  ]],
  ["Advisories & Planning", [
    ["agri", Sprout, "Farm / Crop Advisory"],
    ["aviation_marine", Plane, "Aviation & Marine"],
  ]],
];

const SECONDARY_LINKS = [
  ["capabilities", Settings, "Platform Status"],
  ["privacy", ShieldAlert, "Privacy & Data"],
  ["about", FileText, "About WeatherGPT"],
];

function NavButton({ id, Icon, label, active, onTab }) {
  return <button type="button" className={`wg-ref-nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => onTab(id)}>
    <span className="wg-ref-nav-icon"><Live3DIcon kind={label.toLowerCase().includes("alert") || label.toLowerCase().includes("disaster") ? "alert" : label.toLowerCase().includes("solar") ? "solar" : label.toLowerCase().includes("farm") ? "farm" : label.toLowerCase().includes("tree") ? "tree" : label.toLowerCase().includes("road") ? "road" : label.toLowerCase().includes("trip") ? "trip" : label.toLowerCase().includes("life") ? "life" : label.toLowerCase().includes("ai") ? "ai" : label.toLowerCase().includes("weather") ? "weather" : "climate"} size="xs" label={label} /></span>
    <span className="wg-ref-nav-label">{label}</span>
  </button>;
}

// Honest placeholders while no city is loaded yet (stage L): the header must
// never claim "Detecting location…" once the lookup has failed.
const LOC_PLACEHOLDER = {
  DETECTING: "Detecting location…",
  ERROR: "Location lookup failed — tap to search",
  DENIED: "Location access denied — tap to search",
  UNAVAILABLE: "Location unavailable — tap to search",
  IDLE: "Choose a location",
};

// Reachability and data availability are different claims. The pill may say
// "Engine up" only when the latest weather payload actually carried data.
const ENGINE_STATUS = {
  checking: {
    pill: "Checking engine…",
    footer: "Checking weather engine",
    footerClass: "checking",
    title: "Contacting the weather engine…",
  },
  down: {
    pill: "Engine down",
    footer: "Weather engine unreachable",
    footerClass: "off",
    title: "Weather engine: last request failed or timed out. Provider-level health is on Platform Status.",
  },
  live: {
    pill: "Engine up",
    footer: "Weather engine reachable · live data loaded",
    footerClass: "on",
    title: "Weather engine reachable and live weather data loaded. Provider-level health is on Platform Status.",
  },
  degraded: {
    pill: "Engine up · data unavailable",
    footer: "Weather engine reachable · data unavailable",
    footerClass: "warn",
    title: "Weather engine is reachable, but the weather provider returned no data. Provider-level health is on Platform Status.",
  },
  waiting: {
    pill: "Engine up · waiting for data",
    footer: "Weather engine reachable · waiting for data",
    footerClass: "warn",
    title: "Weather engine reachable. Waiting for the first live weather payload.",
  },
};

export default function ReferenceChrome({ children, tab, onTab, weather, selectedPlace = "", alertCount = 0, language = "en", onLanguageChange, onLocationSelect, onUseLiveLocation, locStatus = "IDLE", online = null, dataState = "unknown", notice = "", onDismissNotice }) {
  const temp = weather?.current_temp ?? null;
  const loadingLoc = locStatus === "DETECTING" || locStatus === "IDLE";
  const condition =
    weather?.condition || (loadingLoc ? "Loading live weather…" : "Weather unavailable");
  const location = weather?.location || selectedPlace || LOC_PLACEHOLDER[locStatus] || "Detecting location…";
  const state = weather?.state || "—";
  const engineStatus =
    online === false
      ? "down"
      : online === null
        ? "checking"
        : dataState === "live"
          ? "live"
          : dataState === "unavailable"
            ? "degraded"
            : "waiting";
  const engine = ENGINE_STATUS[engineStatus];
  const [navOpen, setNavOpen] = useState(false);
  const navToggleRef = useRef(null);
  const mobileCloseRef = useRef(null);
  const desktopCloseRef = useRef(null);
  const navWasOpen = useRef(false);
  const locationAbortRef = useRef(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchMessage, setLocationSearchMessage] = useState("Search for a city, town, district, or postcode.");

  const [theme, setTheme] = useState(() => readLocalPreference(THEME_KEY, THEMES, "auto"));
  const [fontLarge, setFontLarge] = useState(() => {
    try {
      return localStorage.getItem(FONT_KEY) === "true";
    } catch {
      return false;
    }
  });
  const themeLabel = { auto: "Auto", midnight: "Midnight", "high-contrast": "High Contrast" }[theme] || "Auto";
  const cycleTheme = () => setTheme((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]);

  useEffect(() => {
    if (!locationPickerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLocationPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locationPickerOpen]);

  useEffect(() => {
    if (!locationPickerOpen) return undefined;
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationResults([]);
      setLocationSearching(false);
      setLocationSearchMessage("Enter at least 2 characters to search.");
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLocationSearching(true);
      setLocationSearchMessage("Searching available locations…");
      try {
        const results = await searchLocations(query, 8, controller.signal);
        if (cancelled) return;
        setLocationResults(Array.isArray(results) ? results : []);
        setLocationSearchMessage(results?.length ? "Choose a result to load its weather." : "No matching locations found. Try a nearby city or district.");
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setLocationResults([]);
        setLocationSearchMessage("Location search is temporarily unavailable. Please try again.");
      } finally {
        if (!cancelled) setLocationSearching(false);
      }
    }, 250);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [locationPickerOpen, locationQuery]);



  useEffect(() => {
    document.documentElement.dataset.wgTheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* Theme remains active for this session when storage is unavailable. */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("wg-font-large", fontLarge);
    try {
      localStorage.setItem(FONT_KEY, String(fontLarge));
    } catch {
      /* Font scale remains active for this session when storage is unavailable. */
    }
    }, [fontLarge]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const target = window.matchMedia("(max-width: 820px)").matches
        ? mobileCloseRef.current
        : desktopCloseRef.current;
      target?.focus();
    }, 40);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  useEffect(() => {
    if (navOpen) {
      navWasOpen.current = true;
    } else if (navWasOpen.current) {
      navWasOpen.current = false;
      navToggleRef.current?.focus();
    }
  }, [navOpen]);

  /* The homepage hero exposes a real search control; it opens the same
     accessible location dialog used by the header, without duplicating state. */
  useEffect(() => {
    const openLocation = () => {
      setNavOpen(false);
      setLocationPickerOpen(true);
      setLocationQuery("");
      setLocationResults([]);
      setLocationSearchMessage("Search for a city, town, district, or postcode.");
    };
    window.addEventListener("weathergpt:open-location", openLocation);
    return () => window.removeEventListener("weathergpt:open-location", openLocation);
  }, []);

  const go = (id) => { setNavOpen(false); recordEvent("navigation", { target: id }); onTab(id); };


  return <div className="wg-ref-app">
    <a className="wg-skip-link" href="#main-content">Skip to main content</a>
    <div className="wg-ref-atmosphere" aria-hidden="true"><div className="wg-ref-cloud" /><div className="wg-ref-rain" /><div className="wg-ref-rain wg-ref-rain-2" /></div>

    <header className="wg-ref-header">
      <div className="wg-ref-header-main">
        <button ref={navToggleRef} type="button" className="wg-ref-menu-btn" onClick={() => setNavOpen((open) => !open)} aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-controls="wg-primary-navigation wg-mobile-navigation" aria-expanded={navOpen}>{navOpen ? <X size={20}/> : <Menu size={20}/>}</button>
                <a
          className="wg-ref-brand"
          href="#/"
          aria-label="WeatherGPT — Go to Overview"
          title="Go to Overview"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            go("home");
          }}
        >
          <div className="wg-ref-brand-icon"><Live3DIcon kind="storm" size="md" label="Live WeatherGPT" /><span /></div>
          <div><div className="wg-ref-brand-name">WeatherGPT <em>WEATHER AI</em></div><p>AI Meteorology &amp; Disaster Intelligence Platform</p></div>
        </a>


        <button type="button" className="wg-ref-location" onClick={() => { setLocationPickerOpen(true); setLocationQuery(""); setLocationResults([]); setLocationSearchMessage("Search for a city, town, district, or postcode."); }} aria-haspopup="dialog" aria-label={"Change location. Current location: " + (weather?.location || selectedPlace || "not selected")}>
          <Live3DIcon kind="map" size="xs" label="Live location" /><span className="wg-ref-location-text"><b>{location}</b><small>({state})</small></span><em>CHANGE</em>
        </button>

        <div className="wg-ref-header-actions">
          <button className="wg-ref-weather-pill" onClick={cycleTheme} aria-label={`Cycle visual theme (current: ${themeLabel})`} title={`Visual theme: ${themeLabel} — click to cycle`}>
            <span className="wg-ref-mini-weather"><Live3DIcon kind="rain" size="xs" label="Live weather" /></span><span><b>{temp == null ? "—" : `${temp}°C`} <Sparkles size={11} /></b><small>Theme: {themeLabel}</small></span>
          </button>
                    <button type="button" aria-label="Toggle larger font size" aria-pressed={fontLarge} title={fontLarge ? "Font scale: 112% (on)" : "Font scale: 100% (off)"} onClick={() => setFontLarge((value) => !value)}><Type size={14}/><span>A+</span></button>
          <span className={`wg-ref-online ${engineStatus}`} role="status" aria-live="polite" title={engine.title}><i className={engineStatus} />{engine.pill}</span>
          <button type="button" className="wg-ref-icon-btn" aria-label={alertCount > 0 ? `Open alerts and early warnings (${alertCount} active)` : "Open alerts and early warnings"} title="Open Smart Weather Alerts & Early Warning Center" onClick={() => go("alerts")}><Bell size={16}/>{alertCount > 0 && <b>{alertCount}</b>}</button>
          <button className="wg-ref-icon-btn" aria-label="Open platform settings and provider status" title="Open Platform Status, provider health and settings" onClick={() => go("capabilities")}><Settings size={16}/></button>

          <button type="button" className="wg-ref-live"><Live3DIcon kind="live" size="xs" label="Live telemetry"/>LIVE</button>
          <div className="wg-ref-language"><Globe size={15}/><select value={language === "auto" ? "en" : language} onChange={(e) => onLanguageChange?.(e.target.value)}>
            <option value="en">English (EN)</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option><option value="ml">മലയാളം (Malayalam)</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="bn">বাংলা (Bengali)</option><option value="mr">मराठी (Marathi)</option><option value="gu">ગુજરાતી (Gujarati)</option><option value="pa">ਪੰਜਾਬੀ (Punjabi)</option><option value="or">ଓଡ଼ିଆ (Odia)</option>
          </select></div>
        </div>
      </div>
    </header>

    {locationPickerOpen && <div className="wg-location-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationPickerOpen(false); }}>
      <section className="wg-location-picker" role="dialog" aria-modal="true" aria-labelledby="wg-location-picker-title" aria-describedby="wg-location-picker-help">
        <div className="wg-location-picker-head">
          <div><p>WEATHERGPT LOCATION</p><h2 id="wg-location-picker-title">Choose your location</h2></div>
          <button type="button" className="wg-location-picker-close" aria-label="Close location search" onClick={() => setLocationPickerOpen(false)}><X size={18} /></button>
        </div>
                <p className="wg-location-picker-help" id="wg-location-picker-help">Use your live location or search manually. GPS is optional and only requested when you choose it.</p>
        <div className="wg-location-selected">
          <div>
            <span className="wg-location-selected-kicker">SELECTED LOCATION</span>
            <b>{weather?.location || selectedPlace || "No location selected yet"}</b>
            <small>
              {weather?.lat != null && weather?.lon != null
                ? `${Number(weather.lat).toFixed(2)}, ${Number(weather.lon).toFixed(2)} · ${weather.state || "Live weather loaded"}`
                : selectedPlace
                  ? "Selected · waiting for live weather"
                  : "Choose a city below or use your device location"}
            </small>
          </div>
          {onUseLiveLocation ? (
            <button
              type="button"
              className="wg-location-live-btn"
              onClick={() => {
                setLocationPickerOpen(false);
                onUseLiveLocation();
              }}
            >
              <LocateFixed size={17} aria-hidden="true" /> Use live location
            </button>
          ) : null}
        </div>
        <form className="wg-location-search-form" onSubmit={async (event) => {
          event.preventDefault();
          const query = locationQuery.trim();
          if (query.length < 2) { setLocationSearchMessage("Enter at least 2 characters to search."); return; }
          locationAbortRef.current?.abort();
          const controller = new AbortController();
          locationAbortRef.current = controller;
          setLocationSearching(true);
          try {
            const results = await searchLocations(query, 8, controller.signal);
            if (controller.signal.aborted) return;
            setLocationResults(Array.isArray(results) ? results : []);
            setLocationSearchMessage(results?.length ? "Choose a result to load its weather." : "No matching locations found. Try a nearby city or district.");
          } catch {
            if (controller.signal.aborted) return;
            setLocationSearchMessage("Location search is temporarily unavailable. Please try again.");
          } finally {
            if (locationAbortRef.current === controller) {
              locationAbortRef.current = null;
              setLocationSearching(false);
            }
          }
        }}>
          <label htmlFor="wg-location-search-input">City or area</label>
          <div className="wg-location-search-row"><Search size={18} aria-hidden="true" /><input id="wg-location-search-input" type="search" autoFocus value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="e.g. Rajahmundry, Hyderabad" autoComplete="off" /><button type="submit" disabled={locationSearching || locationQuery.trim().length < 2}>{locationSearching ? "Searching…" : "Search"}</button></div>
        </form>
        <p className="wg-location-picker-status" role="status" aria-live="polite">{locationSearchMessage}</p>
        {locationResults.length > 0 && <ul className="wg-location-results" aria-label="Location search results">{locationResults.map((item, index) => {
          const name = item.name || item.city || item.display_name || item.location;
          const description = item.display_name || [item.region, item.state, item.country].filter(Boolean).join(", ");
          return <li key={String(name) + "-" + String(item.lat ?? "") + "-" + String(item.lon ?? item.lng ?? "") + "-" + index}><button type="button" onClick={() => {
            if (typeof onLocationSelect === "function") onLocationSelect({ ...item, name });
            else onTab("map");
            setLocationPickerOpen(false);
          }}><MapPin size={17} aria-hidden="true" /><span><b>{name}</b><small>{description && description !== name ? description : "Load live weather for this location"}</small></span><span aria-hidden="true">→</span></button></li>;
        })}</ul>}
        <p className="wg-location-picker-foot">Weather data comes from available providers; unavailable data is never filled with invented values.</p>
      </section>
    </div>}

    {notice ? <div className="wg-ref-notice" role="status" aria-live="polite">
      <span>{notice}</span>
      <button type="button" aria-label="Dismiss notice" onClick={() => onDismissNotice?.()}><X size={14} /></button>
    </div> : null}

        {navOpen && <div className="wg-ref-nav-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setNavOpen(false); }} />}
    <aside id="wg-mobile-navigation" className={`wg-ref-mobile-drawer ${navOpen ? "open" : ""}`} aria-hidden={!navOpen} inert={!navOpen} aria-label="Navigation menu">
      <div className="wg-ref-mobile-drawer-head"><b>Navigation Menu</b><button ref={mobileCloseRef} type="button" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <button type="button" className="wg-ref-mobile-location" onClick={() => { setNavOpen(false); setLocationPickerOpen(true); setLocationQuery(""); setLocationResults([]); setLocationSearchMessage("Search for a city, town, district, or postcode."); }}><MapPin size={17} /> Change location <span>{weather?.location || selectedPlace || "Choose a city"}</span></button>
      <div className="wg-ref-mobile-drawer-scroll">
        {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id} onTab={go}/>)}</div>)}
        <nav className="wg-ref-mobile-drawer-secondary" aria-label="Secondary navigation">
          <div className="wg-ref-nav-heading">Platform &amp; Trust</div>
          {SECONDARY_LINKS.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id} onTab={go}/>)}
        </nav>
      </div>
    </aside>

    <div className="wg-ref-layout">
            <aside id="wg-primary-navigation" className={`wg-ref-sidebar ${navOpen ? "open" : ""}`} aria-hidden={!navOpen} inert={!navOpen} aria-label="Primary navigation">
        <div className="wg-ref-sidebar-head"><b>Navigation</b><button ref={desktopCloseRef} type="button" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
        <div className="wg-ref-sidebar-scroll">
          {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id || (tab === "home" && id === "home")} onTab={go}/>)}</div>)}
        </div>
      </aside>
            <div className="wg-ref-content">
        {children}
        <footer className="wg-ref-site-footer" aria-label="WeatherGPT site information">
          <div className="wg-ref-site-footer-main">
            <div className="wg-ref-site-footer-brand">
              <b>WeatherGPT</b>
              <span>AI meteorology and disaster intelligence built on free, attributable data sources.</span>
            </div>
            <nav className="wg-ref-site-footer-links" aria-label="Secondary navigation">
              {SECONDARY_LINKS.map(([id, Icon, label]) => (
                <button type="button" key={label} onClick={() => go(id)}>
                  <Icon size={14} aria-hidden="true" />{label}
                </button>
              ))}
            </nav>
          </div>
          <div className="wg-ref-site-footer-meta">
            <span className={`wg-ref-site-footer-status ${engine.footerClass}`} role="status" aria-live="polite">
              <i aria-hidden="true" />{engine.footer}
            </span>
            <span>Data: Open-Meteo · RainViewer · NASA GIBS · OpenStreetMap</span>
            <span>Forecasts and computed risk are estimates. Follow official warnings and emergency instructions.</span>
          </div>
        </footer>
      </div>
    </div>

    <button type="button" className="wg-ref-theme-float" onClick={cycleTheme} aria-label={`Cycle visual theme (current: ${themeLabel})`} title={`Visual theme: ${themeLabel} — click to cycle`}><span className="wg-ref-pulse" /><Sparkles size={14}/><span>Theme: <b>{themeLabel}{theme === "auto" ? ` (${condition})` : ""}</b></span><span aria-hidden="true">⌃</span></button>

    <nav className="wg-ref-mobile-nav" aria-label="Primary mobile navigation">
      {[["home", LayoutDashboard, "Home"],["dashboard", CloudSun, "Weather"],["chat", Bot, "AI Chat"],["alerts", Bell, "Alerts"]].map(([id, Icon, label]) =>
        <button type="button" key={label} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => onTab(id)}><Icon size={16}/><span>{label}</span></button>)}
      <button type="button" onClick={() => setNavOpen((open) => !open)} aria-label={navOpen ? "Close menu" : "Open menu"} aria-controls="wg-primary-navigation wg-mobile-navigation" aria-expanded={navOpen}><Menu size={16}/><span>Menu</span></button>
    </nav>
  </div>;
}
