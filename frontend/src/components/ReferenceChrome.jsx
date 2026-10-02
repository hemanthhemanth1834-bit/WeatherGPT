import React, { useEffect, useState } from "react";
import "./ReferenceChrome.css";
import {
  Activity, Bell, Bot, CloudLightning, CloudSun, Database, Download,
  Globe, Layers, LayoutDashboard, MapPin, Navigation, PhoneCall, Radio,
  Settings, ShieldAlert, Sparkles, Sun, Trees, TrendingUp, User, Waves,
  ArrowRightLeft, FileText, Car, Sprout, Zap, Type, X, Menu
} from "lucide-react";

const GROUPS = [
  ["Core Meteorology", [
    ["home", LayoutDashboard, "Overview"],
    ["dashboard", CloudSun, "Live Weather"],
    ["nwp", Sparkles, "AI Weather Deep-Cast"],
    ["chat", Activity, "Life Cast"],
    ["compare", ArrowRightLeft, "Station Comparison"],
    ["climate", TrendingUp, "Climate Trends"],
    ["alerts", Radio, "Live News Broadcast"],
    ["chat", Bot, "AI Weather Assistant"],
    ["dashboard", FileText, "Weather Report"],
  ]],
  ["Disaster Early Warning", [
    ["alerts", ShieldAlert, "Severe Alerts"],
    ["severe", ShieldAlert, "Disaster Management"],
    ["risk", Waves, "FloodWatch"],
  ]],
  ["Sectoral Intelligence", [
    ["agri", Sprout, "Farm / Crop Advisory"],
    ["chat", Car, "RoadWatch"],
    ["climate", Trees, "TreeGuard"],
    ["chat", Navigation, "Trip Planner"],
    ["dashboard", Zap, "UtilityWatch"],
    ["dashboard", Sun, "Solar Energy Potential"],
  ]],
  ["User & Diagnostics", [
    ["saved", User, "User Account"],
    ["capabilities", Database, "System & Admin"],
  ]],
];

function NavButton({ id, Icon, label, active, onTab }) {
  return <button className={`wg-ref-nav-item ${active ? "active" : ""}`} onClick={() => onTab(id)}>
    <span className="wg-ref-nav-icon"><Icon size={16} /></span>
    <span className="wg-ref-nav-label">{label}</span>
  </button>;
}

