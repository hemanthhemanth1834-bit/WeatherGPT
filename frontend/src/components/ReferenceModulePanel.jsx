import React from "react";

const MODULES = {
  life_cast: ["SECTORAL INTELLIGENCE","Life Cast","Personal lifestyle weather forecasts for jogging, cycling, laundry drying, drone flights, and outdoor health ratings.",["Outdoor Activity","Health & Comfort","Laundry & Drying","Drone / Cycling"]],
  roadwatch: ["TRANSPORT INTELLIGENCE","RoadWatch Transit","Highway hydroplaning risks, dense-fog visibility warnings, and crosswind alerts.",["Hydroplaning Watch","Visibility Watch","Crosswind Watch","Radar & Route"]],
  treeguard: ["URBAN CANOPY","TreeGuard Urban Canopy","Urban tree vulnerability, branch-fall danger, windthrow risk, and root-anchorage context.",["Windthrow Risk","Branch-Fall Watch","Urban Exposure","Climate Context"]],
  trip_planner: ["TRAVEL INTELLIGENCE","Weather Trip Planner","Multi-waypoint routing with weather-at-arrival forecasting and departure optimization.",["Departure Window","Arrival Weather","Multi-Waypoint","Hazard Overlay"]],
  utilitywatch: ["UTILITY INTELLIGENCE","UtilityWatch","Weather-aware operational context for utilities, infrastructure and public services.",["Storm Exposure","Heat Stress","Flood Context","Live Providers"]],
  solar: ["CLEAN ENERGY","Solar & Clean Energy","GHI-style solar irradiance modeling, hourly generation estimation, and cleaning advisories.",["Solar Potential","Generation Estimate","Cloud Impact","Cleaning Window"]],
  deep_cast: ["AI METEOROLOGY","AI Weather Deep-Cast","NWP-focused weather intelligence with model provenance, hourly forecasts and scenario analysis.",["NWP Models","Soundings","7-Day Synoptic","Provider Health"]],
  evacuation: ["DISASTER EARLY WARNING","Disaster & Evacuation Hub","Weather hazards, alert information and GIS overlays for emergency decision support.",["Active Alerts","Evacuation Map","FloodWatch","Emergency Contacts"]]
};

export default function ReferenceModulePanel({ module, weather, onTab, onAsk }) {
  const item = MODULES[module] || MODULES.life_cast;
  const place = weather?.location || "your location";
  return (
    <section className="wg-ref-section" aria-label={item[1]}>
      <div className="wg-ref-section-head">
        <div><span className="wg-chip live">{item[0]}</span><h2>{item[1]}</h2><p style={{color:"var(--wg-muted)",maxWidth:"52rem"}}>{item[2]}</p></div>
      </div>
      <div className="wg-ref-feature-grid">
        {item[3].map((title) => (
          <button className="wg-ref-feature wg-card hoverable" key={title} onClick={() => onAsk?.(item[1] + ": " + title + " for " + place + ".")}>
            <span className="wg-ref-icon">✦</span>
            <span className="wg-ref-feature-copy"><strong>{title}</strong><span>Live, transparent WeatherGPT decision-support context for this reference feature.</span><small className="wg-ref-feature-action">Open / Ask WeatherGPT →</small></span>
            <span className="wg-ref-arrow">↗</span>
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:".5rem",marginTop:".8rem"}}>
        <button className="wg-btn" onClick={() => onTab("dashboard")}>Live Weather</button>
        <button className="wg-btn-ghost" onClick={() => onTab("map")}>GIS / Radar</button>
        <button className="wg-btn-ghost" onClick={() => onTab("alerts")}>Alerts</button>
        <button className="wg-btn-ghost" onClick={() => onTab("capabilities")}>System &amp; Admin</button>
      </div>
    </section>
  );
}
