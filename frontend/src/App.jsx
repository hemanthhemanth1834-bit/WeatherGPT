import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import WeatherChat from "./components/WeatherChat";
import { fetchActiveAlerts, fetchCurrentWeather, sendChatQuery } from "./services/api";

/* Secondary views are split into lazy chunks so the first load stays small.
   The chat view (default) ships with the entry bundle. */
const WeatherDashboard = lazy(() => import("./components/WeatherDashboard"));
const GISMap = lazy(() => import("./components/GISMap"));
const AgriAdvisor = lazy(() => import("./components/AgriAdvisor"));
const AviationMarine = lazy(() => import("./components/AviationMarine"));
const AlertCenter = lazy(() => import("./components/AlertCenter"));
const CityComparison = lazy(() => import("./components/CityComparison"));
const ClimateAnalytics = lazy(() => import("./components/ClimateAnalytics"));
const RiskPanel = lazy(() => import("./components/RiskPanel"));
const NwpSatellitePanel = lazy(() => import("./components/NwpSatellitePanel"));
const AboutDeveloper = lazy(() => import("./components/AboutDeveloper"));

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
  const [tab, setTab] = useState("chat");
  const [persona, setPersona] = useState("general");
  const [language, setLanguage] = useState("auto");
  const [place, setPlace] = useState("Pune");
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([OpeningMessage()]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(loadSaved);
  const [notice, setNotice] = useState("");

  const remember = useCallback((name) => {
    const clean = (name || "").trim();
    if (!clean) return;
    setSaved((prev) => {
      if (prev.some((p) => p.toLowerCase() === clean.toLowerCase())) return prev;
      const next = [clean, ...prev].slice(0, 8);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
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
        const reply = await sendChatQuery(query, persona, language, place);
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
  }, []);

  return (
    <div className="wg-shell">
      <Navbar
        tab={tab}
        onTab={setTab}
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
        saved={saved}
      />

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

      <main className="wg-wrap" style={{ flex: 1, paddingTop: "0.9rem", paddingBottom: "1.2rem" }}>
        {tab === "chat" && (
          <WeatherChat messages={messages} busy={busy} language={language} onAsk={ask} onTab={goTab} />
        )}
        <Suspense
          fallback={
            <div role="status" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
              <div className="wg-spin" aria-label="Loading panel" />
            </div>
          }
        >
          {tab === "dashboard" && <WeatherDashboard weather={weather} busy={busy} onAsk={ask} />}
          {tab === "map" && <GISMap onAsk={(loc) => { goTab("chat"); ask(`Weather and hazards for ${loc}`); }} />}
          {tab === "agri" && <AgriAdvisor place={place} onAsk={(q) => { goTab("chat"); ask(q); }} />}
          {tab === "aviation_marine" && <AviationMarine onAsk={(q) => { goTab("chat"); ask(q); }} />}
          {tab === "alerts" && <AlertCenter onAsk={(q) => { goTab("chat"); ask(q); }} />}
          {tab === "compare" && <CityComparison onAsk={(q) => { goTab("chat"); ask(q); }} />}
          {tab === "climate" && <ClimateAnalytics onAsk={(q) => { goTab("chat"); ask(q); }} />}
          {tab === "risk" && <RiskPanel location={place} />}
          {tab === "nwp" && <NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} />}
          {tab === "about" && <AboutDeveloper />}
        </Suspense>
      </main>

      <footer className="wg-topbar" style={{ top: "auto", borderTop: "1px solid var(--wg-line)", borderBottom: "none" }}>
        <div className="wg-wrap" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "space-between", paddingTop: "0.55rem", paddingBottom: "0.55rem", fontSize: "0.72rem", color: "var(--wg-muted)" }}>
          <span>
            <strong style={{ color: "var(--wg-ink)" }}>WeatherGPT — AI Weather Intelligence</strong>
            {" · "}SIH 2026 · Muchakarla Hemanth Kumar · SRKIT CSE–AI/ML
          </span>
          <span className="wg-mono">GFS LIVE · WRF NOT CONFIGURED · ITU CAP v1.2</span>
        </div>
      </footer>
    </div>
  );
}