export default function ReferenceChrome({ children, tab, onTab, weather, alertCount = 0, language = "en", onLanguageChange }) {
  const temp = weather?.current_temp ?? 31;
  const condition = weather?.condition || "Heavy Torrential Rain";
  const location = weather?.location || "New Delhi";
  const state = weather?.state || "Delhi NCR";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const go = (id) => { setMobileOpen(false); onTab(id); };
  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try { await installPrompt.userChoice; } finally { setInstallPrompt(null); }
  };

  return <div className="wg-ref-app">
    <div className="wg-ref-atmosphere" aria-hidden="true"><div className="wg-ref-cloud" /><div className="wg-ref-rain" /><div className="wg-ref-rain wg-ref-rain-2" /></div>

    <header className="wg-ref-header">
      <div className="wg-ref-alertbar">
        <div className="wg-ref-alert-text"><span className="wg-ref-pulse" /><b>IMD / NDMA BULLETIN:</b><span>Live severe-weather status available in Alerts.</span></div>
        <button onClick={() => go("alerts")}><PhoneCall size={14} /> Emergency Contacts</button>
      </div>

      <div className="wg-ref-header-main">
        <button className="wg-ref-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="wg-ref-brand">
          <div className="wg-ref-brand-icon"><CloudLightning size={25} /><span /></div>
          <div><div className="wg-ref-brand-name">WeatherGPT <em>PRO AI</em></div><p>AI Meteorology &amp; Disaster Intelligence Platform</p></div>
        </div>

        <button className="wg-ref-location" onClick={() => go("map")}>
          <MapPin size={16} /><span><b>{location}</b><small>({state})</small></span><em>CHANGE</em>
        </button>

        <div className="wg-ref-header-actions">
          <button className="wg-ref-weather-pill" onClick={() => go("home")} title="Change Weather Animated Theme & Ambience">
            <span className="wg-ref-mini-weather">☁</span><span><b>{temp}°C <Sparkles size={11} /></b><small>Theme: Auto</small></span>
          </button>
          <button title="Open Dual Station Weather Comparison Matrix" onClick={() => go("compare")}><ArrowRightLeft size={16}/></button>
          <button title="Font Scale: 112%" onClick={() => document.documentElement.classList.toggle("wg-font-large")}><Type size={14}/><span>A+</span></button>
          <span className="wg-ref-online"><i />Online</span>
          <button className="wg-ref-icon-btn" title="Open Smart Weather Alerts & Early Warning Center" onClick={() => go("alerts")}><Bell size={16}/>{alertCount > 0 && <b>{alertCount}</b>}</button>
          <button className="wg-ref-icon-btn" title="Open WeatherGPT Platform Settings" onClick={() => go("capabilities")}><Settings size={16}/></button>
          <button className="wg-ref-install" onClick={installApp} title={installPrompt ? "Install WeatherGPT" : "Install WeatherGPT PWA when supported"}><Download size={14}/>Install App</button>
          <button className="wg-ref-live"><Activity size={14}/>LIVE</button>
          <div className="wg-ref-language"><Globe size={15}/><select value={language === "auto" ? "en" : language} onChange={(e) => onLanguageChange?.(e.target.value)}>
            <option value="en">English (EN)</option><option value="hi">हिन्दी (Hindi)</option><option value="ta">தமிழ் (Tamil)</option><option value="te">తెలుగు (Telugu)</option><option value="ml">മലയാളം (Malayalam)</option><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="bn">বাংলা (Bengali)</option><option value="mr">मराठी (Marathi)</option><option value="gu">ગુજરાતી (Gujarati)</option>
          </select></div>
          <button className="wg-ref-user" onClick={() => go("saved")}><span>J</span><b>John</b></button>
        </div>
      </div>
    </header>

    {mobileOpen && <div className="wg-ref-mobile-overlay" onClick={() => setMobileOpen(false)} />}
    <aside className={`wg-ref-mobile-drawer ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
      <div className="wg-ref-mobile-drawer-head"><b>Navigation Menu</b><button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="wg-ref-mobile-drawer-scroll">
        {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id} onTab={go}/>)}</div>)}
        <button className="wg-ref-settings-row" onClick={() => go("capabilities")}><Settings size={16}/>Settings &amp; Preferences</button>
      </div>
    </aside>

    <div className="wg-ref-layout">
      <aside className="wg-ref-sidebar">
        <div className="wg-ref-sidebar-scroll">
          {GROUPS.map(([group, items]) => <div className="wg-ref-nav-group" key={group}><div className="wg-ref-nav-heading">{group}</div>{items.map(([id, Icon, label]) => <NavButton key={label} id={id} Icon={Icon} label={label} active={tab === id || (tab === "home" && id === "home")} onTab={onTab}/>)}</div>)}
          <button className="wg-ref-settings-row" onClick={() => go("capabilities")}><Settings size={16}/>Settings &amp; Preferences</button>
        </div>
        <div className="wg-ref-engine"><div><b>WeatherGPT AI Engine</b><span>v2.5 PRO</span></div><p>Ministry of Earth Sciences &amp; IMD Open Telemetry Standards</p></div>
      </aside>
      <main className="wg-ref-content">{children}</main>
    </div>

    <div className="wg-ref-theme-float" onClick={() => go("home")}><span className="wg-ref-pulse" /><Sparkles size={14}/><span>Theme: <b>Auto ({condition})</b></span><span>⌃</span></div>

    <nav className="wg-ref-mobile-nav">
      {[["home", Sun, "Home"],["chat", Bot, "AI Chat"],["compare", ArrowRightLeft, "Compare"],["alerts", Bell, "Alerts"],["capabilities", Settings, "Settings"],["capabilities", Layers, "Modules"]].map(([id, Icon, label]) =>
        <button key={label} className={tab === id ? "active" : ""} onClick={() => onTab(id)}><Icon size={16}/><span>{label}</span></button>)}
    </nav>
  </div>;
}