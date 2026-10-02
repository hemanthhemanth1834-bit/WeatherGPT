import React, { useEffect, useState } from "react";
import { fetchEngineStatus, fetchProvidersHealth } from "../services/api";

const STATUS_ORDER = ["LIVE","OFFICIAL","COMPUTED","FALLBACK","ESTIMATED","SIMULATED","DEMO","STATIC","NOT_CONFIGURED"];
const TONE = { LIVE:"live", OFFICIAL:"live", COMPUTED:"estimated", FALLBACK:"estimated", ESTIMATED:"estimated", SIMULATED:"demo", DEMO:"demo", STATIC:"static", NOT_CONFIGURED:"off" };

function statusLabel(value) {
  if (!value) return "UNKNOWN";
  return String(value).replaceAll("_"," ");
}

export default function CapabilitiesHub({ onOpen }) {
  const [providers, setProviders] = useState(null);
  const [engine, setEngine] = useState(null);
  const [diagnosticState, setDiagnosticState] = useState("idle");
  const [diagnosticTime, setDiagnosticTime] = useState(null);

  const runDiagnostics = async () => {
    setDiagnosticState("running");
    const [p, e] = await Promise.allSettled([fetchProvidersHealth(true), fetchEngineStatus()]);
    if (p.status === "fulfilled") setProviders(p.value);
    if (e.status === "fulfilled") setEngine(e.value);
    setDiagnosticTime(new Date());
    setDiagnosticState(p.status === "fulfilled" || e.status === "fulfilled" ? "ready" : "error");
  };

  useEffect(() => { runDiagnostics(); }, []);

  const providerRows = providers?.providers || [];
  const liveProviderCount = providerRows.filter((p) => ["LIVE", "AVAILABLE"].includes(p.status)).length;
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
          <span>Local User Data</span>
          <strong>PROTECTED</strong>
          <small>Password-protected profile and browser preferences</small>
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




    </section>
  );
}
