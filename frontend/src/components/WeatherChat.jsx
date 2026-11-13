import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { speechEngine, voiceSupported } from "../services/voice";
import ModernWeatherCard from "./ModernWeatherCard";
import ChatProvenance from "./ChatProvenance";
import { LocationRadarImagery } from "./LocationImagery";

const PROMPTS = {
  general: [
    "What will the weather be tomorrow?",
    "Will it rain today?",
    "Is it safe to travel?",
    "Any severe weather alerts?",
    "Personalized guidance for outdoor activity, laundry and travel today?",
  ],
  farmer: [
    "Give me an agriculture advisory.",
    "Cotton spray advisory for Nagpur district",
    "Will rain disturb harvest this week?",
    "Irrigation advice for paddy",
  ],
  disaster_manager: [
    "Any severe weather alerts?",
    "Show cyclone and flood risk",
    "Active alerts for Odisha",
    "Which areas need evacuation readiness?",
  ],
  aviation: [
    "METAR briefing for Delhi VIDP",
    "Is Mumbai airport weather flyable?",
    "Visibility and wind at Bengaluru airport",
  ],
  marine: [
    "Marine conditions near Kochi",
    "Wave height and fisherman warning for Chennai",
    "Is it safe for boats near Puri?",
  ],
  researcher: [
    "Explain the monsoon trend",
    "How has warming progressed since 1970?",
    "Compare this monsoon to the long-period average",
  ],
};

const PERSONA_LABEL = {
  general: "Citizen",
  farmer: "Farmer",
  disaster_manager: "Disaster Manager",
  aviation: "Aviation",
  marine: "Marine",
  researcher: "Researcher",
};

const LANG_LABEL = { auto: "Auto", en: "English", hi: "हिन्दी", mr: "मराठी", ta: "தமிழ்", te: "తెలుగు", bn: "বাংলা", gu: "ગુજરાતી", pa: "ਪੰਜਾਬੀ", kn: "ಕನ್ನಡ", ml: "മലയാളം", or: "ଓଡ଼ିଆ" };

const MODES = [
  ["🌆 City Weather", "Current weather with feels-like, wind and rain chance"],
  ["🌀 Cyclone Watch", "Any cyclone or storm threat right now"],
  ["🌧 Heavy Rain", "Will it rain heavily today or tomorrow"],
  ["🌡 Heat / Cold", "Heatwave or cold-wave risk"],
  ["🌊 Sea State", "Marine conditions and fisherman warning"],
  ["🧭 Travel", "Is it safe to travel this week"],
  ["🧺 Daily Planning", "Personal guidance for activity, comfort, laundry and travel timing"],
];

const INTENT_PROMPTS = {
  rain: (place) => `Will it rain in ${place} today?`,
  tomorrow: (place) => `Will it rain tomorrow in ${place}?`,
  warning: (place) => `Official warning for ${place}`,
  travel: (place) => `Is it safe to travel to ${place}?`,
};

function lastIntent(messages) {
  const lastUser = [...messages].reverse().find((message) => message.sender === "user");
  const text = String(lastUser?.text || "").toLowerCase();
  if (/warning|alert|imd/.test(text)) return "warning";
  if (/travel|road|trip|safe/.test(text)) return "travel";
  if (/tomorrow/.test(text)) return "tomorrow";
  if (/rain|shower|storm/.test(text)) return "rain";
  return "";
}

/* Prompts follow the active location and the previous question, not a
   hardcoded city. Without a resolved place the persona defaults stay intact. */
function buildPrompts(persona, weather, messages) {
  const place = weather?.location;
  const base = [...(PROMPTS[persona] || PROMPTS.general)];
  if (!place) return base;
  const localized = base.map((prompt) => {
    if (/tomorrow/i.test(prompt)) return `What will the weather be tomorrow in ${place}?`;
    if (/rain today/i.test(prompt)) return `Will it rain in ${place} today?`;
    if (/safe to travel/i.test(prompt)) return `Is it safe to travel to ${place} this week?`;
    if (/severe weather alerts/i.test(prompt)) return `Any official IMD warning for ${place}?`;
    if (/outdoor activity/i.test(prompt)) return `Personalized guidance for ${place} today?`;
    return prompt;
  });
  const intent = lastIntent(messages);
  const intentPrompt = intent ? INTENT_PROMPTS[intent]?.(place) : "";
  return [...new Set(intentPrompt ? [intentPrompt, ...localized] : localized)].slice(0, 5);
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const node = document.createElement("textarea");
  node.value = text;
  node.setAttribute("readonly", "");
  node.style.position = "fixed";
  node.style.opacity = "0";
  document.body.appendChild(node);
  node.select();
  try {
    document.execCommand("copy");
  } finally {
    node.remove();
  }
  return Promise.resolve();
}

