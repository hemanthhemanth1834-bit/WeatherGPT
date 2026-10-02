import React, { useEffect, useState } from "react";
import { fetchEngineStatus, fetchProvidersHealth } from "../services/api";

const TONE = { LIVE:"live", AVAILABLE:"live", OFFICIAL:"live", COMPUTED:"estimated", FALLBACK:"estimated", ESTIMATED:"estimated", STATIC:"static", DEMO:"demo", NOT_CONFIGURED:"off", ERROR:"off" };

export default function CapabilitiesHub() {
  const [providers, setProviders] = useState(null);
  const [engine, setEngine] = useState(null);
  const [state, setState] = useState("checking");
  const [checkedAt, setCheckedAt] = useState(null);

  const runDiagnostics = async () => {
    setState("checking");
    const [p, e] = await Promise.allSettled([fetchProvidersHealth(true), fetchEngineStatus()]);
    if (p.status === "fulfilled") setProviders(p.value);
    if (e.status === "fulfilled") setEngine(e.value);
    setCheckedAt(new Date());
    setState(p.status === "fulfilled" && e.status === "fulfilled" ? "ready" : "partial");
  };

  useEffect(() => { runDiagnostics(); }, []);

  const rows = providers?.providers || [];
  const liveCount = rows.filter((p) => ["LIVE", "AVAILABLE"].includes(p.status)).length;
  const engineName = engine?.engine || engine?.name || engine?.status || "Tool-grounded weather engine";

  return (
    <section className="wg-admin-page" aria-label="System and Admin">
      <header className="wg-admin-hero wg-card">
        <div>
          <div className="wg-admin-kicker">SYSTEM CONTROL CENTER</div>
          <h1>System &amp; Admin</h1>
          <p>Live health, weather-provider status and local privacy information.</p>
        </div>
        <button className="wg-admin-diagnostic" onClick={runDiagnostics} disabled={state === "checking"}>
          ↻ {state === "checking" ? "Checking…" : "Run Health Diagnostics"}
        </button>
      </header>

      <div className="wg-admin-status-grid">
        <article className="wg-admin-status-card wg-admin-cyan">
          <span>Backend API</span>
          <strong>{state === "checking" ? "CHECKING" : state === "partial" ? "PARTIAL" : "CONNECTED"}</strong>
          <small>{checkedAt ? `Checked ${checkedAt.toLocaleTimeString()}` : "Live health check"}</small>
        </article>
        <article className="wg-admin-status-card wg-admin-blue">
          <span>Weather Engine</span>
          <strong>{String(engineName).slice(0, 30)}</strong>
          <small>Current backend engine status</small>
        </article>
        <article className="wg-admin-status-card wg-admin-green">
          <span>Weather Providers</span>
          <strong>{providers ? `${liveCount} LIVE` : "CHECKING"}</strong>
          <small>{rows.length ? `${rows.length} providers checked` : "Live provider health"}</small>
        </article>
        <article className="wg-admin-status-card wg-admin-purple">
          <span>User Data</span>
          <strong>PROTECTED</strong>
          <small>Password-protected local profile</small>
        </article>
      </div>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Weather Provider Health</h2>
          <span>{rows.length ? "Live results" : "No results yet"}</span>
        </div>
        {rows.length ? (
          <div className="wg-admin-table">
            {rows.map((p) => (
              <div className="wg-admin-row" key={p.provider}>
                <strong>{p.provider}</strong>
                <span>{p.coverage || "Coverage not reported"}</span>
                <span className={`wg-chip ${TONE[p.status] || "static"}`}>{p.status || "UNKNOWN"}</span>
                <span className="wg-mono">{p.latency_ms != null ? `${p.latency_ms} ms` : "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="wg-admin-empty">Provider health results will appear after the diagnostic check.</div>
        )}
      </section>

      <section className="wg-admin-panel wg-card">
        <div className="wg-admin-panel-head">
          <h2>Privacy &amp; Local Storage</h2>
          <span>On this device</span>
        </div>
        <div className="wg-admin-collections">
          <div><strong>Private profile</strong><span>Password-protected profile is encrypted before local storage.</span><b>PROTECTED</b></div>
          <div><strong>Browser preferences</strong><span>Theme, language and notification settings remain on the device.</span><b>LOCAL</b></div>
        </div>
      </section>
    </section>
  );
}
