import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchActiveAlerts, fetchImdWarnings, fetchIndiaAlerts } from "../services/api";
import { speechEngine } from "../services/voice";
import EmergencyContacts from "./EmergencyContacts";
import SafetyMap from "./SafetyMap";
import "./SafetyCenter.css";

const CACHE_KEY = "weathergpt.safety.alerts.v1";
const READ_KEY = "weathergpt.readAlerts";
const MUTE_KEY = "weathergpt.alertNotificationsMuted";
const NOTIFIED_KEY = "weathergpt.lastSafetyNotification";
const SEVERITIES = ["All", "Red", "Orange", "Yellow", "Official"];
const HAZARDS = [
  ["all", "All hazards"],
  ["flood", "Rain & flood"],
  ["storm", "Storm & lightning"],
  ["heat", "Heat"],
  ["cyclone", "Cyclone & coastal"],
  ["other", "Other"],
];

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const parsed = new Date(text.includes("T") ? text : text.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "time not provided";
}

function ageLabel(value) {
  const date = parseDate(value);
  if (!date) return "no successful refresh";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

function hash(value) {
  let code = 0;
  for (let i = 0; i < String(value).length; i += 1) {
    code = (code * 31 + String(value).charCodeAt(i)) >>> 0;
  }
  return code.toString(36);
}

function inferHazard(text) {
  const hay = String(text || "").toLowerCase();
  if (/flood|rain|inundat|waterlog|cloudburst/.test(hay)) return "flood";
  if (/cyclone|depression|coastal|surge|tsunami|sea|wave/.test(hay)) return "cyclone";
  if (/lightning|thunder|storm|squall|wind|hail|tornado/.test(hay)) return "storm";
  if (/heat|temperature|hot|warm/.test(hay)) return "heat";
  return "other";
}

function hazardLabel(hazard) {
  return { flood: "Rain & flood", storm: "Storm & lightning", heat: "Heat", cyclone: "Cyclone & coastal", other: "Other" }[hazard] || "Other";
}

function statusOf(item) {
  const hay = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (/\bcancel(?:led|ed)?\b|\bwithdrawn\b/.test(hay)) return "cancelled";
  const expires = parseDate(item.expires);
  if (expires && expires.getTime() < Date.now()) return "expired";
  const issued = parseDate(item.issued);
  const updated = parseDate(item.updated);
  if (issued && updated && updated.getTime() - issued.getTime() > 60 * 1000) return "updated";
  return "active";
}

function severityTone(severity) {
  if (severity === "Red") return "red";
  if (severity === "Orange") return "orange";
  if (severity === "Yellow") return "yellow";
  return "official";
}

function readCache() {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function normalizeComputed(alert) {
  const lat = Number(alert.lat);
  const lon = Number(alert.lon);
  return {
    id: alert.id || `computed-${hash(alert.headline || alert.event)}`,
    kind: "computed",
    title: alert.headline || alert.event || "Computed weather alert",
    description: alert.instruction || alert.description || "No instruction was supplied by the computed source.",
    event: alert.event || "Weather",
    severity: alert.severity || "Yellow",
    source: alert.sender_name || "WeatherGPT computed telemetry",
    sourceType: "COMPUTED / UNOFFICIAL",
    official: false,
    issued: alert.effective || alert.issued || alert.updated_at || null,
    updated: alert.updated_at || alert.effective || null,
    expires: alert.expires || null,
    area: alert.area_desc || alert.district || "Area not stated",
    district: alert.district || "",
    state: alert.state || "",
    distanceKm:
      alert.distance_km != null && Number.isFinite(Number(alert.distance_km))
        ? Number(alert.distance_km)
        : null,
    scope: alert.scope || "UNKNOWN",
    link: null,
    geometry: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null,
    hazard: inferHazard(`${alert.event} ${alert.headline} ${alert.instruction}`),
  };
}

function normalizeIndia(item) {
  const lat = Number(item.geometry?.lat ?? item.lat);
  const lon = Number(item.geometry?.lon ?? item.lon);
  const title = item.headline || item.title || item.event || "Warning";
  return {
    id: item.id || `india-${hash(`${title}-${item.issued_at || item.issued || ""}`)}`,
    kind: item.official ? "official" : "third-party",
    title,
    description: item.instruction || item.description || "No source instruction was supplied.",
    event: item.event || item.title || "Hazard",
    severity: item.severity || null,
    source: item.source || item.sender_name || "Third-party source",
    sourceType: item.source_type || (item.official ? "OFFICIAL THIRD-PARTY" : "THIRD-PARTY"),
    official: Boolean(item.official),
    issued: item.issued_at || item.issued || null,
    updated: item.updated_at || item.updated || null,
    expires: item.expires_at || item.expires || null,
    area: item.area_desc || item.district || item.region || "Area not stated",
    district: item.district || "",
    state: item.state || "",
    link: item.report_url || item.link || null,
    geometry: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null,
    hazard: inferHazard(`${item.event} ${title} ${item.description}`),
  };
}

function normalizeImd(item) {
  const title = item.title || "IMD district nowcast";
  return {
    id: `imd-${hash(`${title}-${item.published || ""}`)}`,
    kind: "official",
    title,
    description: item.description || "No description was supplied by the official feed.",
    event: "Official nowcast",
    severity: null,
    source: item.source || "India Meteorological Department",
    sourceType: "OFFICIAL",
    official: true,
    issued: item.published || null,
    updated: null,
    expires: null,
    area: "District nowcast — see original bulletin for exact district",
    district: "",
    state: "",
    link: item.link || null,
    geometry: null,
    hazard: inferHazard(`${title} ${item.description}`),
    officialFeed: true,
  };
}

function dedupe(items) {
  const seen = new Set();
  return [...items]
    .sort((a, b) => (parseDate(b.issued)?.getTime() || 0) - (parseDate(a.issued)?.getTime() || 0))
    .filter((item) => {
      const key = item.kind === "official" ? `official:${item.title.toLowerCase()}` : item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sourceLabel(item) {
  if (item.kind === "computed") return "COMPUTED";
  if (item.kind === "third-party") return "THIRD-PARTY";
  return "OFFICIAL";
}

export default function AlertCenter({ onAsk, weather, selectedPlace = "", onTab }) {
  const locationName = weather?.location || selectedPlace || "not selected";
  const [computed, setComputed] = useState([]);
  const [india, setIndia] = useState([]);
  const [imd, setImd] = useState(null);
  const [busy, setBusy] = useState(true);
  const [sourceErrors, setSourceErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [stale, setStale] = useState(false);
  const [cacheUsed, setCacheUsed] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [hazardFilter, setHazardFilter] = useState("all");
  const [showRecent, setShowRecent] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [voicing, setVoicing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const load = useCallback(async () => {
    setBusy(true);
    setSourceErrors({});
    const cached = readCache();
    const results = await Promise.allSettled([
      fetchActiveAlerts({
        lat: weather?.lat,
        lon: weather?.lon,
        radiusKm: 300,
      }),
      fetchImdWarnings(30),
      fetchIndiaAlerts(weather?.state || null),
    ]);
    const nextErrors = {};
    const [computedResult, imdResult, indiaResult] = results;

    const computedData =
      computedResult.status === "fulfilled" && Array.isArray(computedResult.value)
        ? computedResult.value.map(normalizeComputed)
        : null;
    const imdValue = imdResult.status === "fulfilled" ? imdResult.value : null;
    if (imdResult.status === "rejected" || imdValue?.status === "UNAVAILABLE") {
      nextErrors.imd = imdValue?.error || imdResult.reason?.message || "Official IMD feed unavailable";
    }
    const imdData =
      imdValue?.status === "LIVE" && Array.isArray(imdValue.items)
        ? imdValue.items.map(normalizeImd)
        : null;

    const indiaData =
      indiaResult.status === "fulfilled" && Array.isArray(indiaResult.value?.items)
        ? indiaResult.value.items.map(normalizeIndia)
        : null;
    if (indiaResult.status === "rejected") {
      nextErrors.india = indiaResult.reason?.message || "India fused layer unavailable";
    }
    if (computedResult.status === "rejected") {
      nextErrors.computed = computedResult.reason?.message || "Computed alert feed unavailable";
    }

    const useCache = computedData === null || imdData === null || indiaData === null;
    const fallbackComputed = computedData ?? (Array.isArray(cached?.computed) ? cached.computed : []);
    const fallbackImd = imdData ?? (Array.isArray(cached?.imd) ? cached.imd : []);
    const fallbackIndia = indiaData ?? (Array.isArray(cached?.india) ? cached.india : []);
    const anySuccess = Boolean(computedData || imdData || indiaData);

    setComputed(fallbackComputed);
    setImd({ items: fallbackImd, status: imdValue?.status || (fallbackImd.length ? "CACHED" : "UNAVAILABLE") });
    setIndia(fallbackIndia);
    setSourceErrors(nextErrors);
    setCacheUsed(useCache && Boolean(cached));
    setStale(Object.keys(nextErrors).length > 0);
    setLastRefresh(anySuccess ? new Date().toISOString() : cached?.savedAt || null);
    if (anySuccess) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            computed: fallbackComputed,
            imd: fallbackImd,
            india: fallbackIndia,
          })
        );
      } catch {
        /* storage can be unavailable */
      }
    }
    setBusy(false);
  }, [weather?.state, weather?.lat, weather?.lon]);

  useEffect(() => {
    load();
  }, [load]);

  const allItems = useMemo(() => dedupe([...(imd?.items || []), ...india, ...computed]), [imd, india, computed]);
  const officialItems = useMemo(() => allItems.filter((item) => item.kind === "official"), [allItems]);
  const thirdPartyItems = useMemo(() => allItems.filter((item) => item.kind === "third-party"), [allItems]);
  const computedItems = useMemo(() => allItems.filter((item) => item.kind === "computed"), [allItems]);
  const activeItems = useMemo(() => allItems.filter((item) => ["active", "updated"].includes(statusOf(item))), [allItems]);
  const recentItems = useMemo(() => allItems.filter((item) => ["expired", "cancelled"].includes(statusOf(item))), [allItems]);
  const highCount = activeItems.filter((item) => ["Red", "Orange"].includes(item.severity)).length;

  const applyFilters = useCallback(
    (items) =>
      items.filter((item) => {
        const status = statusOf(item);
        if (!["active", "updated"].includes(status)) return false;
        if (severityFilter === "Official" && item.kind !== "official") return false;
        if (severityFilter !== "All" && severityFilter !== "Official" && item.severity !== severityFilter) return false;
        if (hazardFilter !== "all" && item.hazard !== hazardFilter) return false;
        return true;
      }),
    [severityFilter, hazardFilter]
  );

  const filteredOfficial = useMemo(() => applyFilters(officialItems), [applyFilters, officialItems]);
  const filteredThirdParty = useMemo(() => applyFilters(thirdPartyItems), [applyFilters, thirdPartyItems]);
  const filteredComputed = useMemo(() => applyFilters(computedItems), [applyFilters, computedItems]);
  const filteredRecent = useMemo(() => (showRecent ? recentItems : []), [recentItems, showRecent]);

  const sourceErrorText = Object.entries(sourceErrors)
    .map(([source, message]) => `${source}: ${message}`)
    .join(" · ");

  const markRead = (id) => {
    setReadIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((previous) => {
      const next = new Set(previous);
      allItems.forEach((item) => next.add(item.id));
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const clearRead = () => {
    setReadIds(new Set());
    try {
      localStorage.setItem(READ_KEY, "[]");
    } catch {
      /* ignore */
    }
  };

  const toggleMute = () => {
    setMuted((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const notifyLatest = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSourceErrors((previous) => ({ ...previous, notifications: "Browser notifications are not supported here." }));
      return;
    }
    if (muted) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setSourceErrors((previous) => ({ ...previous, notifications: "Notification permission was not granted." }));
      return;
    }
    const newest = activeItems.find((item) => !readIds.has(item.id));
    if (!newest) return;
    try {
      if (localStorage.getItem(NOTIFIED_KEY) === newest.id) return;
      new Notification(`WeatherGPT safety: ${newest.severity || "official"}`, {
        body: `${newest.title} — ${newest.source}. This is not an official emergency broadcast.`,
      });
      localStorage.setItem(NOTIFIED_KEY, newest.id);
    } catch {
      /* browser policy */
    }
  };

  const broadcast = (item) => {
    if (voicing === item.id) {
      speechEngine.stopSpeaking();
      setVoicing(null);
      return;
    }
    speechEngine.speak(`${item.title}. ${item.description}`, "hi", () => setVoicing(null));
    setVoicing(item.id);
  };

  const renderAlert = (item) => {
    const status = statusOf(item);
    const isRead = readIds.has(item.id);
    const canAsk = typeof onAsk === "function";
    return (
      <article key={item.id} className={`wg-safety-alert sev-${severityTone(item.severity)} ${status !== "active" && status !== "updated" ? "expired" : ""}`}>
        <div className="wg-safety-alert-head">
          <span className={`wg-safety-badge ${item.kind === "computed" ? "computed" : item.kind === "third-party" ? "third-party" : "official"}`}>
            {sourceLabel(item)}
          </span>
          {item.severity ? (
            <span className={`wg-safety-chip ${severityTone(item.severity)}`}>{item.severity}</span>
          ) : (
            <span className="wg-safety-chip official">SOURCE SEVERITY NOT STATED</span>
          )}
          <span className={`wg-safety-chip ${status === "expired" || status === "cancelled" ? "unavailable" : "live"}`}>{status.toUpperCase()}</span>
          {item.hazard ? <span className="wg-safety-chip">{hazardLabel(item.hazard)}</span> : null}
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="wg-safety-meta">
          <span>Source: {item.source}</span>
          <span>Issued: {formatTime(item.issued)}</span>
          {item.updated ? <span>Updated: {formatTime(item.updated)}</span> : null}
          {item.expires ? <span>Expires: {formatTime(item.expires)}</span> : <span>Expiry: not supplied</span>}
          {item.area ? <span>Area: {item.area}</span> : null}
          {item.distanceKm != null ? (
            <span>
              Distance: {item.distanceKm} km from selected location · {item.scope} scope
            </span>
          ) : null}
        </div>
        <div className="wg-safety-actions">
          <button type="button" className="wg-safety-btn" onClick={() => broadcast(item)}>
            {voicing === item.id ? "Stop audio" : "Read aloud"}
          </button>
          <button type="button" className="wg-safety-btn" onClick={() => markRead(item.id)} disabled={isRead}>
            {isRead ? "Read" : "Mark read"}
          </button>
          <button type="button" className="wg-safety-btn" onClick={() => setDetailId(detailId === item.id ? null : item.id)} aria-expanded={detailId === item.id}>
            {detailId === item.id ? "Hide detail" : "Detail"}
          </button>
          {item.link ? (
            <a className="wg-safety-btn" href={item.link} target="_blank" rel="noreferrer">
              Original source
            </a>
          ) : null}
          {canAsk ? (
            <button
              type="button"
              className="wg-safety-btn primary"
              onClick={() => onAsk(`Explain the safety actions for this warning: ${item.title}. Source: ${item.source}. Use only the supplied description and general preparedness guidance.`)}
            >
              Ask WeatherGPT
            </button>
          ) : null}
        </div>
        {detailId === item.id ? (
          <div className="wg-safety-notice" style={{ marginTop: "0.55rem" }}>
            <strong>Provenance:</strong> {item.sourceType}. {item.kind === "computed" ? "This is an application-generated estimate, not an official warning." : "Preserve the original source link and timestamp when sharing."}
            {!item.geometry ? " This feed does not provide a warning polygon or point geometry in the app." : " A point geometry is available on the map; it is not a full warning polygon."}
          </div>
        ) : null}
      </article>
    );
  };

  const renderList = (items, emptyText) =>
    items.length ? <div className="wg-safety-list">{items.map(renderAlert)}</div> : <div className="wg-safety-empty">{emptyText}</div>;

  return (
    <section className="wg-safety" aria-label="Alerts and safety">
      <header className="wg-safety-hero">
        <img
          className="wg-safety-hero-media"
          src="/imagery/cinematic/lightning-danube.webp"
          alt="Lightning strike over the Danube at night, illustrative severe-weather context only"
          loading="eager"
        />
        <div className="wg-safety-hero-inner">
          <span className="wg-safety-kicker">ALERTS &amp; SAFETY · COMMAND CENTER</span>
          <h1 className="wg-safety-title">Official warnings. Clear limits.</h1>
          <p className="wg-safety-lede">
            One place for source-labelled warnings, local rainfall and satellite context, and practical preparedness.
            Computed risk is never presented as an official warning.
          </p>
          <div className="wg-safety-hero-row">
            <span className="wg-safety-status-item"><strong>Location</strong> {locationName}</span>
            <span className={`wg-safety-status-item`}>
              <span className={`wg-safety-chip ${imd?.status === "LIVE" ? "live" : "unavailable"}`}>{imd?.status === "LIVE" ? "OFFICIAL FEED LIVE" : "OFFICIAL FEED UNAVAILABLE"}</span>
            </span>
            <span className="wg-safety-status-item"><strong>Refreshed</strong> {ageLabel(lastRefresh)}</span>
            {stale ? <span className="wg-safety-status-item"><span className="wg-safety-chip stale">STALE OR PARTIAL</span></span> : null}
          </div>
          <div className="wg-safety-toolbar">
            <button type="button" className="wg-safety-btn primary" onClick={load} disabled={busy}>
              {busy ? "Refreshing…" : "Refresh warnings"}
            </button>
            <button type="button" className="wg-safety-btn" onClick={() => setShowContacts(true)}>Emergency contacts</button>
            <button type="button" className="wg-safety-btn" onClick={toggleMute} aria-pressed={!muted}>
              {muted ? "Browser alerts off" : "Browser alerts on"}
            </button>
            <button type="button" className="wg-safety-btn" onClick={notifyLatest} disabled={muted}>Notify latest</button>
            <button type="button" className="wg-safety-btn" onClick={markAllRead}>Mark all read</button>
            <button type="button" className="wg-safety-btn" onClick={clearRead}>Clear read marks</button>
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("risk")}>Open FloodWatch</button> : null}
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("severe")}>Preparedness</button> : null}
          </div>
        </div>
      </header>

      {showContacts ? <EmergencyContacts onClose={() => setShowContacts(false)} /> : null}

      <div className="wg-safety-kpis" aria-label="Warning summary">
        <div className="wg-safety-kpi red"><span className="label">Active high severity</span><strong>{highCount}</strong><small>Red or Orange source severity</small></div>
        <div className="wg-safety-kpi cyan"><span className="label">Official items</span><strong>{activeItems.filter((item) => item.kind === "official").length}</strong><small>IMD RSS + official third-party feeds</small></div>
        <div className="wg-safety-kpi yellow"><span className="label">Computed items</span><strong>{activeItems.filter((item) => item.kind === "computed").length}</strong><small>Unofficial application estimates</small></div>
        <div className="wg-safety-kpi"><span className="label">Last successful refresh</span><strong style={{ fontSize: "0.84rem" }}>{ageLabel(lastRefresh)}</strong><small>{lastRefresh ? formatTime(lastRefresh) : "No source has answered yet"}</small></div>
      </div>

      {sourceErrorText || cacheUsed ? (
        <div className="wg-safety-notice warn" role="status">
          <strong>Partial data.</strong> {sourceErrorText || "One or more sources did not answer."} {cacheUsed ? "Cached values are shown with their original timestamps and must not be treated as fresh." : "No cached warning records are being presented as live."}
        </div>
      ) : null}

      <SafetyMap weather={weather} items={activeItems} title={`Warning context near ${locationName === "not selected" ? "India" : locationName}`} />

      <div className="wg-safety-panel">
        <div className="wg-safety-panel-head">
          <div>
            <span className="wg-safety-kicker">WARNING FILTERS</span>
            <h2>Browse by severity and hazard</h2>
            <p>Official records and computed estimates stay separately labelled. Filters never change the source.</p>
          </div>
          <label className="wg-safety-select">
            <span>Include</span>
            <select value={showRecent ? "recent" : "active"} onChange={(event) => setShowRecent(event.target.value === "recent")} aria-label="Choose active or recent warnings">
              <option value="active">Active / updated</option>
              <option value="recent">Active + expired / cancelled</option>
            </select>
          </label>
        </div>
        <div className="wg-safety-filters" role="group" aria-label="Filter warnings by severity">
          {SEVERITIES.map((severity) => (
            <button key={severity} type="button" className="wg-safety-chip-btn" aria-pressed={severityFilter === severity} onClick={() => setSeverityFilter(severity)}>
              {severity}
            </button>
          ))}
        </div>
        <div className="wg-safety-filters" role="group" aria-label="Filter warnings by hazard" style={{ marginTop: "0.45rem" }}>
          {HAZARDS.map(([id, label]) => (
            <button key={id} type="button" className="wg-safety-chip-btn" aria-pressed={hazardFilter === id} onClick={() => setHazardFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="wg-safety-panel" aria-label="Official warnings">
        <div className="wg-safety-panel-head">
          <div>
            <span className="wg-safety-kicker">SOURCE-LABELLED · OFFICIAL / THIRD-PARTY</span>
            <h2>Official and verified warning records</h2>
            <p>IMD district nowcast RSS and official third-party events. Source text and links are preserved; missing severity or geometry is not invented.</p>
          </div>
          <span className={`wg-safety-badge ${imd?.status === "LIVE" ? "live" : "unavailable"}`}>{imd?.status === "LIVE" ? "IMD FEED LIVE" : "IMD FEED UNAVAILABLE"}</span>
        </div>
        {busy && !officialItems.length ? <div className="wg-safety-loading" role="status">Loading official warning feeds…</div> : null}
        {!busy && !officialItems.length ? (
          <div className="wg-safety-error" role="alert">
            <strong>No official records were returned.</strong> The IMD feed may be unreachable or have no current district nowcasts. This is not a safety clearance.{" "}
            <button type="button" className="wg-safety-btn" onClick={load}>Retry official and computed feeds</button>
          </div>
        ) : null}
        {filteredOfficial.length ? <div className="wg-safety-list">{filteredOfficial.map(renderAlert)}</div> : officialItems.length ? <div className="wg-safety-empty">No official records match this filter.</div> : null}
        <p className="wg-safety-credit" style={{ margin: "0.6rem 0 0" }}>
          IMD source: <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">India Meteorological Department</a>. Official RSS records do not expose machine severity, expiry, or warning polygons in this integration; those fields are shown as “not supplied” rather than inferred.
        </p>
      </section>

      {thirdPartyItems.length ? (
        <section className="wg-safety-panel" aria-label="Third-party hazard records">
          <div className="wg-safety-panel-head">
            <div>
              <span className="wg-safety-kicker">THIRD-PARTY CONTEXT</span>
              <h2>Regional and global hazard records</h2>
              <p>GDACS / USGS / other fused records. Context only; not an IMD or NDMA bulletin.</p>
            </div>
          </div>
          {renderList(filteredThirdParty, "No third-party records match this filter.")}
        </section>
      ) : null}

      <section className="wg-safety-panel" aria-label="Computed weather alerts">
        <div className="wg-safety-panel-head">
          <div>
            <span className="wg-safety-kicker">COMPUTED · NOT OFFICIAL</span>
            <h2>Application-generated weather alerts</h2>
            <p>Derived from available model thresholds at 10 reference districts. The feed is filtered to 300 km around the selected location and each card shows its distance and LOCAL/REGIONAL/NATIONAL scope. These are not official warnings; coverage is incomplete.</p>
          </div>
          <span className="wg-safety-badge computed">COMPUTED</span>
        </div>
        {busy && !computedItems.length ? <div className="wg-safety-loading" role="status">Loading computed telemetry…</div> : null}
        {sourceErrors.computed ? <div className="wg-safety-error" role="alert">Computed alert feed unavailable: {sourceErrors.computed}. No values are being guessed.</div> : null}
        {renderList(filteredComputed, "No computed alerts within 300 km of the selected location match this filter. Reference-station coverage is incomplete, so an empty feed is not a safety clearance.")}
      </section>

      {filteredRecent.length ? (
        <section className="wg-safety-panel" aria-label="Expired and cancelled warnings">
          <div className="wg-safety-panel-head">
            <div>
              <span className="wg-safety-kicker">RECENT UPDATES</span>
              <h2>Expired and cancelled records</h2>
              <p>Shown only when you select “Active + expired / cancelled”. Status is derived from source timestamps and cancellation text.</p>
            </div>
          </div>
          <div className="wg-safety-list">{filteredRecent.map(renderAlert)}</div>
        </section>
      ) : null}

      <div className="wg-safety-grid two">
        <section className="wg-safety-panel" aria-label="Warning timeline">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">CHRONOLOGY</span><h2>Warning timeline</h2><p>Newest source timestamps first. Official and computed events remain distinct.</p></div>
          </div>
          {allItems.length ? (
            <ol className="wg-safety-timeline">
              {allItems.slice(0, 12).map((item) => (
                <li key={item.id} className={item.kind === "computed" ? "computed" : ""}>
                  <strong>{item.title}</strong>
                  <span>{formatTime(item.issued)} · {item.source} · {statusOf(item)}</span>
                </li>
              ))}
            </ol>
          ) : <div className="wg-safety-empty">No warning timestamps are available yet.</div>}
        </section>

        <section className="wg-safety-panel" aria-label="Data provenance and limitations">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">HONESTY LAYER</span><h2>What you are looking at</h2></div>
          </div>
          <div className="wg-safety-data-gap">
            <h3>Official is separate from computed</h3>
            <p><strong>IMD RSS</strong> is official source text. <strong>GDACS/USGS</strong> are official third-party feeds with their own coverage. <strong>Computed telemetry</strong> is an application estimate and is never promoted to an official warning.</p>
            <p>Official RSS may omit severity, expiry, polygons, or district geometry. Those fields are not inferred. Point markers on the map come only from feeds that provide coordinates.</p>
            <p>{lastRefresh ? `Last successful refresh: ${formatTime(lastRefresh)} (${ageLabel(lastRefresh)}).` : "No successful refresh has completed yet."} {stale ? "Some sources are stale or unavailable; cached records retain their original timestamps." : "All requested sources returned in this refresh."}</p>
          </div>
          <p className="wg-safety-credit" style={{ margin: "0.65rem 0 0" }}>
            Hero image: Lightning over the Danube by Jules Verne Times Two (CC BY-SA 4.0), illustrative context only — not current weather over your location. Map base: OpenStreetMap contributors (ODbL). Satellite overlay: NASA GIBS, U.S. public domain. Read the original warning before acting.
          </p>
        </section>
      </div>
    </section>
  );
}
