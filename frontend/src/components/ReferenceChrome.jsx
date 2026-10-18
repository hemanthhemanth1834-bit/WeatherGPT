import React, { useEffect, useState } from "react";
import "./ReferenceChrome.css";
import "./PremiumRefresh.css";
import {
  Activity, Bell, Bot, CloudLightning, CloudRain, CloudSun, Download,
  Globe, Layers, LayoutDashboard, MapPin, Navigation, PhoneCall, Radio,
  Settings, ShieldAlert, Sparkles, Sun, Trees, TrendingUp, Waves,
  ArrowRightLeft, FileText, Car, Sprout, Zap, Type, X, Menu
} from "lucide-react";
import Live3DIcon from "./Live3DIcon";
import { recordEvent } from "../services/privacyAnalytics";

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

// Account controls are removed from the platform navigation.
const GROUPS = [
  ["Core Meteorology", [
    ["home", LayoutDashboard, "Overview"],
    ["dashboard", CloudSun, "Live Weather"],
    ["deep_cast", Sparkles, "AI Weather Deep-Cast"],
    ["life_cast", Activity, "Life Cast"],
    ["compare", ArrowRightLeft, "Station Comparison"],
    ["climate", TrendingUp, "Climate Trends"],
    ["alerts", Radio, "Live News Broadcast"],
    ["chat", Bot, "AI Weather Assistant"],
  ]],
  ["Disaster Early Warning", [
    ["alerts", ShieldAlert, "Severe Alerts"],
    ["severe", ShieldAlert, "Disaster Management"],
    ["risk", Waves, "FloodWatch"],
  ]],
  ["Platform & Trust", [
    ["capabilities", Settings, "Platform Status"],
    ["privacy", ShieldAlert, "Privacy & Data"],
    ["about", FileText, "About WeatherGPT"],
  ]],
  ["Sectoral Intelligence", [
    ["agri", Sprout, "Farm / Crop Advisory"],
    ["roadwatch", Car, "RoadWatch"],
    ["treeguard", Trees, "TreeGuard"],
    ["trip_planner", Navigation, "Trip Planner"],
    ["utilitywatch", Zap, "UtilityWatch"],
    ["solar", Sun, "Solar Energy Potential"],
  ]],
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

export default function ReferenceChrome({ children, tab, onTab, weather, alertCount = 0, language = "en", onLanguageChange, locStatus = "IDLE", online = null, notice = "", onDismissNotice }) {
  const temp = weather?.current_temp ?? null;
  const loadingLoc = locStatus === "DETECTING" || locStatus === "IDLE";
  const condition =
    weather?.condition || (loadingLoc ? "Loading live weather…" : "Weather unavailable");
  const location = weather?.location || LOC_PLACEHOLDER[locStatus] || "Detecting location…";
  const state = weather?.state || "—";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
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
    const handler = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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

  const go = (id) => { setMobileOpen(false); recordEvent("navigation", { target: id }); onTab(id); };
  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } finally { setInstallPrompt(null); }
  };

  return <div className="wg-ref-app">
    <a className="wg-skip-link" href="#main-content">Skip to main content</a>
    <div className="wg-ref-atmosphere" aria-hidden="true"><div className="wg-ref-cloud" /><div className="wg-ref-rain" /><div className="wg-ref-rain wg-ref-rain-2" /></div>

    <header className="wg-ref-header">
      <div className="wg-ref-header-main">
        <button type="button" className="wg-ref-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="wg-ref-brand">
          <div className="wg-ref-brand-icon"><Live3DIcon kind="storm" size="md" label="Live WeatherGPT" /><span /></div>
          <div><div className="wg-ref-brand-name">WeatherGPT <em>PRO AI</em></div><p>AI Meteorology &amp; Disaster Intelligence Platform</p></div>
        </div>

        <button type="button" className="wg-ref-location" onClick={() => go("map")}>
          <Live3DIcon kind="map" size="xs" label="Live location" /><span className="wg-ref-location-text"><b>{location}</b><small>({state})</small></span><em>CHANGE</em>
        </button>

        <div className="wg-ref-header-actions">
          <button className="wg-ref-weather-pill" onClick={cycleTheme} aria-label={`Cycle visual theme (current: ${themeLabel})`} title={`Visual theme: ${themeLabel} — click to cycle`}>
            <span className="wg-ref-mini-weather"><Live3DIcon kind="rain" size="xs" label="Live weather" /></span><span><b>{temp == null ? "—" : `${temp}°C`} <Sparkles size={11} /></b><small>Theme: {themeLabel}</small></span>
          </button>
          <button type="button" aria-label="Open station comparison" title="Open Dual Station Weather Comparison Matrix" onClick={() => go("compare")}><ArrowRightLeft size={16}/></button>
          <button type="button" aria-label="Toggle larger font size" aria-pressed={fontLarge} title={fontLarge ? "Font scale: 112% (on)" : "Font scale: 100% (off)"} onClick={() => setFontLarge((value) => !value)}><Type size={14}/><span>A+</span></button>
          <span className="wg-ref-online" role="status" aria-live="polite" title={online === false ? "Weather engine: last request failed or timed out" : online ? "Weather engine reachable" : "Contacting the weather engine…"}><i className={online === false ? "off" : ""} />{online === null ? "Connecting…" : online ? "Online" : "Offline"}</span>
          <button type="button" className="wg-ref-icon-btn" aria-label={alertCount > 0 ? `Open alerts and early warnings (${alertCount} active)` : "Open alerts and early warnings"} title="Open Smart Weather Alerts & Early Warning Center" onClick={() => go("alerts")}><Bell size={16}/>{alertCount > 0 && <b>{alertCount}</b>}</button>
          <button className="wg-ref-icon-btn" aria-label="Open platform settings and status" title="Open WeatherGPT Platform Settings" onClick={() => go("capabilities")}><Settings size={16}/></button>
          <button type="button" className="wg-ref-install" onClick={installApp} title={installPrompt ? "Install WeatherGPT" : "Install WeatherGPT PWA when supported"}><Download size={14}/>Install App</button>
          <button type="button" className="wg-ref-live"><Live3DIcon kind="live" size="xs" label="Live telemetry"/>LIVE</button>
          <div className="wg-ref-language"><Globe size={15}/><select value={language === "auto" ? "en" : language} onChange={(e) => onLanguageChange?.(e.target.value)}>
            <option value="en">English (EN)</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option><option value="ml">മലയാളം (Malayalam)</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="bn">বাংলা (Bengali)</option><option value="mr">मराठी (Marathi)</option><option value="gu">ગુજરાતી (Gujarati)</option><option value="pa">ਪੰਜਾਬੀ (Punjabi)</option><option value="or">ଓଡ଼ିଆ (Odia)</option>
          </select></div>
        </div>
      </div>
    </header>

    {notice ? <div className="wg-ref-notice" role="status" aria-live="polite">
      <span>{notice}</span>
      <button type="button" aria-label="Dismiss notice" onClick={() => onDismissNotice?.()}><X size={14} /></button>
    </div> : null}

    {mobileOpen && <div className="wg-ref-mobile-overlay" onClick={() => setMobileOpen(false)} />}
    <aside className={`wg-ref-mobile-drawer ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
      <div className="wg-ref-mobile-drawer-head"><b>Navigation Menu</b><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="wg-ref-mobile-drawer-scroll">
        {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id} onTab={go}/>)}</div>)}
      </div>
    </aside>

    <div className="wg-ref-layout">
      <aside className="wg-ref-sidebar">
        <div className="wg-ref-sidebar-scroll">
          {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id || (tab === "home" && id === "home")} onTab={onTab}/>)}</div>)}
        </div>
      </aside>
      <div className="wg-ref-content">{children}</div>
    </div>

    <button type="button" className="wg-ref-theme-float" onClick={cycleTheme} aria-label={`Cycle visual theme (current: ${themeLabel})`} title={`Visual theme: ${themeLabel} — click to cycle`}><span className="wg-ref-pulse" /><Sparkles size={14}/><span>Theme: <b>{themeLabel}{theme === "auto" ? ` (${condition})` : ""}</b></span><span aria-hidden="true">⌃</span></button>

    <nav className="wg-ref-mobile-nav">
      {[["home", Sun, "Home"],["chat", Bot, "AI Chat"],["compare", ArrowRightLeft, "Compare"],["alerts", Bell, "Alerts"],["capabilities", Settings, "Settings"],["capabilities", Layers, "Modules"]].map(([id, Icon, label]) =>
        <button type="button" key={label} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => onTab(id)}><Icon size={16}/><span>{label}</span></button>)}
    </nav>
  </div>;
}