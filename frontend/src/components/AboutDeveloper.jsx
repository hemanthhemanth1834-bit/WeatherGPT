import React from "react";
import { User, GraduationCap, Trophy, ExternalLink } from "lucide-react";

export default function AboutDeveloper() {
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-5 animate-fadeIn">
      <div className="glass-card p-6 border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900/90 to-slate-900/90">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
          <Trophy size={14} /> Smart India Hackathon 2026 (SIH 2026)
        </div>
        <h2 className="text-2xl font-black text-white">WeatherGPT — AI Weather Intelligence</h2>
        <p className="text-xs text-slate-400 mt-1">
          AI-powered conversational weather intelligence and decision-support platform · AI / ML / Weather
          Intelligence / Disaster Decision Support
        </p>
      </div>

      <div className="glass-card p-6 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-3">
          <User size={15} className="text-sky-400" /> Developer
        </div>
        <div className="text-sm text-slate-200 font-bold">Muchakarla Hemanth Kumar</div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <GraduationCap size={13} /> B.Tech CSE – AI/ML · SRK Institute of Technology (SRKIT) · 2024–2028
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href="https://github.com/hemanthhemanth1834-bit"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
          >
            <ExternalLink size={13} /> github.com/hemanthhemanth1834-bit
          </a>
          <a
            href="https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
          >
            <ExternalLink size={13} /> LinkedIn — Hemanth Kumar Muchakarla
          </a>
        </div>
      </div>

      <div className="glass-card p-6 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <div className="font-bold text-slate-200 mb-1">What this build adds over the downloaded open-source base</div>
        <ul className="list-disc ml-5 space-y-1">
          <li>Deterministic risk engine (LOW / MODERATE / HIGH / EXTREME) with documented thresholds.</li>
          <li>NWP integration interface (GFS LIVE via Open-Meteo; WRF NOT CONFIGURED) with GRIB/NetCDF-ready architecture.</li>
          <li>Satellite information module (NASA GIBS live links; MOSDAC NOT CONFIGURED) — never presenting static images as live.</li>
          <li>Indian sources registry (IMD / MOSDAC / INCOIS / Open-Meteo) with honest status labels.</li>
          <li>Explicit AI agent tool registry; LLM never invents numerical weather values.</li>
          <li>Source transparency badges (LIVE / DEMO / SIMULATED / STATIC / NOT CONFIGURED) across dashboard, map and alerts.</li>
          <li>In-memory caching, env-based config (.env.example), and backend tests.</li>
        </ul>
      </div>
    </div>
  );
}
