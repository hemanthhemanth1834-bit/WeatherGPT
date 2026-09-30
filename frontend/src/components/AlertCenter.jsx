import React, { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, Radio, Bell, Volume2, MapPin, CheckCircle, ExternalLink } from "lucide-react";
import { fetchActiveAlerts } from "../services/api";
import { speechEngine } from "../services/voice";

const SEVERITIES = ["All", "Red", "Orange", "Yellow"];

export default function AlertCenter({ onAskAI, onFocusMapZone }) {
  const [alerts, setAlerts] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [speakingId, setSpeakingId] = useState(null);

  const loadAlerts = async (sev) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchActiveAlerts(sev === "All" ? null : sev);
      setAlerts(data);
    } catch (e) {
      console.error(e);
      setLoadError("Alert feed unavailable — backend unreachable or request timed out. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(selectedSeverity);
  }, [selectedSeverity]);

  const handleAudioBroadcast = (alert) => {
    if (speakingId === alert.id) {
      speechEngine.stopSpeaking();
      setSpeakingId(null);
    } else {
      const text = `आपातकालीन मौसम चेतावनी: ${alert.headline}। प्रभावित क्षेत्र: ${alert.area_desc}। निर्देश: ${alert.instruction}`;
      speechEngine.speak(text, "hi", () => setSpeakingId(null));
      setSpeakingId(alert.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-5 animate-fadeIn">
      {/* Alert Header Banner */}
      <div className="glass-card p-6 border border-red-500/40 bg-gradient-to-r from-red-950/60 via-slate-900/90 to-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 animate-pulse border border-red-500/30">
              <ShieldAlert size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white font-heading">
                  ITU CAP v1.2 Early Warning & Disaster Hub
                </h2>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-mono font-extrabold border border-red-500/40">
                  WIS2.0 ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Standardized disaster warning feeds for NDRF, SDMA, and District Emergency Cells.
              </p>
            </div>
          </div>

          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
                  selectedSeverity === sev
                    ? (sev === "Red" ? "bg-red-600 text-white shadow-md shadow-red-600/30" : (sev === "Orange" ? "bg-orange-600 text-white shadow-md shadow-orange-600/30" : (sev === "Yellow" ? "bg-yellow-600 text-white shadow-md shadow-yellow-600/30" : "bg-sky-600 text-white shadow-md shadow-sky-600/30")))
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {sev} Alerts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Grid */}
      {loadError && (
        <div role="alert" className="p-3.5 rounded-2xl border border-red-500/40 bg-red-950/40 text-xs text-red-200">
          ⚠️ {loadError}
        </div>
      )}
      {/* Application-generated estimates, not official bulletins */}
      <p className="text-[10px] font-mono text-slate-500 px-1">
        COMPUTED from live telemetry against documented thresholds — not official IMD bulletins. Always follow IMD / NDMA / local authorities.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alt) => {
          const isRed = alt.severity === "Red";
          const isOrange = alt.severity === "Orange";
          const borderClass = isRed ? "border-red-500/50 bg-red-950/20" : (isOrange ? "border-orange-500/40 bg-orange-950/15" : "border-yellow-500/30 bg-yellow-950/10");
          const badgeClass = isRed ? "bg-red-500/25 text-red-200 border-red-500/40" : (isOrange ? "bg-orange-500/25 text-orange-200 border-orange-500/40" : "bg-yellow-500/25 text-yellow-200 border-yellow-500/40");

          return (
            <div
              key={alt.id}
              className={`glass-card p-5 border rounded-2xl space-y-3 transition-all hover:scale-[1.01] ${borderClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border font-mono ${badgeClass}`}>
                    {alt.severity} Alert
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {alt.id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Urgency: <strong className="text-slate-200">{alt.urgency}</strong></span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {alt.headline}
              </h3>

              <div className="text-xs text-slate-300 flex items-start gap-1.5">
                <MapPin size={14} className="text-sky-400 flex-shrink-0 mt-0.5" />
                <span><strong>Impact Zone:</strong> {alt.area_desc}</span>
              </div>

              {/* Recommended action box (application-generated estimate, not an official bulletin) */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <strong className="text-sky-400">Recommended action:</strong> {alt.instruction}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-400 text-[10px] font-medium">
                  Sender: {alt.sender_name}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAudioBroadcast(alt)}
                    className="btn-secondary text-xs px-2.5 py-1"
                  >
                    <Volume2 size={13} className="text-red-400" />
                    <span>{speakingId === alt.id ? "Stop Audio" : "Voice Broadcast"}</span>
                  </button>

                  <button
                    onClick={() => onAskAI?.(`What is the emergency response protocol for ${alt.event} in ${alt.district}?`)}
                    className="btn-primary text-xs px-2.5 py-1"
                  >
                    AI Action Plan →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
