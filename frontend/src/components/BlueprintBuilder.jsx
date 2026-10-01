import React, { useState } from "react";

/* Household preparedness checklist generator. Original implementation.
   Deterministic: combines the user's inputs with live risk/weather already
   shown on this screen. General STATIC safety guidance — not an official plan. */
const HAZARDS = ["Flood / Heavy Rain", "Thunderstorm / Lightning", "Heatwave", "Cold Wave", "Strong Wind", "Cyclone Threat"];
const DWELLINGS = ["Ground floor (pucca)", "Ground floor (kutcha)", "First floor or higher", "High-rise apartment"];

export default function BlueprintBuilder({ risk, weather }) {
  const [hazard, setHazard] = useState("Flood / Heavy Rain");
  const [dwelling, setDwelling] = useState("Ground floor (pucca)");
  const [headcount, setHeadcount] = useState(4);
  const [elderly, setElderly] = useState(false);
  const [children, setChildren] = useState(false);
  const [livestock, setLivestock] = useState(false);
  const [plan, setPlan] = useState(null);

  const generate = () => {
    const steps = [];
    const overall = risk?.overall || "LOW";
    steps.push(`1. Situation now (${weather?.location || "your area"}): risk ${overall} (ESTIMATED, ${weather?.updated_at_ist || "live data"}). Recheck before acting.`);
    if (hazard.includes("Flood") || hazard.includes("Cyclone")) {
      steps.push("2. Move documents, medicines, and valuables above likely water level; switch off mains if water enters.");
      steps.push("3. Identify high ground and two exit routes; never drive through flowing water.");
    }
    if (hazard.includes("Thunderstorm") || hazard.includes("Lightning")) {
      steps.push("2. Stay indoors away from windows; unplug sensitive electronics; avoid open fields and lone trees.");
    }
    if (hazard.includes("Heat")) {
      steps.push("2. Stock drinking water and ORS; plan outdoor work before 11 AM; check on elderly neighbours.");
    }
    if (hazard.includes("Cold")) {
      steps.push("2. Layer clothing and blankets; protect crops/livestock from frost; watch for fog on roads.");
    }
    if (hazard.includes("Wind") || hazard.includes("Cyclone")) {
      steps.push("2. Secure loose rooftop items; stay clear of hoardings and old trees during gusts.");
    }
    if (dwelling.includes("kutcha") || dwelling.includes("Ground floor")) {
      steps.push("3. Ground-level homes flood first — keep a go-bag (documents, water, torch, medicines) ready upstairs or with a neighbour.");
    }
    steps.push(`4. Household of ${headcount}: assign one member to track official bulletins (IMD/NDMA/local radio).`);
    if (elderly) steps.push("5. Elderly/infants: keep medications, milk, and warm clothing accessible; avoid stairways in the dark.");
    if (children) steps.push("5. Children: keep schools' emergency numbers saved; practice the home exit route together.");
    if (livestock) steps.push("5. Livestock: move animals to raised shelter with feed and water before nightfall.");
    steps.push("6. Emergency numbers: 112 (national), 1078 (NDMA), 1070 (relief). Call 112 first in immediate danger.");
    setPlan(steps);
  };

  const field = { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.76rem", color: "var(--wg-muted)" };

  return (
    <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
      <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.85rem" }}>
        🧰 Household readiness builder <span className="wg-chip static" style={{ marginLeft: "0.4rem" }}>STATIC GUIDANCE</span>
      </h3>
      <p style={{ fontSize: "0.74rem", color: "var(--wg-muted)", margin: "0 0 0.6rem" }}>
        Deterministic checklist from your inputs plus live risk above — general guidance, not an official plan.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(10rem,1fr))", gap: "0.6rem" }}>
        <label style={field}>Hazard
          <select className="wg-input" value={hazard} onChange={(e) => setHazard(e.target.value)} aria-label="Hazard">
            {HAZARDS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label style={field}>Dwelling
          <select className="wg-input" value={dwelling} onChange={(e) => setDwelling(e.target.value)} aria-label="Dwelling">
            {DWELLINGS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label style={field}>Headcount: {headcount}
          <input type="range" min={1} max={12} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} aria-label="Household headcount" />
        </label>
        <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-end", fontSize: "0.78rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}><input type="checkbox" className="wg-check" checked={elderly} onChange={(e) => setElderly(e.target.checked)} /> Elderly/infants</label>
          <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}><input type="checkbox" className="wg-check" checked={children} onChange={(e) => setChildren(e.target.checked)} /> Children</label>
          <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}><input type="checkbox" className="wg-check" checked={livestock} onChange={(e) => setLivestock(e.target.checked)} /> Livestock</label>
        </div>
      </div>
      <button className="wg-btn" style={{ marginTop: "0.7rem" }} onClick={generate}>Generate readiness checklist →</button>
      {plan && (
        <ol style={{ margin: "0.7rem 0 0", paddingLeft: "1.2rem", fontSize: "0.82rem", lineHeight: 1.7 }}>
          {plan.map((s, i) => <li key={i}>{s.replace(/^\d+\.\s*/, "")}</li>)}
        </ol>
      )}
    </div>
  );
}
