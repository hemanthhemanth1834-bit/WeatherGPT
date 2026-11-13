import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { personaForApi } from "./services/persona";
import WeatherChat from "./components/WeatherChat";
import ReferenceChrome from "./components/ReferenceChrome";
import ErrorBoundary from "./components/ErrorBoundary";
import ModuleSkeleton from "./components/ModuleSkeleton";
import ModuleProvenance from "./components/ModuleProvenance";
import { fetchActiveAlerts, fetchCurrentWeather, fetchEngineStatus, fetchReverseGeocode, sendChatQuery } from "./services/api";

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
const DeepCastPanel = lazy(() => import("./components/DeepCastPanel"));
const ClimateAnalytics = lazy(() => import("./components/ClimateAnalytics"));
const RiskPanel = lazy(() => import("./components/RiskPanel"));
const NwpSatellitePanel = lazy(() => import("./components/NwpSatellitePanel"));
const ProvidersPanel = lazy(() => import("./components/ProvidersPanel"));
const AboutDeveloper = lazy(() => import("./components/AboutDeveloper"));
const CapabilitiesHub = lazy(() => import("./components/CapabilitiesHub"));
const PrivacyPage = lazy(() => import("./components/PrivacyPage"));


const SAVED_KEY = "weathergpt.savedPlaces";
const LANGUAGE_KEY = "weathergpt.language";
const CHAT_KEY = "weathergpt.chat.v1";
const SUPPORTED_LANGUAGES = new Set(["auto", "en", "hi", "ta", "te", "ml", "kn", "bn", "mr", "gu", "pa", "or"]);

// A response only counts as live weather when it carries an observed
// temperature. A 200 with an empty body must not light the green "Engine up"
// state, and neither must a 503 that proves only that the backend answered.
const hasLiveWeather = (data) =>
  Boolean(data && typeof data === "object" && data.current_temp != null);

// Hash routing keeps direct links, browser back/forward and static-hosting
// refreshes working without a server-side rewrite. Primary destinations use
// readable slugs; postponed modules remain reachable under /preview/*.
const ROUTES = {
  home: "",
  dashboard: "live-weather",
  deep_cast: "deep-cast",
  climate: "climate-trends",
  alerts: "severe-alerts",
  risk: "floodwatch",
  severe: "disaster-preparedness",
  chat: "ai-assistant",
  agri: "farm-advisory",
  capabilities: "platform-status",
  privacy: "privacy-data",
  about: "about",
  map: "map",
  satellite: "satellite",
  earth: "earth-3d",
  nwp: "nwp",
  aviation_marine: "aviation-marine",
};
const TAB_BY_ROUTE = Object.fromEntries(Object.entries(ROUTES).map(([tab, route]) => [route, tab]));

function readRoute() {
  if (typeof window === "undefined") return "home";
  const slug = decodeURIComponent(window.location.hash.replace(/^#\/?/, "").replace(/\/$/, ""));
  return TAB_BY_ROUTE[slug] || "home";
}


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

// Restore a bounded, validated conversation. Session storage keeps the
// transcript on this browser tab only; corrupt or oversized entries recover
// to the welcome message instead of breaking the assistant.
function loadChatMessages() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CHAT_KEY) || "null");
    if (!Array.isArray(raw)) return [OpeningMessage()];
    const messages = raw
      .filter(
        (m) =>
          m &&
          typeof m.id === "string" &&
          (m.sender === "user" || m.sender === "bot") &&
          typeof m.text === "string" &&
          m.text.trim()
      )
      .slice(-40)
      .map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        speech_text: typeof m.speech_text === "string" ? m.speech_text : undefined,
        weather: m.weather && typeof m.weather === "object" ? m.weather : undefined,
        alerts: Array.isArray(m.alerts) ? m.alerts : undefined,
        agri_advisory: m.agri_advisory,
        aviation_briefing: m.aviation_briefing,
        marine_advisory: m.marine_advisory,
        suggested_actions: Array.isArray(m.suggested_actions) ? m.suggested_actions : undefined,
        quick_suggestions: Array.isArray(m.quick_suggestions) ? m.quick_suggestions : undefined,
        provenance: m.provenance && typeof m.provenance === "object" ? m.provenance : undefined,
        sources: Array.isArray(m.sources) ? m.sources : undefined,
        data_type: typeof m.data_type === "string" ? m.data_type : undefined,
        freshness: typeof m.freshness === "string" ? m.freshness : undefined,
        limitations: Array.isArray(m.limitations) ? m.limitations : undefined,
        tool_trace: Array.isArray(m.tool_trace) ? m.tool_trace : undefined,
        official_alerts: Array.isArray(m.official_alerts) ? m.official_alerts : undefined,
        official_alert_status:
          typeof m.official_alert_status === "string" ? m.official_alert_status : undefined,
        location_candidates: Array.isArray(m.location_candidates) ? m.location_candidates : undefined,
        needs_location_confirmation: Boolean(m.needs_location_confirmation),
        risk_breakdown: m.risk_breakdown && typeof m.risk_breakdown === "object" ? m.risk_breakdown : undefined,
      }));
    return messages.length ? messages : [OpeningMessage()];
  } catch {
    return [OpeningMessage()];
  }
}

