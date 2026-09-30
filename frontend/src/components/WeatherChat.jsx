import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { speechEngine, voiceSupported } from "../services/voice";
import ModernWeatherCard from "./ModernWeatherCard";

const HINTS = [
  "Will it rain tomorrow in Mumbai?",
  "Cotton advisory for Nagpur district",
  "Active alerts for Odisha",
  "Compare Pune vs Goa weather",
  "Marine conditions near Kochi",
];

const PLACEHOLDER = "Ask about forecasts, rain, risks, crops, flights, seas, alerts…";

export default function WeatherChat({ messages, busy, language, onAsk, onTab }) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [speaking, setSpeaking] = useState(null);
  const endRef = useRef(null);
  const support = voiceSupported();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = (event) => {
    event?.preventDefault();
    if (!draft.trim()) return;
    onAsk(draft);
    setDraft("");
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

  const toggleSpeech = (id, text) => {
    if (speaking === id) {
      speechEngine.stopSpeaking();
      setSpeaking(null);
    } else {
      speechEngine.speak(text, language, () => setSpeaking(null));
      setSpeaking(id);
    }
  };

  return (
    <section aria-label="Weather chat" style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", maxHeight: "56vh", overflowY: "auto" }} role="log" aria-live="polite" aria-label="Conversation">
        {messages.map((msg) => (
          <article
            key={msg.id}
            className="wg-card"
            style={{
              padding: "0.85rem 1rem",
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "min(46rem, 100%)",
              borderColor: msg.sender === "user" ? "rgba(56,189,248,.35)" : undefined,
            }}
          >
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
            {msg.weather && (
              <div style={{ marginTop: "0.6rem" }}>
                <ModernWeatherCard weather={msg.weather} />
              </div>
            )}
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
        ))}
        {busy && (
          <div className="wg-card" role="status" style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: "var(--wg-accent)", alignSelf: "flex-start" }}>
            Reading live model data…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {voiceNote && (
        <div className="wg-alert warn" role="alert">
          🎙 {voiceNote}
        </div>
      )}

      <div className="wg-scrollrow" aria-label="Example questions">
        {HINTS.map((h) => (
          <button key={h} className="wg-btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={() => onAsk(h)}>
            {h}
          </button>
        ))}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          className="wg-input"
          aria-label="Type your weather question"
          placeholder={recording ? "Listening… speak now" : PLACEHOLDER}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={recording ? { borderColor: "var(--wg-bad)" } : undefined}
        />
        <button
          type="button"
          className="wg-btn-ghost"
          onClick={toggleMic}
          aria-label={recording ? "Stop recording" : "Ask by voice"}
          title={support.stt ? "Ask by voice (Web Speech API)" : "Voice input unsupported here — typing works"}
        >
          {recording ? "⏹" : "🎙"}
        </button>
        <button type="submit" className="wg-btn" disabled={busy || !draft.trim()} aria-label="Send question">
          Send
        </button>
      </form>
      {!support.stt && (
        <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)", margin: 0 }}>
          Voice input needs a supporting browser (Chrome/Edge). Typed questions work everywhere.
        </p>
      )}
    </section>
  );
}
