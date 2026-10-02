import React from "react";
import Live3DIcon from "./Live3DIcon";

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
  const guidance = {
    life_cast: "This module converts weather conditions into practical outdoor guidance. It explains comfort and activity conditions; it is not medical advice.",
    roadwatch: "This module highlights weather factors that can affect driving, including rain, visibility and wind. Always follow road signs and official traffic instructions.",
    treeguard: "This module explains how wind, rain and environmental conditions can affect urban trees. It is an awareness tool, not a structural safety inspection.",
    trip_planner: "This module uses forecast conditions along a planned journey to help choose timing and understand weather exposure. Forecasts can change between planning and travel.",
    utilitywatch: "This module provides weather context for infrastructure and public services, such as heat, storms and flooding. It does not replace an operator's engineering or emergency procedures.",
    solar: "This module estimates solar-energy conditions from available radiation and cloud information. Actual generation depends on the installation, shading, equipment and site conditions.",
    deep_cast: "This module presents numerical weather-model information and scenario analysis. Model output is probabilistic guidance and can change when new data arrives.",
    evacuation: "This module combines weather and geographic information for emergency decision support. For an active emergency, follow official government and emergency-service instructions first."
  }[module] || "This module explains weather information for your selected location and shows how the available data can be used.";

  return (
    <section className="wg-ref-section" aria-label={item[1]}>
      <div className="wg-ref-section-head">
        <div><span className="wg-chip live">{item[0]}</span><h2>{item[1]}</h2><p style={{color:"var(--wg-muted)",maxWidth:"52rem"}}>{item[2]}</p></div>
      </div>
      <div className="wg-card" style={{padding:"1rem",marginBottom:"1rem",borderLeft:"3px solid var(--wg-accent)"}}><strong>What this module does</strong><p style={{margin:".35rem 0 0",color:"var(--wg-muted)",lineHeight:1.65}}>{guidance}</p><small style={{color:"var(--wg-muted)"}}>Selected location: {place}. Values are shown only when the connected data source provides them.</small></div>\n      <div className="wg-ref-feature-grid">
        {item[3].map((title) => (
          <button className="wg-ref-feature wg-card hoverable" key={title} onClick={() => onAsk?.(item[1] + ": " + title + " for " + place + ".")}>
            <span className="wg-ref-icon"><Live3DIcon kind={module === "solar" ? "solar" : module === "evacuation" ? "alert" : module === "roadwatch" ? "road" : module === "treeguard" ? "tree" : module === "trip_planner" ? "trip" : module === "life_cast" ? "life" : module === "deep_cast" ? "ai" : "weather"} size="sm" label={title} /></span>
            <span className="wg-ref-feature-copy"><strong>{title}</strong><span>Shows what this feature means for {place}. Select it to ask WeatherGPT for a plain-language explanation using the available live context.</span><small className="wg-ref-feature-action">Open / Ask WeatherGPT →</small></span>
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
