import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import Navbar, { personaForApi } from "./components/Navbar";
import WeatherChat from "./components/WeatherChat";
import { fetchActiveAlerts, fetchCurrentWeather, sendChatQuery } from "./services/api";

/* Secondary views ride in lazy chunks; home + chat entry stays lean. */
const HomePanel = lazy(() => import("./components/HomePanel"));
const WeatherDashboard = lazy(() => import("./components/WeatherDashboard"));
const GISMap = lazy(() => import("./components/GISMap"));
const AgriAdvisor = lazy(() => import("./components/AgriAdvisor"));
const AviationMarine = lazy(() => import("./components/AviationMarine"));
const AlertCenter = lazy(() => import("./components/AlertCenter"));
const SevereWeatherPanel = lazy(() => import("./components/SevereWeatherPanel"));
const CityComparison = lazy(() => import("./components/CityComparison"));
const ClimateAnalytics = lazy(() => import("./components/ClimateAnalytics"));
const RiskPanel = lazy(() => import("./components/RiskPanel"));
const NwpSatellitePanel = lazy(() => import("./components/NwpSatellitePanel"));
const ProvidersPanel = lazy(() => import("./components/ProvidersPanel"));
const SavedPlacesPanel = lazy(() => import("./components/SavedPlacesPanel"));
const AboutDeveloper = lazy(() => import("./components/AboutDeveloper"));

const GROUPS = [
  ["Overview", [["home", "🏠", "Command"], ["chat", "💬", "AI Chat"], ["dashboard", "📊", "Forecast"]]],
  ["Intelligence", [["map", "🗺", "Radar · GIS"], ["severe", "🌀", "Severe"], ["alerts", "🚨", "Alerts"], ["risk", "⚠", "Risk"], ["climate", "🌡", "Climate"], ["compare", "⚖", "Compare"]]],
  ["Sectors", [["agri", "🌾", "Agriculture"], ["aviation_marine", "✈", "Air · Sea"], ["nwp", "🛰", "NWP"], ["satellite", "📡", "Satellite"], ["saved", "★", "Saved"]]],
  ["Project", [["about", "ℹ", "About"]]],
];

