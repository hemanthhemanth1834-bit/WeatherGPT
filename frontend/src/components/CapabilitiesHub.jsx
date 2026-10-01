import React, { useMemo, useState } from "react";
import { CAPABILITIES } from "../services/capabilityRegistry.generated";

const STATUS_ORDER = ["LIVE", "OFFICIAL", "COMPUTED", "FALLBACK", "ESTIMATED", "SIMULATED", "DEMO", "STATIC", "NOT_CONFIGURED"];
const TONE = { LIVE: "live", OFFICIAL: "live", COMPUTED: "estimated", FALLBACK: "estimated", ESTIMATED: "estimated", SIMULATED: "demo", DEMO: "demo", STATIC: "static", NOT_CONFIGURED: "off" };

export default function CapabilitiesHub({ onOpen }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [statuses, setStatuses] = useState([]);

  const categories = useMemo(() => ["All", ...new Set(CAPABILITIES.map((c) => c.category))], []);
  const counts = useMemo(() => {
    const live = CAPABILITIES.filter((c) => ["LIVE", "OFFICIAL", "COMPUTED"].includes(c.status)).length;
    return { total: CAPABILITIES.length, reachable: CAPABILITIES.filter((c) => c.tab).length, live };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAPABILITIES.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (statuses.length > 0 && !statuses.includes(c.status)) return false;
      if (!q) return true;
      return `${c.id} ${c.name} ${c.category} ${c.source} ${c.provider}`.toLowerCase().includes(q);
    });
  }, [query, category, statuses]);

  const toggleStatus = (s) => setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const grouped = useMemo(() => {
    const map = new Map();
    shown.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category).push(c);
    });
    return [...map.entries()];
  }, [shown]);

  return (
    <section aria-label="All capabilities" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem" }}>🧭 All capabilities</h2>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--wg-muted)" }}>
          Every tracked capability: <strong>{counts.total}</strong> mapped ·{" "}
          <strong>{counts.reachable}</strong> open directly in the app ·{" "}
          <strong>{counts.live}</strong> live/computed/official. The rest show
          their honest status and reason instead of disappearing.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.7rem" }}>
          <input className="wg-input" style={{ flex: "1 1 12rem" }} type="search"
            aria-label="Search all capabilities" placeholder="Search flood, WRF, aviation, CAP, solar…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="wg-input" style={{ width: "auto" }} value={category}
            onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.6rem" }} role="group" aria-label="Filter by status">
          {STATUS_ORDER.map((s) => (
            <button key={s} className="wg-tab" aria-selected={statuses.includes(s)} onClick={() => toggleStatus(s)}>
              {s}
            </button>
          ))}
          {statuses.length > 0 && (
            <button className="wg-btn-ghost" style={{ fontSize: "0.72rem" }} onClick={() => setStatuses([])}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="wg-alert info" role="status">No capabilities match these filters.</div>
      )}
      {grouped.map(([cat, items]) => (
        <div key={cat} className="wg-card" style={{ padding: "0.9rem 1.1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.82rem" }}>{cat} <span style={{ color: "var(--wg-muted)" }}>· {items.length}</span></h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {items.map((c) => (
              <div key={c.id} style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem 0.7rem", alignItems: "center", fontSize: "0.78rem", padding: "0.4rem 0.6rem", background: "rgba(148,163,184,.05)", borderRadius: "0.6rem" }}>
                <span className="wg-mono" style={{ color: "var(--wg-faint)", fontSize: "0.66rem" }}>{c.id}</span>
                <strong style={{ flex: "1 1 10rem" }}>{c.name}</strong>
                <span className={`wg-chip ${TONE[c.status] || "static"}`}>{c.status}</span>
                <span className="wg-mono" style={{ fontSize: "0.64rem", color: "var(--wg-muted)" }}>{c.source}</span>
                {c.tab ? (
                  <button className="wg-btn-ghost" style={{ fontSize: "0.7rem", padding: "0.3rem 0.7rem" }} onClick={() => onOpen(c.tab)}>
                    Open →
                  </button>
                ) : (
                  <span style={{ fontSize: "0.68rem", color: "var(--wg-muted)" }}>{c.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
