import React, { useEffect, useMemo, useState } from "react";
import Live3DIcon from "./Live3DIcon";
import Solar3DScene from "./Solar3DScene";

const MODULES = {
  life_cast: ["SECTORAL INTELLIGENCE","Life Cast","Personal lifestyle weather forecasts for jogging, cycling, laundry drying, drone flights, and outdoor health ratings.",["Outdoor Activity","Health & Comfort","Laundry & Drying","Drone / Cycling"]],
  roadwatch: ["TRANSPORT INTELLIGENCE","RoadWatch Transit","Highway hydroplaning risks, dense-fog visibility warnings, and crosswind alerts.",["Hydroplaning Watch","Visibility Watch","Crosswind Watch","Radar & Route"]],
  treeguard: ["URBAN CANOPY","TreeGuard Urban Canopy","Urban tree vulnerability, branch-fall danger, windthrow risk, and root-anchorage context.",["Windthrow Risk","Branch-Fall Watch","Urban Exposure","Climate Context"]],
  trip_planner: ["TRAVEL INTELLIGENCE","Weather Trip Planner","Multi-waypoint routing with weather-at-arrival forecasting and departure optimization.",["Departure Window","Arrival Weather","Multi-Waypoint","Hazard Overlay"]],
  utilitywatch: ["UTILITY INTELLIGENCE","UtilityWatch","Weather-aware operational context for utilities, infrastructure and public services.",["Storm Exposure","Heat Stress","Flood Context","Live Providers"]],
  solar: ["CLEAN ENERGY","Solar & Clean Energy","Solar photovoltaic intelligence with transparent irradiance, daylight, cloud-impact and rooftop generation estimates.",["Solar Potential","Generation Estimate","Cloud Impact","Cleaning Window"]],
  deep_cast: ["AI METEOROLOGY","AI Weather Deep-Cast","NWP-focused weather intelligence with model provenance, hourly forecasts and scenario analysis.",["NWP Models","Soundings","7-Day Synoptic","Provider Health"]],
  evacuation: ["DISASTER EARLY WARNING","Disaster & Evacuation Hub","Weather hazards, alert information and GIS overlays for emergency decision support.",["Active Alerts","Evacuation Map","FloodWatch","Emergency Contacts"]]
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hourValue(value, fallback) {
  const m = String(value || "").match(/(\d{1,2})(?::(\d{2}))?/);
  return m ? num(m[1]) + num(m[2]) / 60 : fallback;
}

function SolarDashboard({ weather, place, onTab, onAsk }) {
  const [ratedKw, setRatedKw] = useState(5);
  const [view, setView] = useState("overview");
  const [tilt, setTilt] = useState(18);
  const [azimuthDeg, setAzimuthDeg] = useState(180);
  const [animationOn, setAnimationOn] = useState(true);
  const [motionProgress, setMotionProgress] = useState(0);
  const [hoverExplain, setHoverExplain] = useState(null);

  const data = useMemo(() => {
    const uv = Math.max(0, num(weather?.uv_index, 4.8));
    const cloud = Math.min(100, Math.max(0, num(weather?.cloud_cover, weather?.cloud_cover_pct ?? 42)));
    const humidity = Math.min(100, Math.max(0, num(weather?.humidity, 60)));
    const sunrise = weather?.sunrise || "06:13";
    const sunset = weather?.sunset || "18:06";
    const daylight = Math.max(0, hourValue(sunset, 18.1) - hourValue(sunrise, 6.2));
    const altitude = Math.max(0, Math.min(90, 90 - uv * 10));
    const azimuth = Math.round((hourValue(sunrise, 6.2) + hourValue(sunset, 18.1)) * 18.5);
    const clearSky = Math.max(0, 100 - cloud);
    const psh = Math.max(0, +(daylight * Math.min(1.2, uv / 10) * (1 - cloud / 140)).toFixed(2));
    const daily = +(psh * ratedKw).toFixed(2);
    const peak = +(ratedKw * Math.min(1, Math.max(.2, (clearSky / 100) * (.55 + uv / 16)))).toFixed(2);
    const co2 = +(daily * 0.71).toFixed(2);
    const savings = +(daily * 7.95).toFixed(2);
    const noonHour = (hourValue(sunrise, 6.2) + hourValue(sunset, 18.1)) / 2;
    const loss = Math.round(Math.min(85, cloud * .9));
    const profile = Array.from({ length: 15 }, (_, i) => {
      const h = 5 + i;
      const x = Math.max(0, Math.sin(((h - hourValue(sunrise, 6.2)) / daylight) * Math.PI));
      const cloudFactor = Math.max(.15, 1 - cloud / 130);
      return +(peak * x * cloudFactor * (0.86 + 0.14 * Math.sin(i / 2))).toFixed(2);
    });
    return { uv, cloud, humidity, sunrise, sunset, daylight, altitude, azimuth, clearSky, psh, daily, peak, co2, savings, noonHour, loss, profile };
  }, [weather, ratedKw]);

  useEffect(() => {
    if (!animationOn) return undefined;
    let frame = 0;
    const tick = () => {
      setMotionProgress(p => (p + 0.0028) % 1);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animationOn]);

  const maxProfile = Math.max(...data.profile, 1);
  const animatedSolarIndex = motionProgress * Math.max(data.profile.length - 1, 1);
  const animatedProfileIndex = Math.min(data.profile.length - 1, Math.max(0, Math.floor(animatedSolarIndex)));
  const trajectoryT = animationOn ? motionProgress : 0.62;
  const trajectoryLeft = 14 + 72 * trajectoryT;
  const trajectoryTop = 19 + 70 * (1 - Math.sin(Math.PI * trajectoryT));
  const currentSolarIndex = Math.min(data.profile.length - 1, Math.max(0, Math.round((data.uv / 12) * (data.profile.length - 1))));
  const adjustedYield = +(data.daily * Math.max(.55, 1 - Math.abs(tilt - 20) * .006) * Math.max(.75, 1 - Math.abs(azimuthDeg - 180) / 720)).toFixed(2);
  const chartW = 720, chartH = 280, pad = 42;
  const points = data.profile.map((v, i) => {
    const x = pad + (i / (data.profile.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - (v / maxProfile) * (chartH - pad * 2);
    return [x, y];
  });
  const line = points.map(([x,y]) => x + "," + y).join(" ");
  const area = pad + "," + (chartH-pad) + " " + line + " " + (chartW-pad) + "," + (chartH-pad);
  const explainForHour = (hour, generation, clearSky) => {
    const daylightT = data.daylight > 0 ? Math.max(0, Math.min(1, (hour - hourValue(data.sunrise, 6.2)) / data.daylight)) : 0;
    const elevation = Math.max(0, Math.sin(daylightT * Math.PI) * Math.max(8, data.altitude));
    const phase = hour < hourValue(data.sunrise, 6.2) + 0.35
      ? "Sunrise phase"
      : hour > hourValue(data.sunset, 18.1) - 0.35
        ? "Sunset phase"
        : Math.abs(hour - data.noonHour) < 0.75
          ? "Solar-noon phase"
          : "Daylight phase";
    const impact = data.cloud >= 70 ? "Heavy cloud attenuation is reducing usable solar power."
      : data.cloud >= 40 ? "Cloud cover is reducing the clear-sky potential."
      : "Low cloud attenuation leaves most of the clear-sky potential available.";
    return { phase, elevation, impact, generation, clearSky };
  };
  const handleChartPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const rawIndex = x * Math.max(data.profile.length - 1, 1);
    const index = Math.min(data.profile.length - 1, Math.max(0, Math.round(rawIndex)));
    const hour = 5 + index;
    const generation = data.profile[index] ?? 0;
    const clearSky = Math.max(0, 100 - data.cloud);
    const detail = explainForHour(hour, generation, clearSky);
    setHoverExplain({
      kind: "chart",
      left: Math.max(8, Math.min(rect.width - 248, event.clientX - rect.left + 14)),
      top: Math.max(8, event.clientY - rect.top - 128),
      time: `${String(Math.floor(hour)).padStart(2, "0")}:00`,
      ...detail,
    });
  };
  const handleSunPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const hour = hourValue(data.sunrise, 6.2) + x * data.daylight;
    const detail = explainForHour(hour, data.peak * Math.max(0, Math.sin(x * Math.PI)), Math.max(0, 100 - data.cloud));
    setHoverExplain({
      kind: "trajectory",
      left: Math.max(8, Math.min(rect.width - 248, event.clientX - rect.left + 14)),
      top: Math.max(8, event.clientY - rect.top - 126),
      time: `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`,
      ...detail,
    });
  };

  return (
    <section className="wg-solar-page" aria-label="Solar Energy Potential">
      <style>{`
        .wg-solar-page{--solar-gold:#fbbf24;--solar-orange:#f59e0b;--solar-cyan:#22d3ee;--solar-green:#10b981;--solar-purple:#a78bfa;color:#e5edf9}
        .wg-solar-page *{box-sizing:border-box}
        .wg-solar-3d-scene{position:absolute;right:0;top:0;width:46%;height:100%;opacity:.92;pointer-events:none;mask-image:linear-gradient(90deg,transparent 0%,black 28%,black 100%)}.wg-solar-3d-scene canvas{display:block;width:100%!important;height:100%!important}.wg-solar-hero{position:relative;overflow:hidden;padding:1.9rem 2.1rem;border:1px solid rgba(245,158,11,.34);border-radius:28px;background:radial-gradient(circle at 90% 20%,rgba(245,158,11,.12),transparent 35%),linear-gradient(120deg,rgba(15,31,58,.96),rgba(24,27,42,.94));box-shadow:inset 0 1px rgba(255,255,255,.06),0 20px 55px rgba(0,0,0,.2)}
        .wg-solar-hero:after{content:"";position:absolute;left:42%;top:-30%;height:180%;width:2px;background:linear-gradient(transparent,rgba(34,211,238,.45),transparent);transform:rotate(1deg)}
        .wg-solar-kicker{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}
        .wg-solar-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#f59e0b;color:#081426;box-shadow:0 8px 25px rgba(245,158,11,.25)}
        .wg-solar-badge{padding:.48rem .8rem;border-radius:999px;font-size:.72rem;font-weight:900;letter-spacing:.05em;border:1px solid rgba(245,158,11,.45);background:rgba(245,158,11,.1);color:#fbbf24}
        .wg-solar-badge.warn{border-color:rgba(244,63,94,.5);background:rgba(244,63,94,.1);color:#fda4af}
        .wg-solar-title-row{display:grid;grid-template-columns:minmax(240px,1fr) minmax(220px,.8fr) auto;gap:1.4rem;align-items:center;margin-top:1rem}
        .wg-solar-title-row h1{margin:0;font-size:2.45rem;line-height:.98;letter-spacing:-.045em;color:#f5f7fb}
        .wg-solar-location{font-size:1.35rem;color:#94a3b8}
        .wg-solar-hero-copy{position:relative;z-index:2;margin:.9rem 0 0;max-width:900px;color:#cbd5e1;font-size:1rem;line-height:1.65}
        .wg-solar-array{position:relative;z-index:3;padding:.8rem 1rem;border:1px solid rgba(148,163,184,.15);border-radius:20px;background:rgba(2,8,23,.6);min-width:245px}
        .wg-solar-array small{display:block;color:#94a3b8;font-weight:800;font-size:.65rem;letter-spacing:.08em}
        .wg-solar-array strong{color:#fbbf24;font-size:1.1rem}
        .wg-solar-array-buttons{display:flex;gap:.35rem;margin-top:.45rem}
        .wg-solar-array-buttons button,.wg-solar-tabs button{border:0;border-radius:999px;background:#18243a;color:#a8b6ca;padding:.48rem .7rem;font-weight:800;cursor:pointer}
        .wg-solar-array-buttons button.active,.wg-solar-tabs button.active{background:#f59e0b;color:#07111f;box-shadow:0 5px 18px rgba(245,158,11,.22)}
        .wg-solar-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.9rem;margin-top:1rem}
        .wg-solar-card{min-height:180px;padding:1.2rem;border-radius:26px;border:1px solid rgba(148,163,184,.14);background:linear-gradient(145deg,rgba(15,28,50,.98),rgba(15,23,42,.9));box-shadow:inset 0 1px rgba(255,255,255,.035),0 15px 35px rgba(0,0,0,.16);overflow:hidden}
        .wg-solar-card.cyan{border-color:rgba(34,211,238,.3)}.wg-solar-card.purple{border-color:rgba(167,139,250,.3)}.wg-solar-card.green{border-color:rgba(16,185,129,.3)}
        .wg-solar-card-head{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start;color:#fbbf24;font-weight:900}
        .wg-solar-card.cyan .wg-solar-card-head{color:#22d3ee}.wg-solar-card.purple .wg-solar-card-head{color:#c4b5fd}.wg-solar-card.green .wg-solar-card-head{color:#34d399}
        .wg-solar-card-value{margin:1.2rem 0 .25rem;font-size:2.35rem;font-weight:950;letter-spacing:-.04em;color:#f8fafc}.wg-solar-card-value span{font-size:1rem;color:inherit}
        .wg-solar-card-sub{color:#94a3b8;font-size:.75rem}.wg-solar-card-sub b{color:#e2e8f0}
        .wg-solar-progress{height:9px;border-radius:99px;background:#26344b;margin-top:1.1rem;overflow:hidden}.wg-solar-progress i{display:block;height:100%;width:var(--w);border-radius:inherit;background:#fbbf24}
        .wg-solar-tabs{display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;margin:1rem 0;border-bottom:1px solid rgba(148,163,184,.13);padding-bottom:.8rem}
        .wg-solar-tabs button{border-radius:999px}.wg-solar-tabs span{margin-left:auto;color:#94a3b8;font-size:.72rem}
        .wg-solar-main{display:grid;grid-template-columns:minmax(300px,.72fr) minmax(480px,1.28fr);gap:1rem}
        .wg-solar-panel{padding:1.3rem;border:1px solid rgba(148,163,184,.12);border-radius:26px;background:linear-gradient(145deg,rgba(12,27,49,.97),rgba(8,18,35,.96));box-shadow:inset 0 1px rgba(255,255,255,.03)}
        .wg-solar-panel-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.wg-solar-panel-head h2{margin:0;font-size:1rem}.wg-solar-panel-head p{margin:.3rem 0 0;color:#8190a6;font-size:.72rem}
        .wg-solar-mini{padding:.55rem .7rem;border-radius:9px;background:#1d2a40;color:#b6c3d5;font:700 .65rem ui-monospace,monospace}
        .wg-solar-sunbox{position:relative;margin-top:1rem;height:190px;cursor:crosshair;border:1px solid rgba(148,163,184,.12);border-radius:18px;background:radial-gradient(circle at 72% 42%,rgba(245,158,11,.2),transparent 17%),linear-gradient(180deg,#0c1b32,#071426);overflow:hidden}
        .wg-solar-arc{position:absolute;width:72%;height:70%;left:14%;top:19%;border:5px dashed rgba(245,158,11,.42);border-bottom:0;border-radius:100% 100% 0 0;transform:rotate(0deg)}
        .wg-solar-sun{position:absolute;right:20%;top:37%;width:32px;height:32px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 9px rgba(245,158,11,.12),0 0 35px rgba(245,158,11,.65)}
        .wg-solar-dash{position:absolute;left:14%;right:14%;bottom:35px;border-top:2px dashed #52637b}.wg-solar-sun-label{position:absolute;top:16px;left:50%;transform:translateX(-50%);font-size:.63rem;color:#fbbf24;font-weight:900}
        .wg-solar-sun-times{position:absolute;bottom:10px;left:8%;right:8%;display:flex;justify-content:space-between;font-size:.63rem;color:#cbd5e1}
        .wg-solar-stats{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-top:.7rem}.wg-solar-stat{padding:.85rem;border-radius:16px;background:#070f21}.wg-solar-stat small{display:block;color:#718096;font-size:.6rem;font-weight:900;text-transform:uppercase}.wg-solar-stat strong{display:block;margin-top:.35rem;font-size:1rem}.wg-solar-stat em{font-style:normal;color:#fbbf24;font-size:.65rem}
        .wg-solar-chart-wrap{margin-top:.7rem;overflow:hidden}.wg-solar-chart{width:100%;height:auto;display:block}.wg-solar-chart text{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#7f8ea3}.wg-solar-chart-grid{stroke:rgba(148,163,184,.12);stroke-dasharray:3 8}.wg-solar-actual{fill:rgba(245,158,11,.2)}.wg-solar-ceiling{fill:none;stroke:#38bdf8;stroke-width:3;stroke-dasharray:5 7}.wg-solar-line{fill:none;stroke:#f59e0b;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(245,158,11,.5))}

        /* Full-page 3D solar interaction layer — LIVE MOTION */
        .wg-solar-page{perspective:1400px}
        .wg-solar-hero,.wg-solar-panel,.wg-solar-card{transform-style:preserve-3d}
        .wg-solar-3d-scene{position:absolute;right:0;top:0;width:55%;height:100%;opacity:.96;pointer-events:none;mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.3) 22%,black 55%,black 100%);z-index:1}
        .wg-solar-3d-scene canvas{display:block;width:100%!important;height:100%!important}
        .wg-solar-kicker,.wg-solar-title-row,.wg-solar-hero-copy{position:relative;z-index:3}
        .wg-solar-card{position:relative;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .35s}
        .wg-solar-card:hover{transform:translateY(-7px) rotateX(3deg) rotateY(-2deg);box-shadow:0 22px 45px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.06)}
        .wg-solar-card:before{content:"";position:absolute;inset:-40% -30%;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.055) 48%,transparent 56%);transform:translateX(-55%);animation:wgSolarShimmer 5.5s ease-in-out infinite;pointer-events:none}
        @keyframes wgSolarShimmer{0%,55%{transform:translateX(-55%)}75%,100%{transform:translateX(55%)}}
        .wg-solar-card-value{animation:wgSolarValuePulse 3.2s ease-in-out infinite}
        @keyframes wgSolarValuePulse{0%,100%{text-shadow:0 0 0 rgba(251,191,36,0)}50%{text-shadow:0 0 18px rgba(251,191,36,.16)}}
        .wg-solar-tabs button{transition:transform .25s,box-shadow .25s,background .25s}
        .wg-solar-tabs button:hover{transform:translateY(-2px)}
        .wg-solar-panel:hover{transform:translateY(-3px);box-shadow:0 24px 50px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.045)}
        .wg-solar-sun{animation:wgSunPulse 2.4s ease-in-out infinite;transition:left .04s linear,top .04s linear;will-change:left,top,transform}
        .wg-solar-sun.is-traveling{animation:wgSunTravelGlow 1.8s ease-in-out infinite}
        @keyframes wgSunTravelGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}
        @keyframes wgSunPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 9px rgba(245,158,11,.12),0 0 35px rgba(245,158,11,.65)}50%{transform:scale(1.18);box-shadow:0 0 0 15px rgba(245,158,11,.08),0 0 52px rgba(245,158,11,.82)}}
        .wg-solar-arc{animation:wgArcGlow 3.8s ease-in-out infinite}
        @keyframes wgArcGlow{0%,100%{opacity:.58}50%{opacity:1;filter:drop-shadow(0 0 8px rgba(245,158,11,.35))}}
        .wg-solar-chart-wrap{position:relative;cursor:crosshair}
        .wg-solar-hover-explain{position:absolute;z-index:8;width:232px;padding:.72rem .78rem;border:1px solid rgba(251,191,36,.34);border-radius:14px;background:rgba(6,14,29,.96);box-shadow:0 14px 32px rgba(0,0,0,.35),0 0 22px rgba(245,158,11,.12);pointer-events:none;backdrop-filter:blur(10px)}
        .wg-solar-hover-explain strong{display:block;color:#fbbf24;font-size:.72rem}.wg-solar-hover-explain b{color:#f8fafc}.wg-solar-hover-explain small{display:block;margin-top:.3rem;color:#94a3b8;font-size:.63rem;line-height:1.45}
        .wg-solar-hover-explain .wg-solar-hover-grid{display:grid;grid-template-columns:1fr 1fr;gap:.28rem .6rem;margin-top:.45rem;color:#cbd5e1;font-size:.62rem}

        .wg-solar-chart-marker{position:absolute;width:13px;height:13px;border-radius:50%;background:#fbbf24;border:2px solid #fff;box-shadow:0 0 0 6px rgba(251,191,36,.13),0 0 20px rgba(251,191,36,.72);pointer-events:none;z-index:2;transition:left .7s ease,top .7s ease}
        .wg-solar-chart-marker.off{opacity:.25}
        .wg-solar-chart-scan{position:absolute;will-change:left;top:7%;bottom:8%;width:1px;background:linear-gradient(transparent,rgba(251,191,36,.55),transparent);box-shadow:0 0 14px rgba(251,191,36,.32);pointer-events:none;z-index:1;transition:left .08s linear}
        .wg-solar-flow-line{fill:none;stroke:rgba(255,255,255,.8);stroke-width:2;stroke-dasharray:2 18;stroke-linecap:round;opacity:.8;animation:wgChartFlow 1.1s linear infinite}
        @keyframes wgChartFlow{to{stroke-dashoffset:-20}}
        .wg-solar-generation-glow{animation:wgGenerationGlow 1.8s ease-in-out infinite}
        @keyframes wgGenerationGlow{0%,100%{opacity:.65}50%{opacity:1}}
        .wg-solar-3d-label{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .55rem;border:1px solid rgba(34,211,238,.25);border-radius:999px;background:rgba(34,211,238,.07);color:#67e8f9;font-size:.62rem;font-weight:900;letter-spacing:.04em}
        .wg-solar-rooftop{position:relative;height:235px;margin-top:1rem;border-radius:22px;background:radial-gradient(circle at 70% 18%,rgba(245,158,11,.18),transparent 28%),linear-gradient(145deg,#0a1830,#050d1c);overflow:hidden;perspective:900px;border:1px solid rgba(148,163,184,.12)}
        .wg-solar-rooftop-ground{position:absolute;left:9%;right:9%;bottom:23px;height:9px;background:linear-gradient(90deg,#263b56,#0f1b30);transform:skewX(-20deg)}
        .wg-solar-rooftop-house{position:absolute;left:14%;bottom:32px;width:72%;height:110px;background:linear-gradient(145deg,#142641,#091426);clip-path:polygon(0 25%,50% 0,100% 25%,100% 100%,0 100%);border:1px solid rgba(94,231,255,.18)}
        .wg-solar-rooftop-panels{position:absolute;left:27%;top:70px;width:46%;height:86px;display:grid;grid-template-columns:repeat(4,1fr);gap:5px;transform:rotateX(58deg) rotateZ(-3deg);transform-origin:center;transition:transform .35s}
        .wg-solar-rooftop-panels span{border:1px solid rgba(94,231,255,.5);background:linear-gradient(135deg,#123d5b,#081a30);box-shadow:inset 0 0 16px rgba(34,211,238,.08);animation:wgPanelEnergy 2.6s ease-in-out infinite}
        @keyframes wgPanelEnergy{0%,100%{filter:brightness(.85)}50%{filter:brightness(1.28);box-shadow:inset 0 0 22px rgba(34,211,238,.16),0 0 15px rgba(34,211,238,.12)}}
        .wg-solar-rooftop-ray{position:absolute;left:60%;top:10px;width:2px;height:130px;background:linear-gradient(#fbbf24,rgba(251,191,36,0));transform:rotate(25deg);transform-origin:top;animation:wgRay 2.8s ease-in-out infinite}
        @keyframes wgRay{0%,100%{opacity:.2}50%{opacity:.8}}
        .wg-solar-control-row{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-top:.9rem}
        .wg-solar-control-row label{display:flex;align-items:center;gap:.45rem;color:#94a3b8;font-size:.7rem;font-weight:800}
        .wg-solar-control-row input[type=range]{accent-color:#f59e0b;width:150px}
        .wg-solar-control-value{min-width:48px;text-align:center;padding:.35rem .45rem;border-radius:8px;background:#071426;color:#fbbf24;font:800 .68rem ui-monospace,monospace}
        .wg-solar-outlook{display:grid;grid-template-columns:repeat(7,1fr);gap:.55rem;align-items:end;margin-top:1rem;min-height:220px}
        .wg-solar-outlook-day{height:200px;display:flex;flex-direction:column;justify-content:flex-end;gap:.45rem;padding:.65rem;border:1px solid rgba(148,163,184,.1);border-radius:17px;background:linear-gradient(180deg,rgba(20,36,60,.8),rgba(8,17,32,.95));transform-style:preserve-3d;transition:transform .3s}
        .wg-solar-outlook-day:hover{transform:translateY(-7px) rotateX(4deg)}
        .wg-solar-outlook-bar{height:var(--h);min-height:18px;border-radius:10px 10px 5px 5px;background:linear-gradient(180deg,#fbbf24,#f59e0b);box-shadow:0 0 22px rgba(245,158,11,.2);animation:wgBarRise 1s cubic-bezier(.2,.8,.2,1) both}
        @keyframes wgBarRise{from{height:0;opacity:0}to{height:var(--h);opacity:1}}
        .wg-solar-custom-grid{display:grid;grid-template-columns:minmax(280px,1fr) minmax(280px,1fr);gap:1rem;margin-top:1rem}
        .wg-solar-custom-panel{padding:1rem;border:1px solid rgba(148,163,184,.12);border-radius:22px;background:#0a162a}
        .wg-solar-energy-flow{display:flex;align-items:center;gap:.5rem;margin-top:.8rem;color:#fbbf24;font-size:.65rem;font-weight:900}
        .wg-solar-energy-flow i{height:2px;flex:1;background:linear-gradient(90deg,#fbbf24,#22d3ee);position:relative;overflow:hidden}
        .wg-solar-energy-flow i:after{content:"";position:absolute;left:-20%;top:-2px;width:20%;height:6px;background:#fff;filter:blur(2px);animation:wgFlow 1.7s linear infinite}
        @keyframes wgFlow{to{left:120%}}
        @media(max-width:760px){.wg-solar-outlook{grid-template-columns:repeat(4,1fr)}.wg-solar-custom-grid{grid-template-columns:1fr}.wg-solar-rooftop{height:210px}}
        @media(max-width:650px){.wg-solar-3d-scene{width:100%;opacity:.3}.wg-solar-outlook{grid-template-columns:repeat(2,1fr)}.wg-solar-outlook-day{height:170px}.wg-solar-rooftop-panels{left:21%;width:58%}}
        @media(prefers-reduced-motion:reduce){.wg-solar-card:before,.wg-solar-card-value,.wg-solar-sun,.wg-solar-arc,.wg-solar-rooftop-panels span,.wg-solar-rooftop-ray,.wg-solar-outlook-bar,.wg-solar-energy-flow i:after{animation:none!important}.wg-solar-card,.wg-solar-panel{transition:none!important}.wg-solar-chart-marker{transition:none}}

        .wg-solar-hover-hint{margin-top:.5rem;color:#8190a6;font-size:.62rem;font-weight:800}.wg-solar-callout{margin-top:.8rem;padding:.85rem 1rem;border:1px solid rgba(245,158,11,.28);border-radius:17px;background:linear-gradient(90deg,rgba(245,158,11,.1),rgba(15,23,42,.6));color:#fbbf24;font-weight:900}.wg-solar-callout small{display:block;color:#94a3b8;font-weight:500;margin-top:.3rem}
        .wg-solar-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-top:1rem}.wg-solar-detail{padding:1rem;border:1px solid rgba(148,163,184,.1);border-radius:20px;background:#0b1629}.wg-solar-detail strong{display:block;font-size:.75rem}.wg-solar-detail p{margin:.35rem 0 0;color:#8fa0b6;font-size:.7rem;line-height:1.5}
        .wg-solar-note{margin-top:1rem;padding:.8rem 1rem;border-radius:15px;background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.12);color:#94a3b8;font-size:.72rem;line-height:1.55}
        @media(max-width:1050px){.wg-solar-3d-scene{width:55%;opacity:.55}.wg-solar-title-row{grid-template-columns:1fr}.wg-solar-array{width:100%}.wg-solar-metrics{grid-template-columns:repeat(2,1fr)}.wg-solar-main{grid-template-columns:1fr}}
        @media(max-width:650px){.wg-solar-3d-scene{width:100%;opacity:.25}.wg-solar-hero{padding:1.2rem}.wg-solar-title-row h1{font-size:2rem}.wg-solar-location{font-size:1rem}.wg-solar-metrics,.wg-solar-detail-grid{grid-template-columns:1fr}.wg-solar-card{min-height:150px}.wg-solar-panel{padding:1rem}.wg-solar-tabs span{width:100%;margin-left:0}.wg-solar-chart text{font-size:8px}}
      `}</style>

      <div className="wg-solar-hero">
        <div className="wg-solar-kicker">
          <div className="wg-solar-icon"><Live3DIcon kind="solar" size="md" label="Solar intelligence" /></div>
          <span className="wg-solar-badge">SOLAR PHOTOVOLTAIC INTELLIGENCE</span>
          <span className="wg-solar-badge warn">Cloud Attenuation ({data.cloud.toFixed(0)}%)</span><span className="wg-solar-3d-label">● 3D SOLAR ENGINE</span>
        </div>
        <div className="wg-solar-title-row">
          <h1>Solar Energy<br/>Potential</h1>
          <div className="wg-solar-location">— {place || "Selected location"}</div>
          <div className="wg-solar-array">
            <small>PV ARRAY SIZE</small><strong>{ratedKw} kWp</strong>
            <div className="wg-solar-array-buttons">{[3,5,10,25].map(k => <button key={k} className={ratedKw===k?"active":""} onClick={()=>setRatedKw(k)}>{k}k</button>)}</div>
          </div>
        </div>
        <Solar3DScene cloud={data.cloud} uv={data.uv} ratedKw={ratedKw} altitude={data.altitude} />\n        <p className="wg-solar-hero-copy">Atmospheric solar potential modeled from available UV index, cloud cover and daylight timing. Generation figures are transparent <b>ESTIMATES</b>, not metered PV output.</p>
      </div>

      <div className="wg-solar-metrics">
        <div className="wg-solar-card"><div className="wg-solar-card-head">⚡ Daily Solar Generation <small>ESTIMATED</small></div><div className="wg-solar-card-value">{data.daily.toFixed(2)} <span>kWh/day</span></div><div className="wg-solar-card-sub">Reference array: <b>{ratedKw} kWp</b> · PSH <b>{data.psh}</b></div><div className="wg-solar-progress"><i style={{"--w":Math.min(100, data.psh/8*100)+"%"}}/></div></div>
        <div className="wg-solar-card cyan"><div className="wg-solar-card-head">☼ Real-Time Power Potential <small>MODEL</small></div><div className="wg-solar-card-value">{data.peak.toFixed(2)} <span>kW</span></div><div className="wg-solar-card-sub"><b>{data.clearSky.toFixed(0)}%</b> clear-sky fraction · UV <b>{data.uv.toFixed(1)}</b></div><div className="wg-solar-progress"><i style={{"--w":Math.min(100, data.clearSky)+"%",background:"#22d3ee"}}/></div></div>
        <div className="wg-solar-card purple"><div className="wg-solar-card-head">◉ Insolation &amp; PSH <small>PROXY</small></div><div className="wg-solar-card-value">{data.psh.toFixed(2)} <span>PSH</span></div><div className="wg-solar-card-sub">Daylight <b>{data.daylight.toFixed(1)} h</b> · UV index <b>{data.uv.toFixed(1)}</b></div></div>
        <div className="wg-solar-card green"><div className="wg-solar-card-head">♧ Savings &amp; Clean Offset <small>ESTIMATED</small></div><div className="wg-solar-card-value">₹{data.savings.toFixed(2)} <span>/day</span></div><div className="wg-solar-card-sub"><b>{data.co2.toFixed(2)} kg CO₂</b> estimated avoided emissions/day</div></div>
      </div>

      <div className="wg-solar-tabs">
        {[["overview","Overview & Sun Dome"],["curve","24h Generation Curve"],["outlook","7-Day Solar Outlook"],["custom","Rooftop System Customizer"]].map(([id,label])=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}
        <button onClick={()=>setAnimationOn(v=>!v)} title="Toggle solar motion">{animationOn ? "Motion ON" : "Motion OFF"}</button><span>☼ Solar Noon: <b>{Math.floor(data.noonHour).toString().padStart(2,"0")}:{Math.round((data.noonHour%1)*60).toString().padStart(2,"0")}</b></span>
      </div>

      {view === "overview" && <div className="wg-solar-main">
        <div className="wg-solar-panel">
          <div className="wg-solar-panel-head"><div><h2>☼ Sun Position &amp; Solar Trajectory</h2><p>Solar elevation proxy &amp; azimuth context</p></div><span className="wg-solar-mini">Daylight: {data.daylight.toFixed(1)}h</span></div>
          <div className="wg-solar-sunbox" onPointerMove={handleSunPointerMove} onPointerLeave={() => setHoverExplain(null)}><div className="wg-solar-sun-label">Solar Noon ({Math.floor(data.noonHour)}:{Math.round((data.noonHour%1)*60).toString().padStart(2,"0")})</div><div className="wg-solar-arc"/><div className={"wg-solar-sun"+(animationOn?" is-traveling":"")} style={{left:trajectoryLeft+"%",top:trajectoryTop+"%"}}/><div className="wg-solar-dash"/><div className="wg-solar-sun-times"><span>🌅 Sunrise {data.sunrise}</span><span>Sun Altitude {data.altitude.toFixed(1)}°</span><span>🌇 Sunset {data.sunset}</span></div></div>
          <div className="wg-solar-stats"><div className="wg-solar-stat"><small>Solar Azimuth Bearing</small><strong>{data.azimuth}° <em>(SW)</em></strong></div><div className="wg-solar-stat"><small>Solar Zenith Angle</small><strong>{(90-data.altitude).toFixed(1)}°</strong></div><div className="wg-solar-stat"><small>Cloud Attenuation</small><strong>-{data.loss}% Loss</strong></div><div className="wg-solar-stat"><small>Atmospheric UV Index</small><strong style={{color:"#22d3ee"}}>{data.uv.toFixed(1)} <em style={{color:"#94a3b8"}}>({data.uv<3?"Low":data.uv<6?"Moderate":"High"})</em></strong></div></div>
        </div>
        <div className="wg-solar-panel">
          <div className="wg-solar-panel-head"><div><h2>↗ Daylight Solar Generation Profile (kW)</h2><p>Estimated array output vs. clear-sky ceiling across daylight hours</p></div><span style={{color:"#fbbf24",fontWeight:900}}>● Actual estimate　<span style={{color:"#38bdf8"}}>--- Clear Sky Max</span></span></div>
          <div className="wg-solar-chart-wrap" onPointerMove={handleChartPointerMove} onPointerLeave={() => setHoverExplain(null)}><div className={"wg-solar-chart-marker"+(!animationOn?" off":"")} style={{left:(10+(animatedSolarIndex/Math.max(data.profile.length-1,1))*78)+"%",top:(28+(1-data.profile[animatedProfileIndex]/maxProfile)*48)+"%"}}/><div className="wg-solar-chart-scan" style={{left:(10+(animatedSolarIndex/Math.max(data.profile.length-1,1))*78)+"%"}}/><svg className="wg-solar-chart" viewBox={`0 0 ${chartW} ${chartH}`} role="img" aria-label="Estimated solar generation curve"><line className="wg-solar-chart-grid" x1="42" x2="678" y1="60" y2="60"/><line className="wg-solar-chart-grid" x1="42" x2="678" y1="120" y2="120"/><line className="wg-solar-chart-grid" x1="42" x2="678" y1="180" y2="180"/><line className="wg-solar-chart-grid" x1="42" x2="678" y1="240" y2="240"/><polygon className="wg-solar-actual" points={area}/><polyline className="wg-solar-ceiling" points={data.profile.map((_,i)=>{const h=5+i; const x=pad+(i/(data.profile.length-1))*(chartW-pad*2); const y=chartH-pad-Math.sin(Math.max(0,Math.min(1,(h-hourValue(data.sunrise,6.2))/data.daylight))*Math.PI)*(chartH-pad*2)*.88; return x+","+y}).join(" ")}/><polyline className="wg-solar-line wg-solar-generation-glow" points={line}/><polyline className="wg-solar-flow-line" points={line}/>{[5,7,9,11,13,15,17,19].map(h=><text key={h} x={pad+((h-5)/14)*(chartW-pad*2)} y="270" textAnchor="middle">{String(h).padStart(2,"0")}:00</text>)}</svg>{hoverExplain && <div className="wg-solar-hover-explain" style={{left:hoverExplain.left,top:hoverExplain.top}}><strong>Cursor: {hoverExplain.time} · {hoverExplain.phase}</strong><div className="wg-solar-hover-grid"><span>Generation <b>{hoverExplain.generation.toFixed(2)} kW</b></span><span>Clear sky <b>{hoverExplain.clearSky}%</b></span><span>Sun elevation <b>{hoverExplain.elevation.toFixed(1)}°</b></span><span>Cloud loss <b>{data.loss}%</b></span></div><small>{hoverExplain.impact}</small></div>}</div>
          <div className="wg-solar-hover-hint">↔ Move your cursor across the trajectory or chart — the explanation follows the pointer.</div>
          <div className="wg-solar-callout">☼ Optimal Solar Window: {Math.max(9,Math.floor(data.noonHour-1.7))}:30 AM – {Math.min(17,Math.ceil(data.noonHour+2))}:30 PM<small>Estimated peak generation ≈ {data.peak.toFixed(1)} kW · based on current cloud/UV inputs</small></div>
        </div>
      </div>}

      {view === "curve" && <div className="wg-solar-panel"><div className="wg-solar-panel-head"><div><h2>24h Generation Curve</h2><p>Same transparent model, expanded for hourly interpretation.</p></div></div><div className="wg-solar-chart-wrap"><svg className="wg-solar-chart" viewBox={`0 0 ${chartW} ${chartH}`}><polygon className="wg-solar-actual" points={area}/><polyline className="wg-solar-line wg-solar-generation-glow" points={line}/><polyline className="wg-solar-flow-line" points={line}/>{data.profile.map((v,i)=><circle key={i} cx={points[i][0]} cy={points[i][1]} r="4" fill="#fbbf24"/>)}</svg></div></div>}

      {view === "outlook" && <div className="wg-solar-panel"><div className="wg-solar-panel-head"><div><h2>7-Day Solar Outlook</h2><p>Animated model view; each bar is an estimate derived from current weather context.</p></div><span className="wg-solar-3d-label">3D YIELD FIELD</span></div><div className="wg-solar-outlook">{Array.from({length:7},(_,i)=>{const factor=Math.max(.55,1-i*.045);const y=+(data.daily*factor).toFixed(2);return <div className="wg-solar-outlook-day" key={i}><small>DAY {i+1}</small><div className="wg-solar-outlook-bar" style={{"--h":Math.max(12,Math.min(88,y/Math.max(data.daily,.1)*88))+"%"}}/><strong>{y} kWh</strong><small>{i===0?"NOW":"FORECAST"}</small></div>})}</div></div>}

      {view === "custom" && <div className="wg-solar-custom-grid"><div className="wg-solar-custom-panel"><div className="wg-solar-panel-head"><div><h2>Rooftop System Customizer</h2><p>Interactive design parameters. Output remains an estimate.</p></div><span className="wg-solar-3d-label">3D ROOFTOP</span></div><div className="wg-solar-rooftop"><div className="wg-solar-rooftop-ground"/><div className="wg-solar-rooftop-house"/><div className="wg-solar-rooftop-panels" style={{transform:"rotateX(58deg) rotateZ("+(azimuthDeg-180)/45+"deg) scale("+(1+(tilt-18)/140)+")"}}>{Array.from({length:12},(_,i)=><span key={i}/>)}</div><div className="wg-solar-rooftop-ray"/></div><div className="wg-solar-control-row"><label>Panel tilt <input type="range" min="0" max="45" value={tilt} onChange={e=>setTilt(Number(e.target.value))}/><span className="wg-solar-control-value">{tilt}°</span></label><label>Azimuth <input type="range" min="90" max="270" value={azimuthDeg} onChange={e=>setAzimuthDeg(Number(e.target.value))}/><span className="wg-solar-control-value">{azimuthDeg}°</span></label></div></div><div className="wg-solar-custom-panel"><h2 style={{margin:0,fontSize:"1rem"}}>System Performance Projection</h2><div className="wg-solar-stats"><div className="wg-solar-stat"><small>Reference Array</small><strong>{ratedKw} kWp</strong></div><div className="wg-solar-stat"><small>Adjusted Daily Yield</small><strong>{adjustedYield} kWh</strong></div><div className="wg-solar-stat"><small>Cloud Loss</small><strong>-{data.loss}%</strong></div><div className="wg-solar-stat"><small>Solar Window</small><strong>{data.daylight.toFixed(1)} h</strong></div></div><div className="wg-solar-energy-flow"><span>PV</span><i/><span>INVERTER</span><i/><span>LOAD</span></div><p style={{margin:".9rem 0 0",color:"#8fa0b6",fontSize:".7rem",lineHeight:1.5}}>Engineering inputs such as panel efficiency, shading, temperature coefficient, inverter losses and roof geometry are not measured here. This projection is intentionally labeled ESTIMATED.</p></div></div>}

      <div className="wg-solar-note"><b>Data honesty:</b> Solar values on this screen are ESTIMATED from available weather inputs. They are not utility-meter readings, satellite irradiance measurements, or guaranteed PV production. Actual output varies with panel technology, tilt, azimuth, shading, temperature, inverter efficiency and local irradiance.</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:".5rem",marginTop:".8rem"}}><button className="wg-btn" onClick={()=>onAsk?.("Explain the estimated solar potential and generation for "+place+".")}>Ask WeatherGPT</button><button className="wg-btn-ghost" onClick={()=>onTab("dashboard")}>Live Weather</button><button className="wg-btn-ghost" onClick={()=>onTab("map")}>GIS / Radar</button><button className="wg-btn-ghost" onClick={()=>onTab("capabilities")}>System &amp; Admin</button></div>
    </section>
  );
}

export default function ReferenceModulePanel({ module, weather, onTab, onAsk }) {
  const item = MODULES[module] || MODULES.life_cast;
  const place = weather?.location || "your location";
  if (module === "solar") return <SolarDashboard weather={weather} place={place} onTab={onTab} onAsk={onAsk} />;

  const guidance = {
    life_cast: "This module converts weather conditions into practical outdoor guidance. It explains comfort and activity conditions; it is not medical advice.",
    roadwatch: "This module highlights weather factors that can affect driving, including rain, visibility and wind. Always follow road signs and official traffic instructions.",
    treeguard: "This module explains how wind, rain and environmental conditions can affect urban trees. It is an awareness tool, not a structural safety inspection.",
    trip_planner: "This module uses forecast conditions along a planned journey to help choose timing and understand weather exposure. Forecasts can change between planning and travel.",
    utilitywatch: "This module provides weather context for infrastructure and public services, such as heat, storms and flooding. It does not replace an operator's engineering or emergency procedures.",
    deep_cast: "This module presents numerical weather-model information and scenario analysis. Model output is probabilistic guidance and can change when new data arrives.",
    evacuation: "This module combines weather and geographic information for emergency decision support. For an active emergency, follow official government and emergency-service instructions first."
  }[module] || "This module explains weather information for your selected location and shows how the available data can be used.";

  return (
    <section className="wg-ref-section" aria-label={item[1]}>
      <div className="wg-ref-section-head"><div><span className="wg-chip live">{item[0]}</span><h2>{item[1]}</h2><p style={{color:"var(--wg-muted)",maxWidth:"52rem"}}>{item[2]}</p></div></div>
      <div className="wg-card" style={{padding:"1rem",marginBottom:"1rem",borderLeft:"3px solid var(--wg-accent)"}}><strong>What this module does</strong><p style={{margin:".35rem 0 0",color:"var(--wg-muted)",lineHeight:1.65}}>{guidance}</p><small style={{color:"var(--wg-muted)"}}>Selected location: {place}. Values are shown only when the connected data source provides them.</small></div>
      <div className="wg-ref-feature-grid">{item[3].map((title) => <button className="wg-ref-feature wg-card hoverable" key={title} onClick={() => onAsk?.(item[1] + ": " + title + " for " + place + ".")}><span className="wg-ref-icon"><Live3DIcon kind={module === "evacuation" ? "alert" : module === "roadwatch" ? "road" : module === "treeguard" ? "tree" : module === "trip_planner" ? "trip" : module === "life_cast" ? "life" : module === "deep_cast" ? "ai" : "weather"} size="sm" label={title} /></span><span className="wg-ref-feature-copy"><strong>{title}</strong><span>Shows what this feature means for {place}. Select it to ask WeatherGPT for a plain-language explanation using the available live context.</span><small className="wg-ref-feature-action">Open / Ask WeatherGPT →</small></span><span className="wg-ref-arrow">↗</span></button>)}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:".5rem",marginTop:".8rem"}}><button className="wg-btn" onClick={() => onTab("dashboard")}>Live Weather</button><button className="wg-btn-ghost" onClick={() => onTab("map")}>GIS / Radar</button><button className="wg-btn-ghost" onClick={() => onTab("alerts")}>Alerts</button><button className="wg-btn-ghost" onClick={() => onTab("capabilities")}>System &amp; Admin</button></div>
    </section>
  );
}
