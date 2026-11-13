import React, { useMemo, useState } from "react";
import EmergencyContacts from "./EmergencyContacts";
import BlueprintBuilder from "./BlueprintBuilder";
import "./SafetyCenter.css";

const HOUSEHOLD_KEY = "weathergpt.preparedness.household.v1";
const KIT_KEY = "weathergpt.preparedness.kit.v1";
const PLAN_KEY = "weathergpt.preparedness.familyPlan.v1";
const SAVED_KEY = "weathergpt.preparedness.savedAt";

const HOUSEHOLD_ITEMS = [
  "Know your nearest high ground and safest evacuation route.",
  "Save 112, 1078, and 1070 in every household phone.",
  "Keep IDs, insurance, and property papers in a waterproof bag.",
  "Agree on a family meeting point and an out-of-area contact.",
  "Charge phones and power banks before severe weather.",
  "Keep a battery radio and spare batteries.",
  "Store at least three days of drinking water.",
  "Keep at least three days of ready-to-eat food.",
  "Plan for elderly people, children, and pets.",
  "Check the roof, drains, windows, and loose outdoor items.",
  "Know how to switch off electricity and gas safely.",
  "Keep a torch, spare batteries, and some cash accessible.",
];

const KIT_ITEMS = [
  "Drinking water for at least three days",
  "Ready-to-eat food and a manual can opener",
  "First-aid kit and regular medicines",
  "Torch and spare batteries",
  "Charged power bank and charging cable",
  "Battery or hand-crank radio",
  "Waterproof copies of important documents",
  "Whistle to signal for help",
  "Dust mask or N95 respirator",
  "Sanitation and personal hygiene items",
  "Blanket or weather protection",
  "Multi-tool or scissors",
  "Local map and emergency contact card",
  "Cash in small notes",
  "Pet food and pet supplies",
  "Infant, elderly, or disability-specific supplies",
];

const HAZARDS = [
  {
    id: "flood",
    label: "Flood",
    before: ["Move documents and valuables above expected water level.", "Identify high ground and a safe route on foot.", "Keep drains clear and never store fuel near floodwater.", "Follow official evacuation orders; do not wait for water at the door."],
    during: ["Move to a higher floor or higher ground if it is safe to do so.", "Never walk, swim, or drive through floodwater.", "Avoid bridges, riverbanks, underpasses, and electric wires.", "Switch off electricity only if you can reach the main switch safely. Call 112 for rescue."],
    after: ["Stay out of floodwater: it can hide sewage, sharp debris, and live electricity.", "Boil or disinfect drinking water until authorities say it is safe.", "Photograph damage for relief claims and report it to local authorities.", "Follow official all-clear advice before returning home."],
  },
  {
    id: "cyclone",
    label: "Cyclone",
    before: ["Secure loose roof sheets, signs, and outdoor objects.", "Stock water, food, medicines, and a torch for several days.", "Charge devices and keep a battery radio for IMD/NDMA updates.", "Know the nearest official shelter only if local authorities have opened one."],
    during: ["Stay indoors, away from windows and glass.", "Do not go outside during the calm eye of a cyclone.", "Listen to IMD and NDMA updates; do not rely on social media rumours.", "Evacuate only when an official order is issued."],
    after: ["Avoid downed power lines and damaged buildings.", "Do not enter floodwater or touch electrical equipment.", "Boil drinking water and discard spoiled food.", "Report damage and follow local relief instructions."],
  },
  {
    id: "storm",
    label: "Storm & lightning",
    before: ["Check weather warnings before outdoor work or travel.", "Secure loose objects and park vehicles away from trees.", "Keep phones charged and unplug sensitive electronics when storms approach.", "Agree a safe indoor meeting place for the household."],
    during: ["Go indoors and stay away from windows, trees, poles, and open water.", "Avoid using a wired phone or plumbing during close lightning.", "If caught outside, move to a low area; do not shelter under a lone tree.", "Call 112 for a lightning injury; do not delay emergency help."],
    after: ["Stay away from damaged wires, trees, and structures.", "Check on neighbours and vulnerable people.", "Report fallen power lines to the utility and local authority.", "Do not enter damaged buildings until they are declared safe."],
  },
  {
    id: "heat",
    label: "Heatwave",
    before: ["Store water and oral rehydration supplies.", "Plan indoor work and check on elderly neighbours.", "Keep curtains closed during the hottest hours.", "Never leave children or pets in a parked vehicle."],
    during: ["Drink water regularly, even before you feel thirsty.", "Avoid strenuous activity between 12:00 and 15:00.", "Use fans, shade, and cool rooms; move to a cooler place if dizzy.", "Call 112 if someone has confusion, fainting, or very high body temperature."],
    after: ["Continue drinking fluids and rest.", "Check on people who live alone or have health conditions.", "Do not assume the danger has ended after one cooler night.", "Follow local health advisories."],
  },
  {
    id: "coastal",
    label: "Coastal & tsunami",
    before: ["Know official evacuation routes and high ground.", "Keep a battery radio for coastal warnings.", "Never go to the beach to watch a storm or high waves.", "Follow IMD, INCOIS, and local authority instructions."],
    during: ["Move inland or to high ground immediately after an official tsunami warning.", "Do not wait to see the wave; natural signs such as strong shaking or a sudden sea retreat are urgent.", "Stay away from the shore, rivers, and estuaries.", "Call 112 only for immediate danger; keep lines free."],
    after: ["Stay away from the coast until authorities declare it safe.", "Avoid floodwater, debris, and damaged infrastructure.", "Follow official relief and reunion instructions.", "Do not spread unverified evacuation or shelter information."],
  },
];

