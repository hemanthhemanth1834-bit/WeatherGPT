import React, { useState, useEffect, useRef } from "react";
import { 
  CloudSun, ShieldAlert, Sparkles, Navigation, Globe, UserCheck, 
  Search, Radio, Sprout, Plane, Waves, AlertTriangle, TrendingUp, LayoutGrid, Scale,
  MapPin, ChevronRight, Loader2
} from "lucide-react";
import { searchLocations } from "../services/api";

const PERSONAS = [
  { id: "general", label: "Public", icon: "🌐", desc: "Daily Forecasts & Alerts" },
  { id: "farmer", label: "Farmers (Agromet)", icon: "🌾", desc: "Crop Advisories & Pests" },
  { id: "disaster_manager", label: "Disaster Cell", icon: "🚨", desc: "CAP Warnings & Cyclones" },
  { id: "aviation", label: "Aviation", icon: "✈️", desc: "METAR / TAF Reports" },
  { id: "marine", label: "Marine / Port", icon: "⚓", desc: "Ocean State & Waves" },
];

const LANGUAGES = [
  { code: "auto", name: "🌐 Auto Detect (स्वचालित)" },
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "mr", name: "मराठी (Marathi)" },
  { code: "ta", name: "தமிழ் (Tamil)" },
  { code: "te", name: "తెలుగు (Telugu)" },
  { code: "bn", name: "বাংলা (Bengali)" },
  { code: "gu", name: "ગુજરાતી (Gujarati)" },
  { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", name: "മലയാളം (Malayalam)" },
  { code: "or", name: "ଓଡ଼ିଆ (Odia)" }
];

