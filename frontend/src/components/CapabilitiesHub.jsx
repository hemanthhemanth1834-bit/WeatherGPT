import React, { useEffect, useMemo, useState } from "react";
import { fetchEngineStatus, fetchProvidersHealth } from "../services/api";
import { CAPABILITIES } from "../services/capabilityRegistry.generated";

const STATUS_ORDER = ["LIVE","OFFICIAL","COMPUTED","FALLBACK","ESTIMATED","SIMULATED","DEMO","STATIC","NOT_CONFIGURED"];
const TONE = { LIVE:"live", OFFICIAL:"live", COMPUTED:"estimated", FALLBACK:"estimated", ESTIMATED:"estimated", SIMULATED:"demo", DEMO:"demo", STATIC:"static", NOT_CONFIGURED:"off" };

function statusLabel(value) {
  if (!value) return "UNKNOWN";
  return String(value).replaceAll("_"," ");
}

export default function CapabilitiesHub({ onOpen }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [statuses, setStatuses] = useState([]);
  const [providers, setProviders] = useState(null);
  const [engine, setEngine] = useState(null);
  const [diagnosticState, setDiagnosticState] = useState("idle");
  const [diagnosticTime, setDiagnosticTime] = useState(null);

  const categories = useMemo(() => ["All", ...new Set(CAPABILITIES.map((c) => c.category))], []);
  const counts = useMemo(() => ({
    total: CAPABILITIES.length,
    reachable: CAPABILITIES.filter((c) => c.tab).length,
    live: CAPABILITIES.filter((c) => ["LIVE","OFFICIAL","COMPUTED"].includes(c.status)).length
  }), []);

  const runDiagnostics = async () => {
    setDiagnosticState("running");
    const [p, e] = await Promise.allSettled([fetchProvidersHealth(true), fetchEngineStatus()]);
    if (p.status === "fulfilled") setProviders(p.value);
    if (e.status === "fulfilled") setEngine(e.value);
    setDiagnosticTime(new Date());
    setDiagnosticState(p.status === "fulfilled" || e.status === "fulfilled" ? "ready" : "error");
  };

  useEffect(() => { runDiagnostics(); }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAPABILITIES.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (statuses.length && !statuses.includes(c.status)) return false;
      return !q || `${c.id} ${c.name} ${c.category} ${c.source} ${c.provider}`.toLowerCase().includes(q);
    });
  }, [query, category, statuses]);

  const grouped = useMemo(() => {
    const map = new Map();
    shown.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category).push(c);
    });
    return [...map.entries()];
  }, [shown]);

  const providerRows = providers?.providers || [];
  const liveProviderCount = providerRows.filter((p) => ["LIVE","AVAILABLE"].includes(p.status)).length;
  const engineName = engine?.engine || engine?.name || engine?.status || "Tool-grounded weather engine";

  return (
    <section className="wg-admin-page" aria-label="System and Admin">
      <header className="wg-admin-hero wg-card">
        <div>
          <div className="wg-admin-kicker">SYSTEM CONTROL CENTER</div>
          <h1>System Architecture &amp; Admin</h1>
          <p>Live platform diagnostics, provider health, capability status and application storage information.</p>
        </div>
        <button className="wg-admin-diagnostic" onClick={runDiagnostics} disabled={diagnosticState === "running"}>
          ↻ {diagnosticState === "running" ? "Running diagnostics…" : "Run Health Diagnostics"}
        </button>
      </header>

      <div className="wg-admin-status-grid">
        <article className="wg-admin-status-card wg-admin-cyan">
          <span>Backend API</span>
          <strong>{diagnosticState === "running" ? "CHECKING…" : diagnosticState === "error" ? "UNAVAILABLE" : "CONNECTED"}</strong>
          <small>{diagnosticTime ? `Checked ${diagnosticTime.toLocaleTimeString()}` : "Live health check"}</small>
        </article>
        <article className="wg-admin-status-card wg-admin-blue">
          <span>Weather Engine</span>
          <strong>{String(engineName).slice(0, 28)}</strong>
          <small>Tool-grounded status from backend</small>
        </article>
        <article className="wg-admin-status-card wg-admin-green">
          <span>Meteorological Providers</span>
          <strong>{providers ? `${liveProviderCount} LIVE` : "CHECKING…"}</strong>
          <small>{providerRows.length ? `${providerRows.length} providers reported` : "Live provider health"}</small>
        </article>
        <article className="wg-admin-status-card wg-admin-purple">
          <span>Capability Registry</span>
          <strong>{counts.total} MAPPED</strong>
          <small>{counts.reachable} app modules · {counts.live} live/computed/official</small>
        </article>
      </div>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Data Sources &amp; Provider Health</h2>
          <span>{providerRows.length ? "Live probe results" : "Waiting for diagnostics"}</span>
        </div>
        {providerRows.length ? (
          <div className="wg-admin-table">
            {providerRows.map((p) => {
              const tone = TONE[p.status] || "static";
              return <div className="wg-admin-row" key={p.provider}>
                <strong>{p.provider}</strong>
                <span>{p.coverage || "—"}</span>
                <span className={`wg-chip ${tone}`}>{statusLabel(p.status)}</span>
                <span className="wg-mono">{p.latency_ms != null ? `${p.latency_ms} ms` : "—"}</span>
              </div>;
            })}
          </div>
        ) : <div className="wg-admin-empty">Run diagnostics to inspect connected providers.</div>}
      </section>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Application Data &amp; Local Storage</h2>
          <span>Privacy-aware</span>
        </div>
        <div className="wg-admin-collections">
          <div><strong>Encrypted user profile</strong><span>Password-protected profile stored locally in the user's browser.</span><b>LOCAL</b></div>
          <div><strong>Weather cache</strong><span>Runtime weather responses may be cached by the application for performance.</span><b>RUNTIME</b></div>
          <div><strong>Capability registry</strong><span>{counts.total} tracked capabilities with source and status metadata.</span><b>SYNCED</b></div>
          <div><strong>Browser preferences</strong><span>Theme, language and notification preferences are controlled by the client.</span><b>LOCAL</b></div>
        </div>
      </section>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Platform Diagnostics</h2>
          <span>Read-only operational checks</span>
        </div>
        <div className="wg-admin-actions">
          <button className="wg-admin-action" onClick={runDiagnostics}>↻ Refresh provider health</button>
          <button className="wg-admin-action" onClick={() => onOpen?.("capabilities")}>⌘ Open capability registry</button>
          <button className="wg-admin-action" onClick={() => onOpen?.("alerts")}>⚠ Open alert center</button>
        </div>
      </section>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Capability Registry</h2>
          <span>{shown.length} results</span>
        </div>
        <div className="wg-admin-filters">
          <input className="wg-input" type="search" placeholder="Search capabilities, providers, weather tools…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="wg-input" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="wg-admin-status-filters">
          {STATUS_ORDER.map((s) => <button key={s} className="wg-tab" aria-selected={statuses.includes(s)} onClick={() => setStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev,s])}>{s}</button>)}
          {statuses.length > 0 && <button className="wg-btn-ghost" onClick={() => setStatuses([])}>Clear filters</button>}
        </div>
        {grouped.map(([cat, items]) => (
          <div className="wg-admin-cap-group" key={cat}>
            <h3>{cat} <small>· {items.length}</small></h3>
            {items.map((item) => <div className="wg-admin-cap-row" key={item.id}>
              <span className="wg-mono">{item.id}</span><strong>{item.name}</strong><span className={`wg-chip ${TONE[item.status] || "static"}`}>{item.status}</span><span>{item.source}</span>
              {item.tab && <button className="wg-btn-ghost" onClick={() => onOpen(item.tab)}>Open →</button>}
            </div>)}
          </div>
        ))}
      </section>
    </section>
  );
}
