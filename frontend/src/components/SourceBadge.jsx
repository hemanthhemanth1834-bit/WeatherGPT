import React from "react";

/** Source transparency badge: every important weather result identifies its source. */
export default function SourceBadge({ source, updated, dataType, status }) {
  const statusColor =
    status === "LIVE"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
      : status === "DEMO"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
      : status === "SIMULATED"
      ? "bg-orange-500/15 text-orange-300 border-orange-500/40"
      : status === "STATIC"
      ? "bg-slate-500/15 text-slate-300 border-slate-500/40"
      : status === "NOT CONFIGURED"
      ? "bg-red-500/15 text-red-300 border-red-500/40"
      : "bg-sky-500/15 text-sky-300 border-sky-500/40";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
      <span className="text-slate-400">
        DATA SOURCE: <span className="text-slate-200 font-bold">{source || "Open-Meteo"}</span>
      </span>
      {updated && (
        <span className="text-slate-400">
          UPDATED: <span className="text-slate-200 font-bold">{updated}</span>
        </span>
      )}
      {dataType && (
        <span className="text-slate-400">
          TYPE: <span className="text-slate-200 font-bold">{dataType}</span>
        </span>
      )}
      {status && (
        <span className={`px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>
          STATUS: {status}
        </span>
      )}
    </div>
  );
}