// Dedicated reference intelligence routes
export default function App() {
    const [tab, setTab] = useState(readRoute);

  const [persona, setPersona] = useState("general");
  const [language, setLanguage] = useState(loadLanguage);
  const [place, setPlace] = useState("");
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState(loadChatMessages);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [engineStatusError, setEngineStatusError] = useState(false);
  const [saved, setSaved] = useState(loadSaved);
  const [notice, setNotice] = useState("");
  const [micTick, setMicTick] = useState(0);
  const [locating, setLocating] = useState(false);
  // Weather-engine reachability for the header pill: null = unknown yet,
  // true = last request got an HTTP answer, false = network failure/abort.
  const [online, setOnline] = useState(null);
  // Whether the latest weather request actually produced data. Reachability
  // alone is not enough: a 503/empty payload is "up but data unavailable".
  const [dataState, setDataState] = useState("unknown");
  // LocationState: { source: GPS|MANUAL|SAVED|UNKNOWN, status: DETECTING|LIVE|MANUAL|LAST_KNOWN|DENIED|UNAVAILABLE|ERROR|IDLE }
  const [locState, setLocState] = useState({ source: "UNKNOWN", status: "IDLE" });
  const locRequestId = React.useRef(0);
  const initDone = React.useRef(false);
  const searchSeq = React.useRef(0);
  const retryTimer = React.useRef(null);
  const hasWeatherRef = React.useRef(false);
  const weatherAbortRef = React.useRef(null);
  const chatAbortRef = React.useRef(null);
  const chatSeq = React.useRef(0);

  useEffect(() => () => {
    weatherAbortRef.current?.abort();
    chatAbortRef.current?.abort();
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      try {
        sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-12)));
      } catch {
        /* Storage may be unavailable or full; the in-memory chat still works. */
      }
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    fetchEngineStatus()
      .then((status) => {
        if (!cancelled) {
          setEngineStatus(status);
          setEngineStatusError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setEngineStatusError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    async (text, { appendUser = true } = {}) => {
      const query = (text || "").trim();
      if (!query || chatBusy) return;
      const seq = ++chatSeq.current;
      chatAbortRef.current?.abort();
      const controller = new AbortController();
      chatAbortRef.current = controller;
      if (appendUser) {
        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: query }]);
      }
      setChatBusy(true);
      try {
        const reply = await sendChatQuery(query, personaForApi(persona), language, place, {
          signal: controller.signal,
        });
        if (seq !== chatSeq.current || controller.signal.aborted) return;
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
            provenance: reply.provenance,
            sources: reply.sources,
            data_type: reply.data_type,
            freshness: reply.freshness,
            limitations: reply.limitations,
            tool_trace: reply.tool_trace,
            official_alerts: reply.official_alerts,
            official_alert_status: reply.official_alert_status,
            location_candidates: reply.location_candidates,
            needs_location_confirmation: reply.needs_location_confirmation,
            risk_breakdown: reply.risk_breakdown,
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
            setOnline(true);
            setDataState(hasLiveWeather(sw) ? "live" : "unavailable");
            remember(sw.location);
          }
        }
      } catch (error) {
        // A user-initiated stop is not a failure. Ignore aborted requests and
        // stale responses from a superseded conversation.
        if (seq !== chatSeq.current || controller.signal.aborted || error?.name === "AbortError") return;
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
        if (seq === chatSeq.current) {
          setChatBusy(false);
          if (chatAbortRef.current === controller) chatAbortRef.current = null;
        }
      }
    },
    [chatBusy, persona, language, place, remember]
  );

  const stopChat = useCallback(() => {
    chatSeq.current += 1;
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setChatBusy(false);
  }, []);

  const newChat = useCallback(() => {
    stopChat();
    setMessages([OpeningMessage()]);
  }, [stopChat]);

  const clearChat = useCallback(() => {
    if (!window.confirm("Clear this conversation? This cannot be undone.")) return;
    newChat();
  }, [newChat]);

  const regenerate = useCallback(() => {
    if (chatBusy) return;
    let index = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender === "user") {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    const query = messages[index].text;
    // Drop the previous user turn and every reply after it, then resend.
    setMessages((prev) => prev.slice(0, index));
    ask(query);
  }, [ask, chatBusy, messages]);

  const searchPlace = useCallback(
    async (name, lat = null, lon = null, state = null, source = "MANUAL", opts = {}) => {
      const target = (name || "").trim();
      if (!target) return;
      weatherAbortRef.current?.abort();
      const controller = new AbortController();
      weatherAbortRef.current = controller;
      const requestId = locRequestId.current;
      const seq = ++searchSeq.current;
      const isCurrent = () => searchSeq.current === seq && locRequestId.current === requestId;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
            setBusy(true);
      // A selected place should be visible immediately, even while the
      // forecast request is still in flight or the provider is down.
      if (!hasWeatherRef.current) setPlace(target);
      try {
        const data = await fetchCurrentWeather(target, lat, lon, "auto", state, controller.signal);
        if (!isCurrent()) return;
        // A 200 with an empty payload is still no weather. Surface it as an
        // unavailable-data result instead of overwriting good data.
        if (!hasLiveWeather(data)) {
          if (!hasWeatherRef.current) setPlace(target);
          setOnline(true);
          setDataState("unavailable");
          setNotice(`The weather provider returned no data for "${target}". Try again shortly.`);
          if (!hasWeatherRef.current) setLocState({ source, status: "ERROR" });
          return;
        }
        hasWeatherRef.current = true;
        setOnline(true);
        setDataState("live");
        setNotice("");
        setWeather(data);
        setPlace(data.location);
        setLocState({ source, status: source === "GPS" ? "LIVE" : source === "SAVED" ? "LAST_KNOWN" : "MANUAL" });
        remember(data.location);
      } catch (err) {
        if (!isCurrent() || err?.name === "AbortError") return;
        // Backend answered with an HTTP error => reachable; network failure
        // or the client's intended 20 s abort => not reachable.
        setOnline(err?.status != null);
        // Whatever the status, this request has no fresh weather data. Keep
        // "Engine up" for a verified live payload only.
        setDataState("unavailable");
        // Keep a first selected/saved place visible even when its forecast is
        // unavailable. A prior successful city remains authoritative because
        // its stale data is still what the panels are showing.
        if (!hasWeatherRef.current) setPlace(target);
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
        if (weatherAbortRef.current === controller) weatherAbortRef.current = null;
        if (isCurrent()) setBusy(false);
      }
    },
    [remember]
  );

    const attemptGps = useCallback(
    (manual, savedFallback) => {
      // Read storage at fallback time as well as from React state. This keeps
      // saved-location recovery reliable on a cold direct URL load, where the
      // initial state read and the browser's storage initialization can race.
      const fallback = savedFallback && savedFallback.length > 0 ? savedFallback : loadSaved();
      if (!navigator.geolocation) {
        setLocState({ source: "UNKNOWN", status: "UNAVAILABLE" });
        if (manual) {
          setNotice("Geolocation is not available in this browser. Search for a location manually.");
        } else if (fallback.length > 0) {
          searchPlace(fallback[0], null, null, null, "SAVED");
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
                if (!manual && fallback.length > 0) {
          searchPlace(fallback[0], null, null, null, "SAVED");
        } else {
          setNotice("Location request timed out. Search for a location manually.");
        }
      }, 12000);
      navigator.geolocation.getCurrentPosition(
                async (pos) => {
          if (locRequestId.current !== requestId) return;
          clearTimeout(gpsWatchdog);
          const { latitude, longitude } = pos.coords;
          const coords = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          // Show the detected point immediately. Reverse geocoding and the
          // forecast request can both be unavailable, but the selected
          // location must never look like it is still detecting.
          setPlace(coords);
          setLocState({ source: "GPS", status: "LIVE" });
          setNotice("");
          let label = coords;
          let stateName = null;
          let reverseFailed = false;
          try {
            try {
              const rev = await fetchReverseGeocode(latitude, longitude);
              if (locRequestId.current !== requestId) return;
              label = rev.city || coords;
              stateName = rev.state || null;
              setPlace(label);
            } catch {
              reverseFailed = true;
            }
            await searchPlace(label, latitude, longitude, stateName, "GPS");
            if (locRequestId.current !== requestId) return;
            if (reverseFailed && !hasWeatherRef.current) {
              setNotice(`GPS detected at ${coords}. City lookup failed; showing coordinates and retrying weather in the background.`);
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
                    if (!manual && fallback.length > 0) {
            searchPlace(fallback[0], null, null, null, "SAVED");
          } else if (!manual && err && err.code !== err.TIMEOUT && err.code !== err.POSITION_UNAVAILABLE) {
            setNotice("Location access was denied. Search for a location manually.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    [searchPlace]
  );



    useEffect(() => {
    const syncFromUrl = () => setTab(readRoute());
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const goTab = useCallback((name) => {
    const map = { open_map: "map", open_dashboard: "dashboard", open_agri: "agri", open_alerts: "alerts", live_news: "alerts" };
    const destination = map[name] || name;
    setTab(destination);
    const route = ROUTES[destination] ?? destination;
    const nextHash = route ? `#/${route}` : "#/";
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
    // Every destination opens at its own top, never at the previous page's offset.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    // Covers hash/back-forward navigation as well as taps on the current tab.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [tab]);


  const voiceToChat = useCallback(() => {
    setTab("chat");
    setMicTick((t) => t + 1);
  }, []);

  const askFromTab = useCallback((q) => {
    setTab("chat");
    ask(q);
  }, [ask]);


  return (
    <ReferenceChrome tab={tab} onTab={goTab} weather={weather} selectedPlace={place} alertCount={alerts.length} language={language === "auto" ? "en" : language} onLanguageChange={setLanguage} onLocationSelect={(item) => searchPlace(item.name, item.lat ?? null, item.lon ?? item.lng ?? null, item.state || null, "MANUAL")} onUseLiveLocation={() => attemptGps(true, saved)} locStatus={locState.status} online={online} dataState={dataState} notice={notice} onDismissNotice={() => setNotice("")}>
      <main id="main-content" className="wg-wrap wg-reference-main" data-module={tab}>
        <div className="wg-module-atmosphere" aria-hidden="true" />
        <ModuleProvenance
          tab={tab}
          weather={weather}
          selectedPlace={place}
          online={online}
          dataState={dataState}
          onOpenStatus={() => goTab("capabilities")}
        />
        {tab === "chat" && (
          <WeatherChat
            messages={messages}
            busy={chatBusy}
            language={language}
            persona={persona}
            onAsk={ask}
            onStop={stopChat}
            onRegenerate={regenerate}
            onNewChat={newChat}
            onClearChat={clearChat}
            engineStatus={engineStatus}
            engineStatusError={engineStatusError}
            onTab={goTab}
            micTick={micTick}
          />
        )}
        <ErrorBoundary resetKey={tab} onOpenStatus={() => goTab("capabilities")}>
          <Suspense fallback={<ModuleSkeleton label={`Loading ${tab.replaceAll("_", " ")}`} />}>
          {tab === "home" && <HomePanel weather={weather} busy={busy} detecting={locating} locStatus={locState.status} alertCount={alerts.length} alerts={alerts} onAsk={askFromTab} onTab={goTab} onRefresh={searchPlace} />}
          {tab === "dashboard" && <WeatherDashboard weather={weather} busy={busy} onAsk={askFromTab} />}
          {tab === "map" && <GISMap weather={weather} onAsk={(loc) => askFromTab(`Weather and hazards for ${loc}`)} />}
          {tab === "earth" && <Earth3D weather={weather} />}
          {tab === "agri" && <AgriAdvisor place={place} onAsk={askFromTab} />}
          {tab === "aviation_marine" && <AviationMarine onAsk={askFromTab} />}
          {tab === "alerts" && <AlertCenter onAsk={askFromTab} weather={weather} selectedPlace={place} onTab={goTab} />}
          {tab === "severe" && <SevereWeatherPanel weather={weather} selectedPlace={place} onAsk={askFromTab} onTab={goTab} />}
          {tab === "deep_cast" && <DeepCastPanel key={`${weather?.lat ?? "none"}:${weather?.lon ?? "none"}`} weather={weather} selectedPlace={place} onTab={goTab} onAsk={askFromTab} onSearch={searchPlace} />}
          {tab === "climate" && (
            <ClimateAnalytics
              onAsk={askFromTab}
              onSearch={searchPlace}
              initialLocation={place || saved[0] || ""}
              savedPlaces={saved}
            />
          )}
          {tab === "risk" && <RiskPanel location={place} weather={weather} onAsk={askFromTab} onTab={goTab} />}
          {tab === "nwp" && <><NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="nwp" /><div style={{ marginTop: "0.8rem" }}><ProvidersPanel /></div></>}
          {tab === "satellite" && <NwpSatellitePanel location={place} lat={weather?.lat ?? 20} lon={weather?.lon ?? 78} focus="satellite" />}
          {tab === "about" && <AboutDeveloper />}
          {tab === "capabilities" && <CapabilitiesHub onOpen={goTab} />}
          {tab === "privacy" && <PrivacyPage />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </ReferenceChrome>
  );
}
