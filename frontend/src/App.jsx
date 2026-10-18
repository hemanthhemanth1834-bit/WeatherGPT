import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { personaForApi } from "./services/persona";
import WeatherChat from "./components/WeatherChat";
import ReferenceChrome from "./components/ReferenceChrome";
import { fetchActiveAlerts, fetchCurrentWeather, fetchReverseGeocode, sendChatQuery } from "./services/api";

/* Secondary views ride in lazy chunks; home + chat entry stays lean. */
/* Navigation cleanup: account/settings controls are intentionally not exposed. */
const HomePanel = lazy(() => import("./components/HomePanel"));
const WeatherDashboard = lazy(() => import("./components/WeatherDashboard"));
const GISMap = lazy(() => import("./components/GISMap"));
const Earth3D = lazy(() => import("./components/Earth3D"));
const AgriAdvisor = lazy(() => import("./components/AgriAdvisor"));
const AviationMarine = lazy(() => import("./components/AviationMarine"));
const AlertCenter = lazy(() => import("./components/AlertCenter"));
const SevereWeatherPanel = lazy(() => import("./components/SevereWeatherPanel"));
const CityComparison = lazy(() => import("./components/CityComparison"));
const ClimateAnalytics = lazy(() => import("./components/ClimateAnalytics"));
const RiskPanel = lazy(() => import("./components/RiskPanel"));
const NwpSatellitePanel = lazy(() => import("./components/NwpSatellitePanel"));
const ProvidersPanel = lazy(() => import("./components/ProvidersPanel"));
const AboutDeveloper = lazy(() => import("./components/AboutDeveloper"));
const CapabilitiesHub = lazy(() => import("./components/CapabilitiesHub"));
const PrivacyPage = lazy(() => import("./components/PrivacyPage"));
const ReferenceModulePanel = lazy(() => import("./components/ReferenceModulePanel"));


const SAVED_KEY = "weathergpt.savedPlaces";
const LANGUAGE_KEY = "weathergpt.language";
const SUPPORTED_LANGUAGES = new Set(["auto", "en", "hi", "ta", "te", "ml", "kn", "bn", "mr", "gu", "pa", "or"]);

function loadLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return SUPPORTED_LANGUAGES.has(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

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

// Dedicated reference intelligence routes
export default function App() {
  const [tab, setTab] = useState("home");
  const [persona, setPersona] = useState("general");
  const [language, setLanguage] = useState(loadLanguage);
  const [place, setPlace] = useState("");
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([OpeningMessage()]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(loadSaved);
  const [notice, setNotice] = useState("");
  const [micTick, setMicTick] = useState(0);
  const [locating, setLocating] = useState(false);
  // Weather-engine reachability for the header pill: null = unknown yet,
  // true = last request got an HTTP answer, false = network failure/abort.
  const [online, setOnline] = useState(null);
  // LocationState: { source: GPS|MANUAL|SAVED|UNKNOWN, status: DETECTING|LIVE|MANUAL|LAST_KNOWN|DENIED|UNAVAILABLE|ERROR|IDLE }
  const [locState, setLocState] = useState({ source: "UNKNOWN", status: "IDLE" });
  const locRequestId = React.useRef(0);
  const initDone = React.useRef(false);
  const searchSeq = React.useRef(0);
  const retryTimer = React.useRef(null);
  const hasWeatherRef = React.useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* Storage may be disabled; language selection still works for this session. */
    }
  }, [language]);

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
    if (initDone.current) return;
    initDone.current = true;
    let cancelled = false;
    (async () => {
      try {
        const al = await fetchActiveAlerts();
        if (!cancelled) {
          setAlerts(al);
          setOnline(true);
        }
      } catch {
        if (!cancelled) setNotice("Starting offline: live data will load when the backend is reachable.");
      }
    })();
    attemptGps(false, saved);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = useCallback(
    async (text) => {
      const query = (text || "").trim();
      if (!query || busy) return;
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: query }]);
      setBusy(true);
      try {
        const reply = await sendChatQuery(query, personaForApi(persona), language, place);
        // Normalize supported shapes: only render non-empty text, otherwise
        // show an explicit error instead of an empty bubble.
        const replyText =
          typeof reply?.markdown_response === "string" && reply.markdown_response.trim()
            ? reply.markdown_response
            : "⚠️ The weather engine returned no readable reply. Please try again — no values are shown rather than guessed.";
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: replyText,
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
          const sw = reply.structured_weather;
          // Only sync the app location when the place was explicit in the
          // question (or matches the current one); never let a fallback
          // guess silently move the active location. An explicit place we
          // could not resolve (location_resolved === false) must not move
          // the app either — the reply names the city it actually describes.
          const explicit = reply.explicit_location !== false;
          const resolved = reply.location_resolved !== false;
          if (resolved && (explicit || (sw.location || "").toLowerCase() === (place || "").toLowerCase())) {
            setWeather(sw);
            setPlace(sw.location);
            remember(sw.location);
          }
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
    async (name, lat = null, lon = null, state = null, source = "MANUAL", opts = {}) => {
      const target = (name || "").trim();
      if (!target) return;
      const requestId = locRequestId.current;
      const seq = ++searchSeq.current;
      const isCurrent = () => searchSeq.current === seq && locRequestId.current === requestId;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      setBusy(true);
      try {
        const data = await fetchCurrentWeather(target, lat, lon, "auto", state);
        if (!isCurrent()) return;
        hasWeatherRef.current = true;
        setOnline(true);
        setNotice("");
        setWeather(data);
        setPlace(data.location);
        setLocState({ source, status: source === "GPS" ? "LIVE" : source === "SAVED" ? "LAST_KNOWN" : "MANUAL" });
        remember(data.location);
      } catch (err) {
        if (!isCurrent()) return;
        // Backend answered with an HTTP error => reachable; network failure
        // or the client's intended 20 s abort => not reachable.
        setOnline(err?.status != null);
        setNotice(`Could not load weather for "${target}". Try again shortly.`);
        // Honest header state: never keep claiming "Detecting location…"
        // once nothing is loaded. An older loaded city keeps its own label.
        if (!hasWeatherRef.current) setLocState({ source, status: "ERROR" });
        // One bounded silent retry so a transient cold-start failure (the
        // client aborts at 20 s by design, api.js) recovers on its own.
        if (opts.autoRetry !== false) {
          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            if (!isCurrent()) return;
            searchPlace(target, lat, lon, state, source, { autoRetry: false });
          }, 5000);
        }
      } finally {
        if (isCurrent()) setBusy(false);
      }
    },
    [remember]
  );

  const attemptGps = useCallback(
    (manual, savedFallback) => {
      if (!navigator.geolocation) {
        setLocState({ source: "UNKNOWN", status: "UNAVAILABLE" });
        if (manual) {
          setNotice("Geolocation is not available in this browser. Search for a location manually.");
        } else if (savedFallback && savedFallback.length > 0) {
          searchPlace(savedFallback[0], null, null, null, "SAVED");
        } else {
          setNotice("Location unavailable. Search for a location manually.");
        }
        return;
      }
      const requestId = ++locRequestId.current;
      setLocating(true);
      setLocState({ source: "UNKNOWN", status: "DETECTING" });
      if (manual) setNotice("Detecting location…");
      // Watchdog for browsers that leave getCurrentPosition pending without
      // ever invoking either callback (e.g. an undecided permission prompt):
      // the spec's 10 s timeout is not honoured by every engine. After 12 s
      // fall back exactly like the TIMEOUT error branch so the app can never
      // sit on "Detecting location…" indefinitely. A late callback still wins
      // because the requestId guard passes only for the current request.
      const gpsWatchdog = setTimeout(() => {
        if (locRequestId.current !== requestId) return;
        setLocating(false);
        setLocState({ source: "UNKNOWN", status: "ERROR" });
        if (!manual && savedFallback && savedFallback.length > 0) {
          searchPlace(savedFallback[0], null, null, null, "SAVED");
        } else {
          setNotice("Location request timed out. Search for a location manually.");
        }
      }, 12000);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (locRequestId.current !== requestId) return;
          clearTimeout(gpsWatchdog);
          const { latitude, longitude, accuracy } = pos.coords;
          try {
            const rev = await fetchReverseGeocode(latitude, longitude);
            if (locRequestId.current !== requestId) return;
            const name = rev.city || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            await searchPlace(name, latitude, longitude, rev.state || null, "GPS");
            if (locRequestId.current !== requestId) return;

          } catch {
            if (locRequestId.current !== requestId) return;
            setLocState({ source: "UNKNOWN", status: "ERROR" });
            if (!manual && savedFallback && savedFallback.length > 0) {
              await searchPlace(savedFallback[0], null, null, null, "SAVED");
            } else {
              setNotice("GPS detected, but city lookup failed. Search for a location manually.");
            }
          } finally {
            if (locRequestId.current === requestId) setLocating(false);
          }
        },
        (err) => {
          if (locRequestId.current !== requestId) return;
          clearTimeout(gpsWatchdog);
          setLocating(false);
          if (err && err.code === err.TIMEOUT) {
            setLocState({ source: "UNKNOWN", status: "ERROR" });
            setNotice("Location request timed out. Search for a location manually.");
          } else if (err && err.code === err.POSITION_UNAVAILABLE) {
            setLocState({ source: "UNKNOWN", status: "UNAVAILABLE" });
            setNotice("Location unavailable. Search for a location manually.");
          } else {
            setLocState({ source: "UNKNOWN", status: "DENIED" });
            setNotice("Location access was denied. Search for a location manually.");
          }
          if (!manual && savedFallback && savedFallback.length > 0) {
            searchPlace(savedFallback[0], null, null, null, "SAVED");
          } else if (!manual && err && err.code !== err.TIMEOUT && err.code !== err.POSITION_UNAVAILABLE) {
            setNotice("Location access was denied. Search for a location manually.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    [searchPlace]
  );



  const goTab = useCallback((name) => {
    const map = { open_map: "map", open_dashboard: "dashboard", open_agri: "agri", open_alerts: "alerts", open_compare: "compare", live_news: "alerts" };
    setTab(map[name] || name);
  }, []);

  const voiceToChat = useCallback(() => {
    setTab("chat");
    setMicTick((t) => t + 1);
  }, []);

  const askFromTab = useCallback((q) => {
    setTab("chat");
    ask(q);
  }, [ask]);


  return (
    <ReferenceChrome tab={tab} onTab={goTab} weather={weather} alertCount={alerts.length} language={language === "auto" ? "en" : language} onLanguageChange={setLanguage} onLocationSelect={searchPlace} locStatus={locState.status} online={online} notice={notice} onDismissNotice={() => setNotice("")}>
      <main id="main-content" className="wg-wrap wg-reference-main">
        {tab === "chat" && <WeatherChat messages={messages} busy={busy} language={language} persona={persona} onAsk={ask} onTab={goTab} micTick={micTick} />}
        <Suspense fallback={<div role="status" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}><div className="wg-spin" aria-label="Loading panel" /></div>}>
          {tab === "home" && <HomePanel weather={weather} busy={busy} detecting={locating} locStatus={locState.status} alertCount={alerts.length} alerts={alerts} onAsk={askFromTab} onTab={setTab} onRefresh={searchPlace} />}
          {tab === "dashboard" && <WeatherDashboard weather={weather} busy={busy} onAsk={askFromTab} />}
          {tab === "map" && <GISMap weather={weather} onAsk={(loc) => askFromTab(`Weather and hazards for ${loc}`)} />}
          {tab === "earth" && <Earth3D weather={weather} />}
          {tab === "agri" && <AgriAdvisor place={place} onAsk={askFromTab} />}
          {tab === "aviation_marine" && <AviationMarine onAsk={askFromTab} />}
          {tab === "alerts" && <AlertCenter onAsk={askFromTab} />}
          {tab === "severe" && <SevereWeatherPanel weather={weather} onAsk={askFromTab} />}
          {tab === "compare" && <CityComparison onAsk={askFromTab} />}
          {tab === "climate" && <ClimateAnalytics onAsk={askFromTab} />}
          {tab === "risk" && <RiskPanel location={place} />}
          {tab === "nwp" && <><NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="nwp" /><div style={{ marginTop: "0.8rem" }}><ProvidersPanel /></div></>}
          {tab === "satellite" && <NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="satellite" />}
          {tab === "about" && <AboutDeveloper />}
          {tab === "capabilities" && <CapabilitiesHub onOpen={(t) => setTab(t)} />}
          {tab === "privacy" && <PrivacyPage />}
          {["life_cast","roadwatch","treeguard","trip_planner","utilitywatch","solar","deep_cast","evacuation"].includes(tab) && <ReferenceModulePanel module={tab} weather={weather} onTab={setTab} onAsk={askFromTab} />}
        </Suspense>
      </main>
    </ReferenceChrome>
  );
}