function readObject(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readSavedAt() {
  try {
    return localStorage.getItem(SAVED_KEY) || null;
  } catch {
    return null;
  }
}

function saveList(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* storage can be unavailable */
  }
}

function saveObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable */
  }
}

export default function PreparednessCenter({ weather, selectedPlace = "", onAsk, onTab }) {
  const locationName = weather?.location || selectedPlace || "";
  const locationLabel = locationName || "not selected";
  const [hazard, setHazard] = useState("flood");
  const [household, setHousehold] = useState(() => new Set(readList(HOUSEHOLD_KEY)));
  const [kit, setKit] = useState(() => new Set(readList(KIT_KEY)));
  const [plan, setPlan] = useState(() => readObject(PLAN_KEY, {}));
  const [savedAt, setSavedAt] = useState(readSavedAt);
  const [showContacts, setShowContacts] = useState(false);

  const activeHazard = HAZARDS.find((item) => item.id === hazard) || HAZARDS[0];
  const householdDone = useMemo(() => HOUSEHOLD_ITEMS.filter((item) => household.has(item)).length, [household]);
  const kitDone = useMemo(() => KIT_ITEMS.filter((item) => kit.has(item)).length, [kit]);
  const householdPct = Math.round((householdDone / HOUSEHOLD_ITEMS.length) * 100);
  const kitPct = Math.round((kitDone / KIT_ITEMS.length) * 100);

  const touch = () => {
    const stamp = new Date().toISOString();
    setSavedAt(stamp);
    try {
      localStorage.setItem(SAVED_KEY, stamp);
    } catch {
      /* ignore */
    }
  };

  const toggle = (setter, key, current, item) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setter(next);
    saveList(key, [...next]);
    touch();
  };

  const updatePlan = (field, value) => {
    const next = { ...plan, [field]: value };
    setPlan(next);
    saveObject(PLAN_KEY, next);
    touch();
  };

  const reset = () => {
    setHousehold(new Set());
    setKit(new Set());
    setPlan({});
    saveList(HOUSEHOLD_KEY, []);
    saveList(KIT_KEY, []);
    saveObject(PLAN_KEY, {});
    touch();
  };

  const planText = () => {
    const lines = [
      "WeatherGPT household emergency plan",
      `Generated: ${new Date().toISOString()}`,
      `Selected location: ${locationLabel}`,
      "",
      "Family plan",
      `Meeting point: ${plan.meetingPoint || "not set"}`,
      `Out-of-area contact: ${plan.outOfAreaContact || "not set"}`,
      `Local contact: ${plan.localContact || "not set"}`,
      `Medical / accessibility notes: ${plan.medicalNotes || "not set"}`,
      "",
      `Household checklist (${householdDone}/${HOUSEHOLD_ITEMS.length})`,
      ...HOUSEHOLD_ITEMS.map((item) => `[${household.has(item) ? "x" : " "}] ${item}`),
      "",
      `Emergency kit (${kitDone}/${KIT_ITEMS.length})`,
      ...KIT_ITEMS.map((item) => `[${kit.has(item) ? "x" : " "}] ${item}`),
      "",
      `Hazard guidance: ${activeHazard.label}`,
      "Before:",
      ...activeHazard.before.map((item) => `- ${item}`),
      "During:",
      ...activeHazard.during.map((item) => `- ${item}`),
      "After:",
      ...activeHazard.after.map((item) => `- ${item}`),
      "",
      "Verified contacts: 112 National Emergency; 1078 NDMA Helpline; 1070 Relief Commissioner; 1800-180-1717 IMD helpdesk.",
      "No shelter, evacuation order, or emergency availability is asserted by this plan. Follow official authorities.",
      `Saved locally: ${savedAt || "not yet saved"}`,
    ];
    return lines.join("\n");
  };

  const downloadPlan = () => {
    const blob = new Blob([planText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "weathergpt-preparedness-plan.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="wg-safety" aria-label="Disaster preparedness center">
      <header className="wg-safety-hero">
        <img className="wg-safety-hero-media" src="/imagery/cinematic/hurricane-florence.webp" alt="Hurricane Florence seen from space, illustrative preparedness context only" loading="eager" />
        <div className="wg-safety-hero-inner">
          <span className="wg-safety-kicker">DISASTER PREPAREDNESS · PRACTICAL, LOCAL, HONEST</span>
          <h1 className="wg-safety-title">Prepare before the warning.</h1>
          <p className="wg-safety-lede">
            A household plan, a checked emergency kit, and hazard-specific before/during/after guidance. Checklists save in
            this browser; no shelter or evacuation order is invented.
          </p>
          <div className="wg-safety-hero-row">
            <span className="wg-safety-status-item"><strong>Location</strong> {locationLabel}</span>
            <span className="wg-safety-status-item"><strong>Saved locally</strong> {savedAt ? new Date(savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "not yet"}</span>
            <span className="wg-safety-status-item"><span className="wg-safety-chip live">OFFLINE-FRIENDLY CHECKLIST</span></span>
          </div>
          <div className="wg-safety-toolbar">
            <button type="button" className="wg-safety-btn primary" onClick={() => setShowContacts(true)}>Emergency contacts</button>
            <button type="button" className="wg-safety-btn" onClick={downloadPlan}>Download plan</button>
            <button type="button" className="wg-safety-btn" onClick={() => window.print()}>Print plan</button>
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("alerts")}>Severe Alerts</button> : null}
            {onTab ? <button type="button" className="wg-safety-btn" onClick={() => onTab("risk")}>FloodWatch</button> : null}
          </div>
        </div>
      </header>

      {showContacts ? <EmergencyContacts onClose={() => setShowContacts(false)} /> : null}

      <section className="wg-safety-panel" aria-label="Hazard-specific guidance">
        <div className="wg-safety-panel-head">
          <div><span className="wg-safety-kicker">BEFORE · DURING · AFTER</span><h2>Hazard-specific safety guidance</h2><p>Generic, source-aligned guidance. Follow current official instructions when they differ.</p></div>
          <span className="wg-safety-badge official">STATIC GUIDANCE</span>
        </div>
        <div className="wg-safety-hazard-tabs" role="tablist" aria-label="Choose a hazard">
          {HAZARDS.map((item) => (
            <button key={item.id} type="button" className="wg-safety-btn" role="tab" aria-selected={hazard === item.id} aria-controls={`prep-${item.id}`} onClick={() => setHazard(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div id={`prep-${activeHazard.id}`} role="tabpanel" className="wg-safety-guidance" style={{ marginTop: "0.65rem" }}>
          <div className="wg-safety-guide-col"><h4>Before</h4><ul>{activeHazard.before.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="wg-safety-guide-col"><h4>During</h4><ul>{activeHazard.during.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="wg-safety-guide-col"><h4>After</h4><ul>{activeHazard.after.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </section>

      <div className="wg-safety-grid two">
        <section className="wg-safety-panel" aria-label="Household emergency checklist">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">HOUSEHOLD PLAN</span><h2>Emergency checklist</h2><p>Tap each item you have completed. Progress is stored in this browser.</p></div>
            <span className="wg-safety-badge live">{householdDone}/{HOUSEHOLD_ITEMS.length}</span>
          </div>
          <div className="wg-safety-progress" aria-label={`Household checklist ${householdPct} percent complete`}>
            <div className="wg-safety-progress-track"><i style={{ width: `${householdPct}%` }} /></div><b>{householdPct}%</b>
          </div>
          <ul className="wg-safety-checklist">
            {HOUSEHOLD_ITEMS.map((item) => (
              <li key={item}>
                <label className="wg-safety-check">
                  <input type="checkbox" checked={household.has(item)} onChange={() => toggle(setHousehold, HOUSEHOLD_KEY, household, item)} />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="wg-safety-panel" aria-label="Emergency kit checklist">
          <div className="wg-safety-panel-head">
            <div><span className="wg-safety-kicker">GO-BAG / KIT</span><h2>Emergency kit</h2><p>Keep essentials together and check expiry dates every few months.</p></div>
            <span className="wg-safety-badge live">{kitDone}/{KIT_ITEMS.length}</span>
          </div>
          <div className="wg-safety-progress" aria-label={`Emergency kit ${kitPct} percent complete`}>
            <div className="wg-safety-progress-track"><i style={{ width: `${kitPct}%` }} /></div><b>{kitPct}%</b>
          </div>
          <ul className="wg-safety-checklist">
            {KIT_ITEMS.map((item) => (
              <li key={item}>
                <label className="wg-safety-check">
                  <input type="checkbox" checked={kit.has(item)} onChange={() => toggle(setKit, KIT_KEY, kit, item)} />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="wg-safety-panel" aria-label="Family communication and meeting plan">
        <div className="wg-safety-panel-head">
          <div><span className="wg-safety-kicker">FAMILY PLAN</span><h2>Meeting point and communication</h2><p>Saved only in this browser. Keep a paper copy with your documents.</p></div>
          <button type="button" className="wg-safety-btn danger" onClick={reset}>Reset saved plan</button>
        </div>
        <div className="wg-safety-fields">
          <label className="wg-safety-field">Family meeting point<input value={plan.meetingPoint || ""} onChange={(event) => updatePlan("meetingPoint", event.target.value)} placeholder="e.g. nearest school on high ground" /></label>
          <label className="wg-safety-field">Out-of-area contact<input value={plan.outOfAreaContact || ""} onChange={(event) => updatePlan("outOfAreaContact", event.target.value)} placeholder="Name and phone number" /></label>
          <label className="wg-safety-field">Local contact<input value={plan.localContact || ""} onChange={(event) => updatePlan("localContact", event.target.value)} placeholder="Neighbour or relative" /></label>
          <label className="wg-safety-field">Medical / accessibility notes<input value={plan.medicalNotes || ""} onChange={(event) => updatePlan("medicalNotes", event.target.value)} placeholder="Medicines, mobility, infants, pets" /></label>
          <label className="wg-safety-field wide">Additional notes<textarea value={plan.notes || ""} onChange={(event) => updatePlan("notes", event.target.value)} placeholder="Where documents are kept, utility shut-off, pet plan" /></label>
        </div>
        <div className="wg-safety-notice" style={{ marginTop: "0.65rem" }}>
          <strong>Offline note:</strong> checklists and guidance already loaded in this page remain available after a network drop. On a fresh reload without connectivity, the app shell may still need to load. Cached alert timestamps are never refreshed silently.
        </div>
        {onAsk ? <button type="button" className="wg-safety-btn" style={{ marginTop: "0.55rem" }} onClick={() => onAsk(`Review this household emergency plan for ${locationName || "the selected location"}. I have ${householdDone} of ${HOUSEHOLD_ITEMS.length} household checklist items and ${kitDone} of ${KIT_ITEMS.length} kit items. Meeting point: ${plan.meetingPoint || "not set"}. Use only general preparedness guidance and do not invent shelters or official orders.`)}>Ask WeatherGPT to review the plan</button> : null}
      </section>

      <div className="wg-safety-grid two">
        <section className="wg-safety-panel" aria-label="Verified contacts and official links">
          <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">VERIFIED CONTACTS</span><h2>Emergency numbers and official links</h2><p>Static, validated contact list. Verify locally before relying on any number.</p></div></div>
          <div className="wg-safety-links">
            <a href="tel:112">112 · National Emergency</a>
            <a href="tel:1078">1078 · NDMA Helpline</a>
            <a href="tel:1070">1070 · Relief Commissioner</a>
            <a href="tel:18001801717">1800-180-1717 · IMD Helpdesk</a>
          </div>
          <div className="wg-safety-links" style={{ marginTop: "0.5rem" }}>
            <a href="https://ndma.gov.in/" target="_blank" rel="noreferrer">NDMA</a>
            <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">IMD</a>
            <a href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer">NDMA SACHET</a>
            <a href="https://cwc.gov.in/" target="_blank" rel="noreferrer">Central Water Commission</a>
            <a href="https://ndrf.gov.in/" target="_blank" rel="noreferrer">NDRF</a>
          </div>
          <p className="wg-safety-credit" style={{ marginTop: "0.55rem" }}>Emergency numbers can change or be unavailable. Call 112 for immediate danger.</p>
        </section>

        <section className="wg-safety-panel wg-safety-data-gap" aria-label="Shelter and evacuation data gap">
          <div className="wg-safety-panel-head"><div><span className="wg-safety-kicker">NOT INVENTED</span><h2>Shelters and evacuation orders</h2></div></div>
          <p><strong>No verified shelter or evacuation-center feed is connected in this local build.</strong> The app does not display shelter names, capacity, open/closed status, or evacuation orders from an unverified source.</p>
          <p>If authorities have opened a shelter, use the district administration, NDMA/IMD notices, or call 112/1078. Do not travel toward a shelter that has not been confirmed open.</p>
          <p><strong>Cached guidance:</strong> static instructions are bundled with the app and remain readable once loaded. Any saved warning or plan carries its own timestamp; do not treat it as current without a refresh.</p>
        </section>
      </div>

      <details className="wg-safety-panel">
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "0.84rem" }}>Household readiness builder (optional planning tool)</summary>
        <div style={{ marginTop: "0.7rem" }}><BlueprintBuilder risk={null} weather={weather} /></div>
      </details>

      <p className="wg-safety-credit">
        Preparedness content is general safety guidance, not medical advice or an official evacuation instruction. Hero image: Hurricane Florence from the ISS by Alexander Gerst/NASA (public domain), illustrative context only. Hazard imagery is illustrative.
        Official contacts: <a href="https://ndma.gov.in/" target="_blank" rel="noreferrer">NDMA</a> and <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">IMD</a>.
      </p>
    </section>
  );
}
