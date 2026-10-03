import React, { useEffect, useMemo, useState } from "react";

const NASA_BBOX = "68,6,98,37";
const NASA_LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor";

function gibsUrl() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  return "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
    + "?service=WMS&request=GetMap&layers=" + encodeURIComponent(NASA_LAYER)
    + "&styles=&format=image/jpeg&transparent=false&version=1.1.1"
    + "&width=900&height=520&srs=EPSG:4326&bbox=" + NASA_BBOX + "&time=" + date;
}

export default function LiveEvidencePanel({ weather }) {
  const [radar, setRadar] = useState(null);
  const [radarState, setRadarState] = useState("checking");
  const [satelliteUrl, setSatelliteUrl] = useState(gibsUrl());
  const [nwp, setNwp] = useState(null);
  const lat = Number(weather?.lat ?? 16.5062);
  const lon = Number(weather?.lon ?? 80.6480);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("radar")))
      .then((data) => {
        if (cancelled) return;
        const frame = data?.radar?.past?.at(-1);
        if (!frame || !data?.host) throw new Error("no radar frame");
        setRadar({
          url: data.host + frame.path + "/512/" + Math.min(7, 6) + "/" + lat + "/" + lon + "/2/1_1.png",
          time: new Date(frame.time * 1000).toISOString(),
        });
        setRadarState("live");
      })
      .catch(() => !cancelled && setRadarState("unavailable"));
    const timer = window.setInterval(() => setSatelliteUrl(gibsUrl()), 3600000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [lat, lon]);

  const sourceCards = useMemo(() => [
    ["LIVE RADAR", radarState === "live" ? "RainViewer" : "Fallback ready", radarState === "live" ? "LIVE" : "UNAVAILABLE"],
    ["EARTH OBSERVATION", "NASA GIBS / MODIS", "LIVE REFERENCE"],
    ["FORECAST", weather?.data_source || "Open-Meteo", weather?.status || "LIVE"],
    ["LOCATION", weather?.location || "Selected location", "GPS / SEARCH"],
  ], [radarState, weather]);

  return (
    <section className="wg-card" style={{ marginTop: "1rem", overflow: "hidden", position: "relative" }}>
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(circle at 15% 0%, rgba(34,211,238,.14), transparent 32%), radial-gradient(circle at 90% 30%, rgba(99,102,241,.12), transparent 35%)"
      }} />
      <div style={{position:"relative", padding:"1.1rem 1.2rem .8rem", display:"flex", justifyContent:"space-between", gap:"1rem", alignItems:"end", flexWrap:"wrap"}}>
        <div>
          <span className="wg-chip live">LIVE EVIDENCE</span>
          <h2 style={{margin:".45rem 0 .25rem"}}>Earth &amp; Weather Visual Intelligence</h2>
          <p style={{margin:0, color:"var(--wg-muted)"}}>Real public-source imagery beside the provenance state. No paid image API is required.</p>
        </div>
        <div style={{fontSize:".75rem", color:"var(--wg-muted)"}}>3D globe • radar • satellite • source timestamp</div>
      </div>

      <div style={{position:"relative", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"1px", background:"rgba(148,163,184,.12)"}}>
        <article style={{background:"rgba(2,6,23,.38)", minHeight:230, position:"relative"}}>
          {radar ? <img src={radar.url} alt="Live RainViewer radar example" style={{width:"100%", height:230, objectFit:"cover", display:"block"}} onError={() => setRadarState("unavailable")} /> : (
            <div style={{height:230, display:"grid", placeItems:"center", color:"var(--wg-muted)"}}>Loading public radar…</div>
          )}
          <div style={{position:"absolute", left:12, right:12, bottom:12, padding:".65rem .75rem", borderRadius:12, background:"rgba(2,6,23,.78)", backdropFilter:"blur(12px)"}}>
            <b>Radar / precipitation</b><br/><small>{radar?.time ? new Date(radar.time).toLocaleString() : radarState}</small>
          </div>
        </article>

        <article style={{background:"rgba(2,6,23,.38)", minHeight:230, position:"relative"}}>
          <img src={satelliteUrl} alt="NASA GIBS satellite example over India" style={{width:"100%", height:230, objectFit:"cover", display:"block"}} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div style={{position:"absolute", left:12, right:12, bottom:12, padding:".65rem .75rem", borderRadius:12, background:"rgba(2,6,23,.78)", backdropFilter:"blur(12px)"}}>
            <b>NASA GIBS / MODIS</b><br/><small>India regional Earth-observation reference • refreshed daily when imagery is available</small>
          </div>
        </article>
      </div>

      {nwp?.models && <div style={{position:"relative", padding:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem",flexWrap:"wrap",marginBottom:".65rem"}}>
          <div><span className="wg-chip live">FREE NWP</span><h3 style={{margin:".35rem 0"}}>Model agreement / disagreement</h3></div>
          <small style={{color:"var(--wg-muted)"}}>Spread: {nwp.spread?.temperature_c ?? "—"}°C · rain {nwp.spread?.rain_probability_pct ?? "—"} pp</small>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:".55rem"}}>
          {Object.entries(nwp.models).map(([key,x]) => <div key={key} style={{padding:".75rem",border:"1px solid rgba(148,163,184,.14)",borderRadius:12}}>
            <strong style={{textTransform:"uppercase"}}>{key}</strong><div style={{fontSize:"1.25rem",fontWeight:800,margin:".25rem 0"}}>{x.temperature_c}°C</div><small>{x.rain_probability_pct ?? "—"}% rain · {x.wind_kmh} km/h</small>
          </div>)}
        </div>
      </div>}

      <div style={{position:"relative", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:".55rem", padding:".85rem 1rem 1rem"}}>
        {sourceCards.map(([a,b,c]) => <div key={a} style={{padding:".7rem .8rem", border:"1px solid rgba(148,163,184,.14)", borderRadius:12, background:"rgba(15,23,42,.35)"}}>
          <small style={{display:"block", color:"var(--wg-muted)"}}>{a}</small><strong style={{display:"block", margin:".18rem 0"}}>{b}</strong><span className="wg-chip live">{c}</span>
        </div>)}
      </div>
    </section>
  );
}
