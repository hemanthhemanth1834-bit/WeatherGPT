import React from "react";

const PROVIDERS = [
  ["Open-Meteo", "forecast, air quality, marine, geocoding and model data"],
  ["NASA GIBS", "Earth-observation imagery"],
  ["RainViewer", "recent historical radar imagery"],
  ["USGS / NASA EONET / GDACS / NOAA / IMD", "public hazard, event, aviation and India-warning data when available"],
  ["OpenStreetMap", "map tiles and geographic context"],
  ["BigDataCloud", "reverse geocoding when GPS is used"],
];

export default function PrivacyPage() {
  const clearLocalData = () => {
    try {
      localStorage.removeItem("weathergpt.savedPlaces");
      localStorage.removeItem("weathergpt.localAnalytics");
      window.dispatchEvent(new Event("weathergpt-local-data-cleared"));
    } catch {}
  };

  return (
    <section className="wg-card" style={{padding:"1.4rem",maxWidth:"58rem",margin:"0 auto"}}>
      <div className="wg-chip live">PRIVACY-FIRST · NO PAID ANALYTICS</div>
      <h1 className="wg-hero-title" style={{marginTop:"0.7rem"}}>Privacy &amp; Data</h1>
      <p style={{color:"var(--wg-muted)",lineHeight:1.7}}>
        WeatherGPT is designed to work with public/free data sources. The core app does not require an account,
        paid API key, advertising SDK, or third-party analytics service.
      </p>

      <div style={{display:"grid",gap:"0.8rem",marginTop:"1rem"}}>
        <article className="wg-card" style={{padding:"1rem"}}>
          <h2 className="wg-section-title">What stays on your device</h2>
          <p style={{color:"var(--wg-muted)",lineHeight:1.6}}>
            Saved places and privacy-preserving local usage counters are stored in browser localStorage.
            They are not uploaded by the WeatherGPT analytics module.
          </p>
        </article>
        <article className="wg-card" style={{padding:"1rem"}}>
          <h2 className="wg-section-title">Location &amp; microphone</h2>
          <p style={{color:"var(--wg-muted)",lineHeight:1.6}}>
            GPS is requested only when you choose location detection. Voice input uses the browser Web Speech
            interface when supported. WeatherGPT does not intentionally store GPS coordinates or microphone audio.
          </p>
        </article>
        <article className="wg-card" style={{padding:"1rem"}}>
          <h2 className="wg-section-title">External providers</h2>
          <p style={{color:"var(--wg-muted)",lineHeight:1.6}}>
            Live requests can reach public providers required for the feature you use. Their own terms and privacy
            policies apply.
          </p>
          <ul style={{color:"var(--wg-muted)",lineHeight:1.7}}>
            {PROVIDERS.map(([name, purpose]) => <li key={name}><strong>{name}</strong> — {purpose}</li>)}
          </ul>
        </article>
        <article className="wg-card" style={{padding:"1rem"}}>
          <h2 className="wg-section-title">No fabricated live data</h2>
          <p style={{color:"var(--wg-muted)",lineHeight:1.6}}>
            If an upstream service fails, WeatherGPT should show an unavailable/error state or a clearly labelled
            computed/estimated result rather than silently presenting a made-up live observation.
          </p>
        </article>
      </div>

      <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap",marginTop:"1rem"}}>
        <button type="button" className="wg-btn" onClick={clearLocalData}>Clear local WeatherGPT data</button>
        <button type="button" className="wg-btn-ghost" onClick={() => window.history.length > 1 ? window.history.back() : null}>Back</button>
      </div>
      <p style={{fontSize:"0.7rem",color:"var(--wg-muted)",marginTop:"1rem"}}>
        This page describes the application behavior, not the separate policies of upstream providers.
      </p>
    </section>
  );
}
