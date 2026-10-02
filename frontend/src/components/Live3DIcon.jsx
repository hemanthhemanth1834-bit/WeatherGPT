import React from "react";

const scenes = {
  weather: <><ellipse cx="50" cy="62" rx="29" ry="15" fill="url(#cloud)"/><circle cx="36" cy="52" r="15" fill="url(#cloud)"/><circle cx="53" cy="45" r="19" fill="url(#cloud)"/><circle cx="68" cy="54" r="13" fill="url(#cloud)"/></>,
  rain: <><ellipse cx="50" cy="43" rx="29" ry="15" fill="url(#cloud)"/><circle cx="37" cy="35" r="14" fill="url(#cloud)"/><circle cx="54" cy="29" r="18" fill="url(#cloud)"/><circle cx="69" cy="39" r="12" fill="url(#cloud)"/><path d="M34 58l-5 13M50 58l-5 13M66 58l-5 13" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round"/></>,
  storm: <><ellipse cx="50" cy="38" rx="29" ry="15" fill="url(#storm)"/><circle cx="36" cy="31" r="14" fill="url(#storm)"/><circle cx="54" cy="26" r="18" fill="url(#storm)"/><circle cx="69" cy="36" r="12" fill="url(#storm)"/><path d="M54 45L42 64h10l-4 17 18-25H56z" fill="url(#bolt)"/></>,
  flood: <><path d="M10 57c12-12 23 12 35 0s23 12 35 0v22H10z" fill="url(#water)"/><path d="M14 59c11-9 21 10 31 0s21 9 35 0" fill="none" stroke="#a5f3fc" strokeWidth="3"/><path d="M25 39h50" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round"/><path d="M34 28v24M66 28v24" stroke="#64748b" strokeWidth="5"/></>,
  solar: <><circle cx="50" cy="48" r="19" fill="url(#sun)"/><g stroke="#fde68a" strokeWidth="4" strokeLinecap="round"><path d="M50 12v10M50 74v10M14 48h10M76 48h10M25 23l7 7M68 66l7 7M75 23l-7 7M32 66l-7 7"/></g></>,
  tree: <><path d="M46 56h9v24h-9z" fill="#7c4a22"/><path d="M50 14C38 28 27 34 34 47c-7 3-6 16 7 16 2 11 20 11 22 0 13 0 14-14 6-18 5-13-7-19-12-31-2-5-5-5-7 0z" fill="url(#leaf)"/></>,
  farm: <><path d="M16 72Q50 39 84 72" fill="none" stroke="#84cc16" strokeWidth="7"/><path d="M28 68c5-20 9-30 14-39M47 68c2-23 3-34 3-45M65 68c-3-20-7-31-12-40" stroke="#4ade80" strokeWidth="5" strokeLinecap="round"/><path d="M12 76h76" stroke="#92400e" strokeWidth="5"/></>,
  road: <><path d="M23 86L38 10h24l15 76z" fill="url(#road)"/><path d="M50 17v15M50 43v15M50 69v12" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round"/><path d="M12 86h76" stroke="#64748b" strokeWidth="5"/></>,
  trip: <><path d="M15 65C28 25 42 72 58 38s18-3 27-22" fill="none" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round"/><circle cx="15" cy="65" r="7" fill="#22c55e"/><circle cx="85" cy="16" r="7" fill="#f43f5e"/><path d="M48 20l5 10 11 1-8 7 3 11-11-6-10 6 3-11-8-7 11-1z" fill="#fbbf24"/></>,
  map: <><path d="M14 25l24-10 24 10 24-10v55L62 80 38 70 14 80z" fill="url(#map)"/><path d="M38 15v55M62 25v55" stroke="#94a3b8" strokeWidth="3"/><circle cx="57" cy="43" r="10" fill="#fb7185"/><circle cx="57" cy="43" r="4" fill="#fff"/></>,
  alert: <><path d="M50 10L91 83H9z" fill="url(#alert)"/><path d="M50 31v25" stroke="#fff" strokeWidth="7" strokeLinecap="round"/><circle cx="50" cy="68" r="4" fill="#fff"/></>,
  ai: <><rect x="19" y="22" width="62" height="56" rx="15" fill="url(#ai)"/><circle cx="38" cy="48" r="6" fill="#67e8f9"/><circle cx="62" cy="48" r="6" fill="#67e8f9"/><path d="M36 64h28M50 22V11" stroke="#67e8f9" strokeWidth="4" strokeLinecap="round"/><circle cx="50" cy="8" r="4" fill="#22d3ee"/></>,
  satellite: <><path d="M37 37l26 26-12 12-26-26z" fill="url(#sat)"/><path d="M25 25l14 14M61 61l14 14" stroke="#94a3b8" strokeWidth="5"/><path d="M15 15l18 18M67 67l18 18" stroke="#38bdf8" strokeWidth="4"/></>,
  settings: <><circle cx="50" cy="50" r="23" fill="url(#gear)"/><circle cx="50" cy="50" r="9" fill="#0f172a"/><path d="M50 9v12M50 79v12M9 50h12M79 50h12" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round"/></>,
  live: <><circle cx="50" cy="50" r="25" fill="url(#live)"/><circle cx="50" cy="50" r="9" fill="#fff"/></>
};

