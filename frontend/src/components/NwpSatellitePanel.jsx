import React, { useEffect, useState } from "react";
import { Satellite, Layers, Database, Loader2 } from "lucide-react";
import { fetchCurrentWeather, fetchNwpStatus, fetchSatelliteInfo, fetchIndianSources } from "../services/api";
import SourceBadge from "./SourceBadge";

export default function NwpSatellitePanel({ location, lat, lon, focus = "nwp" }) {
  const [nwp, setNwp] = useState(null);
  const [sat, setSat] = useState(null);
  const [sources, setSources] = useState(null);
  const [gfs, setGfs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [n, s, src, g] = await Promise.all([
        fetchNwpStatus(),
        fetchSatelliteInfo(lat, lon),
        fetchIndianSources(),
        fetchCurrentWeather(location || "Pune", lat, lon, "gfs").catch(() => null),
      ]);
      setNwp(n);
      setSat(s);
      setSources(src);
      setGfs(g);
      setCheckedAt(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
    } catch {
      setError("NWP / satellite metadata unavailable. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nwpBlock = nwp && (
    <div className="wg-card p-5 border border-slate-800 space-y-2">
      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">NWP integration: {nwp.integration}</h3>
      <SourceBadge source={nwp.gfs?.provider} dataType="Forecast" status={nwp.gfs?.status} />
      <p className="text-xs text-slate-400">{nwp.gfs?.notes}</p>
      <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <span className="font-bold">WRF: {nwp.wrf?.status}</span>
        <span className="text-slate-400"> — {nwp.wrf?.parser_architecture}</span>
      </div>
      <p className="text-[10px] text-slate-500">{nwp.disclaimer}</p>
      {gfs && (
        <div className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <span className="font-bold">GFS now ({gfs.location}): {gfs.current_temp}°C, {gfs.condition}</span>
          <span className="text-slate-400"> — {gfs.nwp_model} · {gfs.updated_at_ist}</span>
        </div>
      )}
    </div>
  );

  const satBlock = sat && (
    <div className="wg-card p-5 border border-slate-800 space-y-2">
      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Satellite size={14} className="text-sky-400" /> Satellite information ({location || "India"})
      </h3>
      <SourceBadge source="NASA GIBS + MOSDAC registry" dataType="STATIC metadata + LIVE external services" status="API-DEPENDENT" />
      {(sat.sources || []).map((s, i) => (
        <div key={i} className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <div className="font-bold text-slate-100">{s.name} — {s.type}</div>
          <div className="text-slate-400 mt-0.5">{s.notes}</div>
          {s.viewer_url && (
            <a href={s.viewer_url} target="_blank" rel="noreferrer" className="text-sky-400 underline">
              Open provider viewer
            </a>
          )}
        </div>
      ))}
      <p className="text-[10px] text-slate-500">{sat.disclaimer}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="wg-card p-6 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-1">
              <Layers size={14} /> NWP · Satellite · Indian sources
            </div>
            <h2 className="text-xl font-black text-white">Model & Observation Provenance</h2>
            <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)", margin: "0.4rem 0 0" }}>
              GFS is LIVE via Open-Meteo. WRF and MOSDAC are NOT CONFIGURED until feeds are provisioned.
              {checkedAt && <> · Last checked (client): <span className="wg-mono">{checkedAt} IST</span></>}
            </p>
          </div>
          <button onClick={load} disabled={loading} className="wg-btn text-xs py-2 px-3.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Load provenance"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {focus === "satellite" ? (
        <>
          {satBlock}
          {nwpBlock}
        </>
      ) : (
        <>
          {nwpBlock}
          {satBlock}
        </>
      )}

      {sources && (
        <div className="wg-card p-5 border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Database size={14} className="text-emerald-400" /> Indian authoritative sources
          </h3>
          {(sources.sources || []).map((s, i) => (
            <div key={i} className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="font-bold text-slate-100">{s.name} — {s.type}</div>
              <div className="text-slate-400 mt-0.5">{s.integration}</div>
              <div className="text-slate-500 font-mono text-[10px]">{s.portal}</div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500">{sources.policy}</p>
        </div>
      )}
    </div>
  );
}