const SAVED_KEY = "weathergpt.savedPlaces";

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function OpeningMessage() {
  return {
    id: "welcome",
    sender: "bot",
    text: "Namaste! I am **WeatherGPT** — ask me for live forecasts, rain outlooks, farm advice, flight or marine briefings, and disaster alerts across India, in English or your own language. Try the mic button for voice input.",
    speech_text: "Namaste! Welcome to WeatherGPT. Ask me about weather forecasts or alerts.",
    suggested_actions: [
      { label: "7-day forecast", action: "open_dashboard" },
      { label: "Radar map", action: "open_map" },
      { label: "Active alerts", action: "open_alerts" },
    ],
  };
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [persona, setPersona] = useState("general");
  const [language, setLanguage] = useState("auto");
  const [place, setPlace] = useState("Pune");
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([OpeningMessage()]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(loadSaved);
  const [notice, setNotice] = useState("");
  const [micTick, setMicTick] = useState(0);
  const [drawer, setDrawer] = useState(false);

  const persistSaved = (next) => {
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const remember = useCallback((name) => {
    const clean = (name || "").trim();
    if (!clean) return;
    setSaved((prev) => {
      if (prev.some((p) => p.toLowerCase() === clean.toLowerCase())) return prev;
      const next = [clean, ...prev].slice(0, 8);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const removeSaved = useCallback((name) => {
    setSaved((prev) => {
      const next = prev.filter((p) => p.toLowerCase() !== name.toLowerCase());
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wx, al] = await Promise.all([fetchCurrentWeather("Pune"), fetchActiveAlerts()]);
        if (!cancelled) {
          setWeather(wx);
          setAlerts(al);
        }
      } catch {
        if (!cancelled) setNotice("Starting offline: live data will load when the backend is reachable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ask = useCallback(
    async (text) => {
      const query = (text || "").trim();
      if (!query || busy) return;
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: query }]);
      setBusy(true);
      try {
        const reply = await sendChatQuery(query, personaForApi(persona), language, place);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: reply.markdown_response,
            speech_text: reply.speech_text,
            weather: reply.structured_weather,
            alerts: reply.alerts,
            agri_advisory: reply.agri_advisory,
            aviation_briefing: reply.aviation_briefing,
            marine_advisory: reply.marine_advisory,
            suggested_actions: reply.suggested_actions,
            quick_suggestions: reply.quick_suggestions,
          },
        ]);
        if (reply.structured_weather) {
          setWeather(reply.structured_weather);
          setPlace(reply.structured_weather.location);
          remember(reply.structured_weather.location);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            sender: "bot",
            text: "⚠️ I could not reach the weather engine. Please check the backend is running and try again.",
            speech_text: "Could not reach the weather engine. Please try again.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, persona, language, place, remember]
  );

  const searchPlace = useCallback(
    async (name, lat = null, lon = null) => {
      const target = (name || "").trim();
      if (!target) return;
      setBusy(true);
      try {
        const data = await fetchCurrentWeather(target, lat, lon);
        setWeather(data);
        setPlace(data.location);
        remember(data.location);
      } catch {
        setNotice(`Could not load weather for "${target}". Try again shortly.`);
      } finally {
        setBusy(false);
      }
    },
    [remember]
  );

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => searchPlace("My Location", pos.coords.latitude, pos.coords.longitude),
      () => setNotice("Location permission denied — using saved or searched places instead."),
      { timeout: 8000 }
    );
  }, [searchPlace]);

  const goTab = useCallback((name) => {
    const map = { open_map: "map", open_dashboard: "dashboard", open_agri: "agri", open_alerts: "alerts", open_compare: "compare" };
    setTab(map[name] || name);
    setDrawer(false);
  }, []);

  const voiceToChat = useCallback(() => {
    setTab("chat");
    setMicTick((t) => t + 1);
  }, []);

  const askFromTab = useCallback((q) => {
    setTab("chat");
    ask(q);
  }, [ask]);

  const sideLink = (id, ico, label) => (
    <button key={id} className="wg-sidelink" aria-current={tab === id ? "page" : undefined} onClick={() => goTab(id)}>
      <span className="ico" aria-hidden="true">{ico}</span>
      <span>{label}</span>
      {id === "alerts" && alerts.length > 0 && <span className="wg-badge cnt">{alerts.length}</span>}
    </button>
  );

  return (
    <div className="wg-shell">
      <Navbar
        onHome={() => goTab("home")}
        persona={persona}
        onPersona={setPersona}
        language={language}
        onLanguage={(code) => {
          setLanguage(code);
          setMessages([OpeningMessage()]);
        }}
        place={place}
        onPlace={setPlace}
        onSearch={searchPlace}
        onLocate={locateMe}
        alertCount={alerts.length}
        onAlerts={() => goTab("alerts")}
        saved={saved}
        onRemoveSaved={removeSaved}
        weather={weather}
        onVoice={voiceToChat}
        onMenu={() => setDrawer(true)}
      />

      <div className="wg-body">
        <aside className="wg-side" aria-label="Primary">
          {GROUPS.map(([group, links]) => (
            <React.Fragment key={group}>
              <div className="wg-sidegroup">{group}</div>
              {links.map(([id, ico, label]) => sideLink(id, ico, label))}
            </React.Fragment>
          ))}
        </aside>

        <div className="wg-maincol">
          {notice && (
            <div className="wg-wrap" style={{ marginTop: "0.6rem" }}>
              <div className="wg-alert warn" role="status">
                {notice}{" "}
                <button className="wg-btn-ghost" style={{ marginLeft: "0.5rem" }} onClick={() => setNotice("")}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <main className="wg-wrap" style={{ flex: 1, paddingTop: "0.9rem", paddingBottom: "1.2rem", width: "100%" }}>
            {tab === "chat" && (
              <WeatherChat messages={messages} busy={busy} language={language} persona={persona} onAsk={ask} onTab={goTab} micTick={micTick} />
            )}
            <Suspense
              fallback={
                <div role="status" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                  <div className="wg-spin" aria-label="Loading panel" />
                </div>
              }
            >
              {tab === "home" && (
                <HomePanel weather={weather} busy={busy} alertCount={alerts.length} alerts={alerts} onAsk={askFromTab} onTab={setTab} onRefresh={searchPlace} />
              )}
              {tab === "dashboard" && <WeatherDashboard weather={weather} busy={busy} onAsk={askFromTab} />}
              {tab === "map" && <GISMap weather={weather} onAsk={(loc) => askFromTab(`Weather and hazards for ${loc}`)} />}
              {tab === "agri" && <AgriAdvisor place={place} onAsk={askFromTab} />}
              {tab === "aviation_marine" && <AviationMarine onAsk={askFromTab} />}
              {tab === "alerts" && <AlertCenter onAsk={askFromTab} />}
              {tab === "severe" && <SevereWeatherPanel onAsk={askFromTab} />}
              {tab === "compare" && <CityComparison onAsk={askFromTab} />}
              {tab === "climate" && <ClimateAnalytics onAsk={askFromTab} />}
              {tab === "risk" && <RiskPanel location={place} />}
              {tab === "nwp" && (
            <>
              <NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="nwp" />
              <div style={{ marginTop: "0.8rem" }}>
                <ProvidersPanel />
              </div>
            </>
          )}
              {tab === "satellite" && <NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="satellite" />}
              {tab === "saved" && (
                <SavedPlacesPanel current={place} saved={saved} weather={weather}
                  onSelect={(name) => searchPlace(name)} onAddCurrent={() => remember(place)} onRemove={removeSaved} />
              )}
              {tab === "about" && <AboutDeveloper />}
            </Suspense>
          </main>

          <footer style={{ borderTop: "1px solid var(--wg-line)", background: "rgba(9,14,27,.85)" }}>
            <div className="wg-wrap" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.2rem", justifyContent: "space-between", paddingTop: "0.7rem", paddingBottom: "0.7rem", fontSize: "0.74rem", color: "var(--wg-muted)" }}>
              <span>
                <strong style={{ color: "var(--wg-ink)" }}>WeatherGPT</strong> · AI Weather Intelligence · SIH 2026
                <br />
                Muchakarla Hemanth Kumar · SRK Institute of Technology · B.Tech CSE–AI/ML · 2024–2028
              </span>
              <span style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
                <a href="https://github.com/hemanthhemanth1834-bit" target="_blank" rel="noreferrer">GitHub</a>
                <a href="https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/" target="_blank" rel="noreferrer">LinkedIn</a>
                <a href="https://github.com/hemanthhemanth1834-bit/WeatherGPT#third-party-notices" target="_blank" rel="noreferrer">Attribution</a>
                <a href="https://github.com/hemanthhemanth1834-bit/WeatherGPT/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
              </span>
              <span className="wg-mono">Open-Meteo · LIVE — GFS LIVE · WRF NOT CONFIGURED</span>
            </div>
          </footer>
        </div>
      </div>

      <div className="wg-bottomnav">
        <nav aria-label="Primary mobile">
          {[["home", "🏠", "Home"], ["chat", "💬", "Chat"], ["map", "🗺", "Map"], ["alerts", "🚨", "Alerts"], ["__menu", "☰", "Menu"]].map(([id, ico, label]) => (
            <button key={id} className="wg-bnav" aria-selected={tab === id} onClick={() => (id === "__menu" ? setDrawer(true) : goTab(id))}>
              <span className="ico" aria-hidden="true">{ico}</span>
              <span>{label}{id === "alerts" && alerts.length > 0 ? ` (${alerts.length})` : ""}</span>
            </button>
          ))}
        </nav>
      </div>

      {drawer && (
        <>
          <div className="wg-drawer-veil" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="wg-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <strong>WeatherGPT · SIH 2026</strong>
              <button className="wg-btn-ghost" onClick={() => setDrawer(false)} aria-label="Close menu">✕</button>
            </div>
            {GROUPS.map(([group, links]) => (
              <React.Fragment key={group}>
                <div className="wg-sidegroup">{group}</div>
                {links.map(([id, ico, label]) => sideLink(id, ico, label))}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