export default function Live3DIcon({ kind = "weather", size = "sm", label }) {
  const scene = scenes[kind] || scenes.weather;
  return <span className={`wg-live3d wg-live3d-${size}`} aria-label={label} title={label}>
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="cloud" x1="20" y1="15" x2="75" y2="85"><stop stopColor="#f8fafc"/><stop offset=".45" stopColor="#bae6fd"/><stop offset="1" stopColor="#64748b"/></linearGradient>
        <linearGradient id="storm" x1="20" y1="15" x2="75" y2="85"><stop stopColor="#cbd5e1"/><stop offset=".5" stopColor="#475569"/><stop offset="1" stopColor="#111827"/></linearGradient>
        <linearGradient id="bolt" x1="35" y1="40" x2="70" y2="80"><stop stopColor="#fef08a"/><stop offset="1" stopColor="#f59e0b"/></linearGradient>
        <linearGradient id="water" x1="10" y1="45" x2="90" y2="85"><stop stopColor="#67e8f9"/><stop offset="1" stopColor="#0369a1"/></linearGradient>
        <linearGradient id="sun" x1="30" y1="25" x2="70" y2="70"><stop stopColor="#fff7ae"/><stop offset=".6" stopColor="#fbbf24"/><stop offset="1" stopColor="#ea580c"/></linearGradient>
        <linearGradient id="leaf" x1="25" y1="20" x2="75" y2="70"><stop stopColor="#bbf7d0"/><stop offset=".5" stopColor="#22c55e"/><stop offset="1" stopColor="#166534"/></linearGradient>
        <linearGradient id="road" x1="30" y1="15" x2="70" y2="85"><stop stopColor="#64748b"/><stop offset=".5" stopColor="#1e293b"/><stop offset="1" stopColor="#020617"/></linearGradient>
        <linearGradient id="map" x1="10" y1="15" x2="85" y2="80"><stop stopColor="#a7f3d0"/><stop offset=".5" stopColor="#0f766e"/><stop offset="1" stopColor="#164e63"/></linearGradient>
        <linearGradient id="alert" x1="20" y1="15" x2="80" y2="85"><stop stopColor="#fecdd3"/><stop offset=".5" stopColor="#f43f5e"/><stop offset="1" stopColor="#881337"/></linearGradient>
        <linearGradient id="ai" x1="20" y1="20" x2="80" y2="80"><stop stopColor="#a5f3fc"/><stop offset=".5" stopColor="#0891b2"/><stop offset="1" stopColor="#164e63"/></linearGradient>
        <linearGradient id="sat" x1="20" y1="20" x2="80" y2="80"><stop stopColor="#e2e8f0"/><stop offset=".5" stopColor="#64748b"/><stop offset="1" stopColor="#1e293b"/></linearGradient>
        <linearGradient id="gear" x1="25" y1="25" x2="75" y2="75"><stop stopColor="#e2e8f0"/><stop offset=".5" stopColor="#64748b"/><stop offset="1" stopColor="#1e293b"/></linearGradient>
        <radialGradient id="live"><stop stopColor="#86efac"/><stop offset=".55" stopColor="#16a34a"/><stop offset="1" stopColor="#14532d"/></radialGradient>
      </defs>
      <ellipse cx="50" cy="88" rx="34" ry="6" fill="rgba(0,0,0,.35)"/>
      <g style={{filter:"drop-shadow(0 7px 5px rgba(0,0,0,.35))"}}>{scene}</g>
    </svg>
    <span className="wg-live3d-live-dot" />
  </span>;
}