export default function WeatherChat({
  messages,
  busy,
  language,
  persona,
  onAsk,
  onStop,
  onRegenerate,
  onNewChat,
  onClearChat,
  engineStatus,
  engineStatusError,
  onTab,
  micTick,
}) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [speaking, setSpeaking] = useState(null);
  const [copied, setCopied] = useState(null);
  const [stopped, setStopped] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const stickToBottom = useRef(true);
  const support = voiceSupported();
  const lastMic = useRef(0);

  const scrollToLatest = (behavior = "smooth") => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
    stickToBottom.current = true;
    setShowJump(false);
  };

  useLayoutEffect(() => {
    if (!stickToBottom.current) return;
    // Instant scroll on new content is deliberate: a smooth animation can be
    // interrupted when the loading row unmounts or a late error lands, which
    // left the newest reply just below the fold. The Jump button still glides.
    scrollToLatest("auto");
    // The message list owns scrolling; the page and composer stay stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, busy]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 168)}px`;
  }, [draft]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
    stickToBottom.current = atBottom;
    setShowJump(!atBottom);
  };

  const toggleMic = () => {
    if (recording) {
      speechEngine.stopListening();
      setRecording(false);
      return;
    }
    setVoiceNote("");
    speechEngine.listen(language, {
      onResult: (text, done) => {
        setDraft(text);
        if (done) setRecording(false);
      },
      onEnd: () => setRecording(false),
      onError: (code) => {
        setRecording(false);
        setVoiceNote(
          code === "unsupported"
            ? "Voice input is not supported in this browser — please type instead, or try Chrome/Edge with mic permission."
            : "Microphone unavailable or blocked — please check permission, or type instead."
        );
      },
    });
    setRecording(true);
  };

  useEffect(() => {
    if (micTick > lastMic.current) {
      lastMic.current = micTick;
      if (!recording) toggleMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micTick]);

  const send = (event) => {
    event?.preventDefault();
    if (!draft.trim() || busy) return;
    setStopped(false);
    stickToBottom.current = true;
    onAsk(draft);
    setDraft("");
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(event);
    }
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      stopGeneration();
    }
  };

  const stopGeneration = () => {
    onStop?.();
    setStopped(true);
  };

  // Prompt and regenerate actions bypass the composer, so clear the stop
  // notice here too; otherwise it would linger under the next fresh answer.
  const askFromPrompt = (query) => {
    if (busy) return;
    setStopped(false);
    stickToBottom.current = true;
    onAsk(query);
  };

  const handleRegenerate = () => {
    if (busy) return;
    setStopped(false);
    stickToBottom.current = true;
    onRegenerate?.();
  };

  const startNewChat = () => {
    setStopped(false);
    onNewChat?.();
  };

  const clearConversation = () => {
    setStopped(false);
    onClearChat?.();
  };

  const handleCopy = async (id, text) => {
    try {
      await copyText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      setVoiceNote("Copy failed — select the answer text and copy it manually.");
    }
  };

  const exportChat = () => {
    const lines = messages.map(
      (msg) => `## ${msg.sender === "user" ? "You" : "WeatherGPT"}\n\n${msg.text}\n`
    );
    const blob = new Blob(
      [`# WeatherGPT conversation\n\n_Exported ${new Date().toISOString()}_\n\n${lines.join("\n")}`],
      { type: "text/markdown;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "weathergpt-conversation.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Never render an empty bubble: an undefined/blank reply means the API
  // returned no usable text, so show an explicit notice instead.
  const bodyText = (msg) =>
    typeof msg.text === "string" && msg.text.trim()
      ? msg.text
      : "⚠️ This reply arrived without readable text. Please try again — no weather values are shown rather than guessed.";

  const toggleSpeech = (id, text) => {
    if (speaking === id) {
      speechEngine.stopSpeaking();
      setSpeaking(null);
    } else {
      speechEngine.speak(text, language, () => setSpeaking(null));
      setSpeaking(id);
    }
  };

  const lastWeather = [...messages].reverse().find((m) => m.weather)?.weather;
  const lastOfficial = [...messages]
    .reverse()
    .find((m) => m.official_alert_status && m.official_alert_status !== "NOT_REQUESTED");
  const forecastDays = Array.isArray(lastWeather?.daily) ? lastWeather.daily.slice(0, 3) : [];
  const prompts = buildPrompts(persona, lastWeather, messages);
  const configured = engineStatus?.configured_providers || [];
  const activeEngine = engineStatus?.active_inference === "DETERMINISTIC"
    ? "DETERMINISTIC TOOL-GROUNDED"
    : (engineStatus?.active_engine || "DETERMINISTIC TOOL-GROUNDED");
  const engineLabel = engineStatusError
    ? "STATUS UNAVAILABLE"
    : activeEngine.replace("RULE-BASED ", "");
  const configuredLabel = engineStatusError
    ? "STATUS UNAVAILABLE"
    : configured.length
      ? configured.join(", ")
      : "NONE";
  const selectedLabel = engineStatusError ? "—" : engineStatus?.selected_provider || "—";
  const healthLabel = engineStatusError ? "UNAVAILABLE" : engineStatus?.health || "NOT_CHECKED";
  const fallbackLabel = engineStatusError
    ? "UNAVAILABLE"
    : engineStatus?.fallback
      ? "DETERMINISTIC TOOLS"
      : "—";
  const hasConversation = messages.some((m) => m.sender === "user");

  return (
    <section className="wg-ai-assistant" aria-label="AI weather assistant">
      <header className="wg-ai-masthead">
        <span className="wg-ai-masthead-kicker">CONVERSATIONAL METEOROLOGY · LIVE TOOLS</span>
        <h1>AI Weather Assistant</h1>
        <p>
          Ask about forecasts, severe weather, crops, travel or preparedness. Answers draw on the same live
          providers as the rest of WeatherGPT; when a source is missing, the assistant says so instead of inventing it.
        </p>
      </header>
      <div className="wg-ai-assistant-layout">
        <div className="wg-ai-chat-column">
          <div className="wg-ai-workspace-controls">
            <div className="wg-ai-engine-status" data-testid="engine-status" aria-label="Engine status">
              <span className="wg-chip static">ENGINE: {engineLabel}</span>
              <span className="wg-chip static">LLM CONFIGURED: {configuredLabel}</span>
              <span className="wg-chip static">SELECTED: {selectedLabel}</span>
              <span className="wg-chip static">HEALTH: {healthLabel}</span>
              <span
                className="wg-chip static"
                title={typeof engineStatus?.fallback === "string" ? engineStatus.fallback : undefined}
              >
                FALLBACK: {fallbackLabel}
              </span>
            </div>
            <div className="wg-ai-workspace-buttons">
              <button type="button" className="wg-btn-ghost" onClick={startNewChat} disabled={busy}>
                New chat
              </button>
              <button type="button" className="wg-btn-ghost" onClick={clearConversation} disabled={busy || !hasConversation}>
                Clear
              </button>
              <button type="button" className="wg-btn-ghost" onClick={exportChat} disabled={!hasConversation}>
                Export
              </button>
            </div>
          </div>

          <div className="wg-ai-message-shell">
          <div
            className="wg-ai-message-list"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            ref={listRef}
            onScroll={handleScroll}
          >
            {messages.map((msg) => {
              const isLastBot = hasConversation && msg.sender === "bot" && msg.id === [...messages].reverse().find((m) => m.sender === "bot")?.id;
              return (
                <article
                  key={msg.id}
                  data-testid={msg.sender === "user" ? "user-message" : "assistant-message"}
                  className="wg-card wg-enter wg-ai-message"
                  style={{
                    padding: "0.85rem 1rem",
                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "100%",
                    borderColor: msg.sender === "user" ? "rgba(56,189,248,.35)" : undefined,
                  }}
                >
                  <header className="wg-ai-message-header">
                    <strong>{msg.sender === "user" ? "You" : "WeatherGPT"}</strong>
                    <div className="wg-ai-message-toolbar">
                      <button
                        type="button"
                        className="wg-btn-ghost"
                        onClick={() => handleCopy(msg.id, bodyText(msg))}
                        aria-label={copied === msg.id ? "Copied" : "Copy this reply"}
                      >
                        {copied === msg.id ? "✓ Copied" : "Copy"}
                      </button>
                      {msg.speech_text && (
                        <button
                          type="button"
                          className="wg-btn-ghost"
                          onClick={() => toggleSpeech(msg.id, msg.speech_text)}
                          aria-label={speaking === msg.id ? "Stop reading reply" : "Read reply aloud"}
                        >
                          {speaking === msg.id ? "⏹ Stop" : "🔊 Listen"}
                        </button>
                      )}
                      {isLastBot && !busy && onRegenerate && (
                        <button type="button" className="wg-btn-ghost" onClick={handleRegenerate}>
                          Regenerate
                        </button>
                      )}
                    </div>
                  </header>
                  <div
                    className="wg-ai-message-body"
                    data-testid="message-body"
                    style={{ fontSize: "0.86rem", lineHeight: 1.6 }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyText(msg)}</ReactMarkdown>
                  </div>
                  {msg.weather && (
                    <div style={{ marginTop: "0.6rem" }} data-testid="weather-card">
                      <ModernWeatherCard
                        weather={msg.weather}
                        compact
                        provenance={msg.provenance}
                      />
                    </div>
                  )}
                  <ChatProvenance message={msg} onAsk={askFromPrompt} busy={busy} />
                  {msg.suggested_actions?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
                      {msg.suggested_actions.map((a, i) => (
                        <button key={i} className="wg-btn-ghost" onClick={() => onTab(a.action)}>
                          {a.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
            {busy && (
              <div className="wg-ai-busy" role="status" aria-label="Working">
                <div className="wg-shimmer" />
                <div className="wg-ai-busy-row">
                  <span style={{ fontSize: "0.75rem", color: "var(--wg-accent)" }}>Reading live model data…</span>
                  <button type="button" className="wg-btn-ghost" onClick={stopGeneration}>
                    Stop
                  </button>
                </div>
              </div>
            )}
            {!busy && stopped && (
              <div className="wg-ai-stopped" role="status">
                Generation stopped. The partial answer was not saved.
              </div>
            )}
          </div>

          {showJump && (
            <button type="button" className="wg-ai-jump-latest" onClick={() => scrollToLatest()}>
              ↓ Jump to latest
            </button>
          )}
          </div>

          {voiceNote && <div className="wg-alert warn" role="alert">🎙 {voiceNote}</div>}

          <div className="wg-scrollrow" aria-label="Capability modes">
            {MODES.map(([label, query]) => (
              <button key={label} className="wg-chip" style={{ cursor: "pointer", textTransform: "none", fontSize: "0.7rem" }} onClick={() => askFromPrompt(query)} title={query} disabled={busy}>
                {label}
              </button>
            ))}
          </div>

          <div className="wg-scrollrow" aria-label="Suggested questions" data-testid="contextual-prompts">
            {prompts.map((p) => (
              <button key={p} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => askFromPrompt(p)} disabled={busy}>{p}</button>
            ))}
          </div>

          <form className="wg-ai-composer" onSubmit={send}>
            <textarea
              ref={textareaRef}
              className="wg-input wg-ai-textarea"
              aria-label="Type your weather question"
              placeholder={recording ? "Listening… speak now" : "Ask anything about weather, risks, crops, flights, seas…"}
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              style={{
                color: "var(--wg-text-primary, #eaf1fb)",
                backgroundColor: "rgba(7, 11, 22, 0.92)",
                caretColor: "#38bdf8",
                borderColor: recording ? "var(--wg-bad)" : "rgba(148, 163, 184, 0.42)",
                ...(recording ? { boxShadow: "0 0 0 2px rgba(248, 113, 113, 0.18)" } : {}),
              }}
            />
            <button
              type="button"
              className={`wg-btn-ghost${recording ? " wg-mic-live" : ""}`}
              onClick={toggleMic}
              aria-label={recording ? "Stop recording" : "Ask by voice"}
              title={support.stt ? "Ask by voice (Web Speech API)" : "Voice unsupported here"}
              disabled={busy}
            >
              {recording ? (
                <span className="wg-waves" aria-hidden="true"><span /><span /><span /><span /></span>
              ) : (
                "🎙"
              )}
            </button>
            {busy ? (
              <button type="button" className="wg-btn" onClick={stopGeneration} aria-label="Stop generating">
                Stop
              </button>
            ) : (
              <button type="submit" className="wg-btn" disabled={!draft.trim()} aria-label="Send question">Send</button>
            )}
          </form>
          <div className="wg-ai-composer-hint">
            Enter sends · Shift+Enter adds a line · Esc stops a reply
          </div>
          <div className="wg-ai-lang-row">
            <span className="wg-chip static">LANG: {LANG_LABEL[language] || language}</span>
            <span className="wg-chip static">DATA: TOOL-GROUNDED</span>
          </div>
        </div>

        <aside className="wg-ai-context" aria-label="Conversation context">
          <div className="wg-card wg-ai-context-card">
            <div className="wg-section-title">Context</div>
            <div className="wg-ai-context-details">
              <span>👤 Profile: <strong>{PERSONA_LABEL[persona] || persona}</strong></span>
              <span>🗣 Language: <strong>{LANG_LABEL[language] || language}</strong></span>
              <span>📍 Focus: <strong>{lastWeather ? `${lastWeather.location}, ${lastWeather.state}` : "—"}</strong></span>
              {lastWeather && (
                <span>🌡 {lastWeather.current_temp}°C · {lastWeather.condition} · 💧{lastWeather.hourly?.[0]?.rain_prob ?? 0}% rain</span>
              )}
            </div>
          </div>
          <div className="wg-card wg-ai-context-card">
            <div className="wg-section-title">Engine &amp; sources</div>
            <div className="wg-ai-context-details">
              <span>⚙️ Active inference: <strong>{engineLabel}</strong></span>
              <span>🔌 Selected provider: <strong>{selectedLabel}</strong></span>
              <span>🧾 Configured: <strong>{configuredLabel}</strong></span>
              <span>🩺 Health: <strong>{healthLabel}</strong></span>
              <span>🛟 Fallback: <strong>deterministic weather tools</strong></span>
            </div>
          </div>
          {lastOfficial && (
            <div className="wg-card wg-ai-context-card" data-testid="sidebar-official">
              <div className="wg-section-title">Official warnings</div>
              <div className="wg-ai-context-details">
                <span>
                  IMD status: <strong>{String(lastOfficial.official_alert_status).replaceAll("_", " ")}</strong>
                </span>
                {(lastOfficial.official_alerts || []).slice(0, 2).map((item, index) => (
                  <span key={`${item?.title || "official"}-${index}`}>
                    {item?.link ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item?.title || "Official IMD bulletin"}
                      </a>
                    ) : (
                      item?.title || "Official IMD bulletin"
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {forecastDays.length > 0 && (
            <div className="wg-card wg-ai-context-card">
              <div className="wg-section-title">Next days</div>
              <div className="wg-ai-context-details">
                {forecastDays.map((day) => (
                  <span key={day.date}>
                    <strong>{day.day || day.date}</strong> · {day.temp_max}° / {day.temp_min}° · {day.condition}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <div className="wg-section-title">How answers are made</div>
            <p className="wg-ai-explain-text">
              Speech → text → intent → live weather tools → reply → speech.
              Figures always come from data tools, never invented. Voice needs a supporting browser.
            </p>
            {!support.stt && <p style={{ fontSize: "0.75rem", color: "var(--wg-warn)" }}>🎙 Voice input unavailable in this browser — typing works everywhere.</p>}
          </div>
          {lastWeather && (
            <LocationRadarImagery
              lat={lastWeather.lat}
              lon={lastWeather.lon}
              place={lastWeather.location}
              title={`Radar near ${lastWeather.location}`}
              description="Recent-past precipitation around the conversation focus. Blank means no radar coverage, not clear skies."
            />
          )}
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <div className="wg-section-title">Jump to</div>
            <div className="wg-ai-jump-buttons">
              <button className="wg-btn-ghost" onClick={() => onTab("open_dashboard")}>Forecast</button>
              <button className="wg-btn-ghost" onClick={() => onTab("open_map")}>Radar</button>
              <button className="wg-btn-ghost" onClick={() => onTab("open_alerts")}>Alerts</button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
