import React, { useEffect, useState } from "react";

const STORAGE_KEY = "weathergpt.profile";

const emptyProfile = (city = "") => ({
  name: "",
  email: "",
  phone: "",
  city,
  language: "English",
  units: "Celsius (°C)",
  notifications: true,
});

export default function SavedPlacesPanel({ current }) {
  const [profile, setProfile] = useState(() => emptyProfile(current || ""));
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProfile({ ...emptyProfile(current || ""), ...JSON.parse(saved) });
    } catch {
      // Keep the empty local profile if stored data is unavailable.
    }
  }, [current]);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setMessage("Unsaved changes");
  };

  const saveProfile = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setMessage("✓ Saved on this device");
    } catch {
      setMessage("Could not save profile");
    }
  };

  return (
    <section className="wg-user-account" aria-label="User Account">
      <div className="wg-card wg-profile-card">
        <div className="wg-profile-heading">
          <div>
            <h2>👤 Profile Information</h2>
            <p>Your basic details and weather preferences are stored locally in this browser.</p>
          </div>
          <button className="wg-btn" onClick={saveProfile}>💾 Save changes</button>
        </div>
        <div className="wg-profile-grid">
          <label><span>Full name</span><input className="wg-input" value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} placeholder="Enter your name" /></label>
          <label><span>Email address</span><input className="wg-input" type="email" value={profile.email} onChange={(e) => updateProfile("email", e.target.value)} placeholder="name@example.com" /></label>
          <label><span>Phone number <small>(optional)</small></span><input className="wg-input" type="tel" value={profile.phone} onChange={(e) => updateProfile("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" /></label>
          <label><span>Home city</span><input className="wg-input" value={profile.city} onChange={(e) => updateProfile("city", e.target.value)} placeholder="Your city" /></label>
          <label><span>Preferred language</span><select className="wg-input" value={profile.language} onChange={(e) => updateProfile("language", e.target.value)}><option>English</option><option>తెలుగు</option><option>हिन्दी</option><option>தமிழ்</option><option>मराठी</option><option>বাংলা</option><option>ಕನ್ನಡ</option><option>മലയാളം</option></select></label>
          <label><span>Temperature units</span><select className="wg-input" value={profile.units} onChange={(e) => updateProfile("units", e.target.value)}><option>Celsius (°C)</option><option>Fahrenheit (°F)</option></select></label>
        </div>
        <div className="wg-profile-preferences">
          <label><input type="checkbox" checked={profile.notifications} onChange={(e) => updateProfile("notifications", e.target.checked)} /> Weather and safety notifications</label>
          <span>{message || "Saved only when you select Save changes"}</span>
        </div>
      </div>
    </section>
  );
}
