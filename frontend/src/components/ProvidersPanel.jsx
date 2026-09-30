import React, { useEffect, useState } from "react";
import { fetchProvidersHealth } from "../services/api";

const TONE = { LIVE: "live", AVAILABLE: "live", FALLBACK: "estimated", ESTIMATED: "estimated", STATIC: "static", DEMO: "demo", NOT_CONFIGURED: "off", ERROR: "off" };

export default function ProvidersPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProvidersHealth(true)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError("Provider health check failed — showing nothing rather than guessing."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wg-card" style={{ padding: "0.9rem 1rem" }}>
      <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.82rem" }}>🔌 Provider health <span style={{ color: "var(--wg-muted)", fontWeight: 500 }}>(probed live now)</span></h3>
      {error && <div className="wg-alert error" role="alert">{error}</div>}
      {!data && !error && <div className="wg-shimmer" role="status" aria-label="Checking providers" />}
      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {data.providers.map((p) => (
            <div key={p.provider} style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.8rem", alignItems: "center", fontSize: "0.76rem", padding: "0.4rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
              <strong style={{ minWidth: "11rem" }}>{p.provider}</strong>
              <span className={`wg-chip ${TONE[p.status] || "static"}`}>{p.status}</span>
              <span className="wg-mono" style={{ color: "var(--wg-muted)", fontSize: "0.66rem" }}>
                {p.latency_ms != null ? `${p.latency_ms} ms` : "—"} · {p.coverage}
              </span>
            </div>
          ))}
          <p style={{ fontSize: "0.68rem", color: "var(--wg-muted)", margin: "0.2rem 0 0" }}>{data.policy}</p>
        </div>
      )}
    </div>
  );
}