export default function Navbar({
  currentPersona,
  setPersona,
  currentLanguage,
  setLanguage,
  activeAlerts = [],
  activeAlertCount = 0,
  searchLocation,
  setSearchLocation,
  onSearchSubmit,
  onDetectLocation,
  activeTab,
  setActiveTab
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef(null);

  // Debounced search for suggestions as user types
  useEffect(() => {
    if (!searchLocation || searchLocation.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchLocation.trim(), 7);
        setSuggestions(results);
      } catch (e) {
        console.warn("Autocomplete error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchLocation]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocation = (locName) => {
    setSearchLocation(locName);
    setIsOpen(false);
    setSuggestions([]);
    if (onSearchSubmit) {
      // Small timeout to let state update
      setTimeout(() => {
        onSearchSubmit();
      }, 50);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectLocation(suggestions[selectedIndex].name);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel">
      {/* Top Emergency Marquee Ticker */}
      <div className="bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-b border-red-800/40 text-red-200 text-xs py-1 px-4 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-bold uppercase tracking-wider text-[10px] text-red-300 flex items-center gap-1">
            <Radio size={11} className="text-red-400" /> WMO WIS2.0 / IMD CAP Live
          </span>
        </div>
        <div className="overflow-hidden whitespace-nowrap mx-4 flex-1">
          <div className="animate-marquee inline-block font-medium text-[11px] text-red-100">
            {activeAlerts && activeAlerts.length > 0 ? (
              activeAlerts.map((alt, idx) => (
                <span key={alt.id || idx} className="inline-block mr-8">
                  {alt.severity === "Red" ? "🚨" : alt.severity === "Orange" ? "⚠️" : "⚡"}{" "}
                  <span className={`font-bold ${alt.severity === "Red" ? "text-red-300" : alt.severity === "Orange" ? "text-orange-300" : "text-yellow-300"}`}>
                    [{alt.severity.toUpperCase()} ALERT]
                  </span>{" "}
                  {alt.headline}
                </span>
              ))
            ) : (
              <span>
                📡 <span className="font-bold text-emerald-300">[LIVE TELEMETRY]</span> Real-time hazard & 24h convective rain monitoring active across 450+ Indian talukas, districts & metropolises • IMD ensemble operational.
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => setActiveTab("alerts")} 
          className="flex-shrink-0 text-[10px] font-bold bg-red-600/80 hover:bg-red-500 text-white px-2.5 py-0.5 rounded-full transition shadow-sm"
        >
          {activeAlertCount} {activeAlertCount === 1 ? "Warning" : "Warnings"} Active →
        </button>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setActiveTab("chat")}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 shadow-lg shadow-sky-500/25 text-white font-bold group-hover:scale-105 transition-transform duration-300">
            <CloudSun size={22} className="text-white animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-sky-400/20 blur-sm"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white flex items-center font-heading">
                Weather<span className="gradient-text-sky">GPT</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                SIH 2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">WeatherGPT — AI Weather Intelligence · MoES / IMD</p>
          </div>
        </div>

        {/* Global Search Bar with Live Autocomplete */}
        <div ref={searchContainerRef} className="flex-1 max-w-md mx-2 min-w-[260px] relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setIsOpen(false);
              onSearchSubmit(e);
            }} 
            className="w-full"
          >
            <div className="relative flex items-center">
              {isSearching ? (
                <Loader2 size={15} className="absolute left-3 text-sky-400 animate-spin" />
              ) : (
                <Search size={15} className="absolute left-3 text-slate-400" />
              )}
              <input
                type="text"
                value={searchLocation}
                aria-label="Search location"
                onChange={(e) => {
                  setSearchLocation(e.target.value);
                  setIsOpen(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search 450+ Indian talukas, areas (e.g. Wagholi, Hinjawadi)..."
                className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl py-1.5 pl-9 pr-20 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
              <div className="absolute right-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={onDetectLocation}
                  title="Auto-detect GPS Location"
                  aria-label="Auto-detect my GPS location"
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition"
                >
                  <Navigation size={13} />
                </button>
                <button
                  type="submit"
                  aria-label="Search weather for location"
                  className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition shadow-sm"
                >
                  Go
                </button>
              </div>
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-fadeIn">
              <div className="p-1.5 max-h-72 overflow-y-auto no-scrollbar space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800/80">
                  <span>Locations & Talukas ({suggestions.length})</span>
                  <span className="text-sky-400 font-normal">Click or press Enter</span>
                </div>
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectLocation(item.name)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                      selectedIndex === idx
                        ? "bg-sky-600/30 text-white border border-sky-500/40"
                        : "hover:bg-slate-800/60 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                        <MapPin size={12} />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.region && (
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                              {item.region}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{item.state}</div>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              value={currentLanguage}
              aria-label="Select response language"
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium cursor-pointer shadow-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Secondary Persona & Navigation Bar */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          {/* Persona Switcher Pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1 hidden sm:inline">
              Persona:
            </span>
            {PERSONAS.map((p) => {
              const isActive = currentPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  title={p.desc}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="text-[11px]">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Module Tab Switcher */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3 flex-shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "chat"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Sparkles size={13} className={activeTab === "chat" ? "text-sky-400" : "text-slate-400"} />
              <span>AI Chat & Voice</span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>📊</span>
              <span>24h Forecast Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "map"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>🗺️</span>
              <span>GIS Radar Map</span>
            </button>

            <button
              onClick={() => setActiveTab("agri")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "agri"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Sprout size={13} className={activeTab === "agri" ? "text-emerald-400" : "text-slate-400"} />
              <span>Agromet</span>
            </button>

            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <ShieldAlert size={13} className={activeTab === "alerts" ? "text-red-400" : "text-slate-400"} />
              <span>Warnings ({activeAlertCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "compare"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Scale size={13} className={activeTab === "compare" ? "text-indigo-400" : "text-slate-400"} />
              <span>Compare & AQI</span>
            </button>

            <button
              onClick={() => setActiveTab("climate")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "climate"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <TrendingUp size={13} className={activeTab === "climate" ? "text-purple-400" : "text-slate-400"} />
              <span>Climate</span>
            </button>

            <button
              onClick={() => setActiveTab("risk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "risk"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <AlertTriangle size={13} className={activeTab === "risk" ? "text-amber-400" : "text-slate-400"} />
              <span>Risk</span>
            </button>

            <button
              onClick={() => setActiveTab("nwp")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "nwp"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Globe size={13} className={activeTab === "nwp" ? "text-indigo-400" : "text-slate-400"} />
              <span>NWP·Sat</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "about"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <UserCheck size={13} className={activeTab === "about" ? "text-emerald-400" : "text-slate-400"} />
              <span>About·SIH</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
