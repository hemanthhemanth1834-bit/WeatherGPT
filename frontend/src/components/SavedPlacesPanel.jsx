import React, { useEffect, useState } from "react";
import { fetchActiveAlerts, fetchCurrentWeather } from "../services/api";

export default function SavedPlacesPanel({ current, saved, weather, onSelect, onAddCurrent, onRemove }) {
  const [previews, setPreviews] = useState({});
  const [alertNote, setAlertNote] = useState("");
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("weathergpt.profile") || "") || {
        name: "", email: "", phone: "", city: current || "", language: "English",
        units: "Celsius (°C)", notifications: true
      };
    } catch {
      return { name: "", email: "", phone: "", city: current || "", language: "English", units: "Celsius (°C)", notifications: true };
    }
  });
  const names = saved.slice(0, 8);

  const updateProfile = (field, value) => {
    setProfile((prev) => {
      const next = { ...prev, [field]: value };
      try { localStorage.setItem("weathergpt.profile", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const key = names.join("|");

  useEffect(() => {
    let cancelled = false;
    if (!key) return undefined;
    (async () => {
      const entries = {};
      for (const name of names) {
        try {
          const w = await fetchCurrentWeather(name);
          entries[name] = { temp: w.current_temp, cond: w.condition, status: w.status };
        } catch {
          entries[name] = null;
        }
      }
      if (!cancelled) setPreviews(entries);
      try {
        const alerts = await fetchActiveAlerts();
        const hit = alerts.filter((a) => names.some((s) => a.district.toLowerCase().includes(s.toLowerCase())));
        if (!cancelled) setAlertNote(hit.length ? `${hit.length} active alert(s) touch your saved places.` : "No active alerts touch your saved places right now.");
      } catch {
        if (!cancelled) setAlertNote("");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section aria-label="Saved places" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-card" style={{ padding: "1rem 1.2rem", display: "flex", flexWrap: "wrap", gap: "0.8rem", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>★ Saved places</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--wg-muted)" }}>
            Stored only in this browser (localStorage). Current: <strong>{current}</strong>
            {weather && <> · {weather.current_temp}° {weather.condition} · <span className="wg-mono">{weather.status}</span></>}
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "var(--wg-faint)" }}>
            Privacy: your browser location is used to provide local weather and map information.
            Location access is controlled by your browser. Only place names are stored here —
            precise coordinates are sent solely to weather/geocoding providers to fetch your forecast.
          </p>
        </div>
        <button className="wg-btn" onClick={onAddCurrent}>＋ Save current place</button>
      </div>

      <div className="wg-card wg-profile-card">
        <div className="wg-profile-heading">
          <div>
            <h2>👤 Profile Information</h2>
            <p>Keep your basic details and weather preferences ready for a more personal WeatherGPT experience.</p>
          </div>
          <span className="wg-chip static">Stored on this device</span>
        </div>
        <div className="wg-profile-grid">
          <label><span>Full name</span><input className="wg-input" value={profile.name} onChange={(e)=>updateProfile("name",e.target.value)} placeholder="Enter your name" /></label>
          <label><span>Email address</span><input className="wg-input" type="email" value={profile.email} onChange={(e)=>updateProfile("email",e.target.value)} placeholder="name@example.com" /></label>
          <label><span>Phone number <small>(optional)</small></span><input className="wg-input" type="tel" value={profile.phone} onChange={(e)=>updateProfile("phone",e.target.value)} placeholder="+91 XXXXX XXXXX" /></label>
          <label><span>Home city</span><input className="wg-input" value={profile.city} onChange={(e)=>updateProfile("city",e.target.value)} placeholder="Your city" /></label>
          <label><span>Preferred language</span><select className="wg-input" value={profile.language} onChange={(e)=>updateProfile("language",e.target.value)}><option>English</option><option>తెలుగు</option><option>हिन्दी</option><option>தமிழ்</option><option>मराठी</option><option>বাংলা</option><option>ಕನ್ನಡ</option><option>മലയാളം</option></select></label>
          <label><span>Temperature units</span><select className="wg-input" value={profile.units} onChange={(e)=>updateProfile("units",e.target.value)}><option>Celsius (°C)</option><option>Fahrenheit (°F)</option></select></label>
        </div>
        <div className="wg-profile-preferences">
          <label><input type="checkbox" checked={profile.notifications} onChange={(e)=>updateProfile("notifications",e.target.checked)} /> Weather and safety notifications</label>
          <span>✓ Preferences save automatically</span>
        </div>
      </div>

      {alertNote && <div className="wg-alert info" role="status">{alertNote}</div>}

      {saved.length === 0 && (
        <div className="wg-alert info" role="status">No saved places yet — search any city and it is remembered automatically, or save the current one.</div>
      )}

      <div className="wg-grid-panels">
        {saved.map((name) => {
          const p = previews[name];
          return (
            <div key={name} className="wg-card hoverable" style={{ padding: "0.95rem 1.05rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <strong>{name}</strong>
                <button className="wg-btn-ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => onRemove(name)} aria-label={`Remove ${name}`}>✕</button>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--wg-muted)", marginTop: "0.3rem" }}>
                {p === undefined ? "Loading preview…" : p === null ? "Preview unavailable (offline?)" : <>{p.temp}° · {p.cond} · <span className="wg-mono">{p.status}</span></>}
              </div>
              <button className="wg-btn" style={{ marginTop: "0.6rem", width: "100%" }} onClick={() => onSelect(name)}>
                Open →
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
