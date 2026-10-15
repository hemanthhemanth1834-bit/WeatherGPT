import React, { useEffect, useState } from "react";
import LiveImagery from "./LiveImagery";
import {
  frameTimeLabel,
  getRadarFrames,
  latestFrame,
  radarStaticUrl,
} from "../services/radar";
import {
  GIBS_LAYERS,
  GIBS_LICENSE_NOTE,
  GIBS_VIEWER,
  gibsDate,
  gibsIndiaWms,
} from "../services/gibs";

/* Earth & weather visual evidence: real public-source imagery beside honest
   provenance state. Radar frames are recent-past composites (DELAYED);
   GIBS true-color is a daily product (DELAYED, previous day). No paid API. */
export default function LiveEvidencePanel({ weather }) {
  const [radar, setRadar] = useState(null); // { src, observedAt } | null
  const [failedFor, setFailedFor] = useState(null);
  const [radarTries, setRadarTries] = useState(0);
  const lat = Number(weather?.lat ?? 16.5062);
  const lon = Number(weather?.lon ?? 80.6480);
  const satDate = gibsDate(1);
  const satSrc = gibsIndiaWms(GIBS_LAYERS.viirs.layer, satDate);
  const radarKey = `${lat},${lon},${radarTries}`;
  const radarFailed = failedFor === radarKey;

  useEffect(() => {
    let cancelled = false;
    getRadarFrames()
      .then((data) => {
        if (cancelled) return;
        const frame = latestFrame(data);
        if (!frame) {
          setFailedFor(radarKey);
          return;
        }
        setRadar({
          src: radarStaticUrl(data.host, frame, lat, lon),
          observedAt: `${frameTimeLabel(frame)} IST · RainViewer recent-past composite`,
        });
      })
      .catch(() => {
        if (!cancelled) setFailedFor(radarKey);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radarKey]);

  return (
    <section className="wg-card" style={{ marginTop: "1rem", overflow: "hidden", position: "relative" }}>
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(circle at 15% 0%, rgba(34,211,238,.14), transparent 32%), radial-gradient(circle at 90% 30%, rgba(99,102,241,.12), transparent 35%)"
      }} />
      <div style={{position:"relative", padding:"1.1rem 1.2rem .8rem", display:"flex", justifyContent:"space-between", gap:"1rem", alignItems:"end", flexWrap:"wrap"}}>
        <div>
          <span className="wg-chip live">VISUAL EVIDENCE</span>
          <h2 style={{margin:".45rem 0 .25rem"}}>Earth &amp; Weather Visual Intelligence</h2>
          <p style={{margin:0, color:"var(--wg-muted)"}}>Real public-source imagery beside the provenance state. No paid image API is required.</p>
        </div>
        <div style={{fontSize:".75rem", color:"var(--wg-muted)"}}>3D globe · radar · satellite · source timestamp</div>
      </div>

      <div style={{position:"relative", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:".7rem", padding:"0 1rem"}}>
        <LiveImagery
          title="Radar / precipitation"
          description="Recent-past precipitation composite near the selected location. Coverage varies — blank areas mean no radar coverage, not clear skies."
          src={radarFailed ? "" : radar?.src}
          loading={!radarFailed && !radar}
          error={radarFailed}
          onRetry={() => { setRadar(null); setRadarTries((t) => t + 1); }}
          alt={`Recent RainViewer precipitation radar near ${weather?.location || "the selected location"}`}
          sourceName="RainViewer (personal/educational use)"
          sourceUrl="https://www.rainviewer.com/"
          observedAt={radar?.observedAt}
          status={radarFailed ? "UNAVAILABLE" : radar ? "DELAYED" : "STATIC"}
          legend="🟦 light → 🟥 intense precipitation"
        />
        <LiveImagery
          title="NASA GIBS / MODIS true-color"
          description={`Daily true-color Earth observation over India (${satDate}). Shows clouds and land, not warnings — pair it with alerts, not instead of them. ${GIBS_LICENSE_NOTE}.`}
          src={satSrc}
          alt={`NASA GIBS true-color satellite over India, ${satDate}`}
          sourceName="NASA GIBS"
          sourceUrl={GIBS_VIEWER}
          observedAt={`${satDate} · daily product, typically previous day`}
          status="DELAYED"
        />
      </div>

      <div style={{position:"relative", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:".55rem", padding:".85rem 1rem 1rem"}}>
        {[
          ["RADAR", radarFailed ? "Unavailable" : "RainViewer", radarFailed ? "UNAVAILABLE" : "DELAYED"],
          ["EARTH OBSERVATION", "NASA GIBS / MODIS", "DELAYED"],
          ["FORECAST", weather?.data_source || "Open-Meteo", weather?.status || "LIVE"],
          ["LOCATION", weather?.location || "Selected location", "GPS / SEARCH"],
        ].map(([a, b, c]) => (
          <div key={a} style={{padding:".7rem .8rem", border:"1px solid rgba(148,163,184,.14)", borderRadius:12, background:"rgba(15,23,42,.35)"}}>
            <small style={{display:"block", color:"var(--wg-muted)"}}>{a}</small>
            <strong style={{display:"block", margin:".18rem 0"}}>{b}</strong>
            <span className={`wg-chip ${c === "LIVE" ? "live" : c === "UNAVAILABLE" ? "off" : "estimated"}`}>{c}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
