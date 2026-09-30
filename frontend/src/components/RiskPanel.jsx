import React, { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { fetchRiskAssessment } from "../services/api";
import SourceBadge from "./SourceBadge";

const LEVEL_STYLES = {
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  MODERATE: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  EXTREME: "bg-red-500/15 text-red-300 border-red-500/40",
};

export default function RiskPanel({ location }) {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRiskAssessment(location || "Pune");
      setRisk(data);
    } catch (e) {
      setError("Risk engine unavailable. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wg-card p-5 border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert size={14} className="text-amber-400" />
          Deterministic Risk Engine (ESTIMATED — not an official warning)
        </h3>
        <button onClick={load} disabled={loading} className="wg-btn text-xs py-1.5 px-3">
          {loading ? <Loader2 size={13} className="animate-spin" /> : "Assess risk"}
        </button>
      </div>
      <SourceBadge source="WeatherGPT Risk Engine v1 (local)" dataType="ESTIMATED" status="SIMULATED" />
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!risk && !loading && !error && (
        <p className="text-xs text-slate-400">
          Computes LOW / MODERATE / HIGH / EXTREME for heat, rainfall, flood, wind, thunderstorm and cyclone
          from documented thresholds. Always follow IMD / NDMA / local authority instructions.
        </p>
      )}
      {risk && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Overall for {risk.location}:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${LEVEL_STYLES[risk.overall]}`}>
              {risk.overall}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(risk.levels || {}).map(([k, v]) => (
              <div key={k} className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
                <div className="text-slate-400 uppercase font-bold text-[10px]">{k}</div>
                <div className={`inline-block mt-1 px-2 py-0.5 rounded-full font-extrabold border ${LEVEL_STYLES[v]}`}>{v}</div>
              </div>
            ))}
          </div>
          {(risk.advisories || []).map((a, i) => (
            <p key={i} className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">{a}</p>
          ))}
          <p className="text-[10px] text-slate-500">{risk.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
