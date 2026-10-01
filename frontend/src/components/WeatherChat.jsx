import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { speechEngine, voiceSupported } from "../services/voice";
import ModernWeatherCard from "./ModernWeatherCard";

const PROMPTS = {
  general: [
    "What will the weather be tomorrow?",
    "Will it rain today?",
    "Is it safe to travel?",
    "Any severe weather alerts?",
    "What is the forecast for Vijayawada?",
    "Explain today's weather.",
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
];

export default function WeatherChat({ messages, busy, language, persona, onAsk, onTab, micTick }) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [speaking, setSpeaking] = useState(null);
  const endRef = useRef(null);
  const support = voiceSupported();
  const lastMic = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
    if (!draft.trim()) return;
    onAsk(draft);
    setDraft("");
  };

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
  const prompts = PROMPTS[persona] || PROMPTS.general;

  return (
    <section aria-label="AI weather chat" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "0.8rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(16rem,1fr))", gap: "0.8rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", minHeight: "24rem", maxHeight: "62vh" }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.7rem", paddingRight: "0.2rem" }} role="log" aria-live="polite" aria-label="Conversation">
            {messages.map((msg) => (
              <article key={msg.id} className="wg-card wg-enter"
                style={{ padding: "0.85rem 1rem", alignSelf: msg.sender === "user" ? "flex-end" : "flex-start", maxWidth: "100%", borderColor: msg.sender === "user" ? "rgba(56,189,248,.35)" : undefined }}>
                <header style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", marginBottom: "0.35rem", fontSize: "0.72rem", color: "var(--wg-muted)" }}>
                  <strong>{msg.sender === "user" ? "You" : "WeatherGPT"}</strong>
                  {msg.speech_text && (
                    <button className="wg-btn-ghost" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem" }} onClick={() => toggleSpeech(msg.id, msg.speech_text)} aria-label={speaking === msg.id ? "Stop reading reply" : "Read reply aloud"}>
                      {speaking === msg.id ? "⏹ Stop" : "🔊 Listen"}
                    </button>
                  )}
                </header>
                <div style={{ fontSize: "0.86rem", lineHeight: 1.6 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
                {msg.weather && <div style={{ marginTop: "0.6rem" }}><ModernWeatherCard weather={msg.weather} /></div>}
                {msg.suggested_actions?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
                    {msg.suggested_actions.map((a, i) => (
                      <button key={i} className="wg-btn-ghost" onClick={() => onTab(a.action)}>{a.label} →</button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {busy && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }} role="status" aria-label="Working">
                <div className="wg-shimmer" />
                <span style={{ fontSize: "0.75rem", color: "var(--wg-accent)" }}>Reading live model data…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {voiceNote && <div className="wg-alert warn" role="alert">🎙 {voiceNote}</div>}

          <div className="wg-scrollrow" aria-label="Capability modes">
            {MODES.map(([label, query]) => (
              <button key={label} className="wg-chip" style={{ cursor: "pointer", textTransform: "none", fontSize: "0.7rem" }} onClick={() => onAsk(query)} title={query}>
                {label}
              </button>
            ))}
          </div>

          <div className="wg-scrollrow" aria-label="Suggested questions">
            {prompts.map((p) => (
              <button key={p} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => onAsk(p)}>{p}</button>
            ))}
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
            <input className="wg-input" aria-label="Type your weather question" placeholder={recording ? "Listening… speak now" : "Ask anything about weather, risks, crops, flights, seas…"}
              value={draft} onChange={(e) => setDraft(e.target.value)} style={recording ? { borderColor: "var(--wg-bad)" } : undefined} />
            <button
              type="button"
              className={`wg-btn-ghost${recording ? " wg-mic-live" : ""}`}
              onClick={toggleMic}
              aria-label={recording ? "Stop recording" : "Ask by voice"}
              title={support.stt ? "Ask by voice (Web Speech API)" : "Voice unsupported here"}
            >
              {recording ? (
                <span className="wg-waves" aria-hidden="true"><span /><span /><span /><span /></span>
              ) : (
                "🎙"
              )}
            </button>
            <button type="submit" className="wg-btn" disabled={busy || !draft.trim()} aria-label="Send question">Send</button>
          </form>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.7rem", color: "var(--wg-muted)" }}>
            <span className="wg-chip static">LANG: {LANG_LABEL[language] || language}</span>
            <span className="wg-chip static">ENGINE: TOOL-GROUNDED (LLM NOT CONFIGURED)</span>
          </div>
        </div>

        <aside aria-label="Conversation context" style={{ display: "flex", flexDirection: "column", gap: "0.7rem", alignContent: "start" }}>
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <div className="wg-section-title">Context</div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.83rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span>👤 Profile: <strong>{PERSONA_LABEL[persona] || persona}</strong></span>
              <span>🗣 Language: <strong>{LANG_LABEL[language] || language}</strong></span>
              <span>📍 Focus: <strong>{lastWeather ? `${lastWeather.location}, ${lastWeather.state}` : "—"}</strong></span>
              {lastWeather && (
                <span>🌡 {lastWeather.current_temp}°C · {lastWeather.condition} · 💧{lastWeather.hourly?.[0]?.rain_prob ?? 0}% rain</span>
              )}
            </div>
          </div>
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <div className="wg-section-title">How answers are made</div>
            <p style={{ fontSize: "0.78rem", color: "var(--wg-muted)", lineHeight: 1.6, margin: "0.4rem 0 0" }}>
              Speech → text → intent → live weather tools → reply → speech.
              Figures always come from data tools, never invented. Voice needs a supporting browser.
            </p>
            {!support.stt && <p style={{ fontSize: "0.75rem", color: "var(--wg-warn)" }}>🎙 Voice input unavailable in this browser — typing works everywhere.</p>}
          </div>
          <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
            <div className="wg-section-title">Jump to</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
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
