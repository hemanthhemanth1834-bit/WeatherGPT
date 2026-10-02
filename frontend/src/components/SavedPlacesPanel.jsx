import React, { useEffect, useState } from "react";

const STORAGE_KEY = "weathergpt.profile.secure";
const LEGACY_KEY = "weathergpt.profile";

const emptyProfile = (city = "") => ({
  name: "",
  email: "",
  phone: "",
  city,
  language: "English",
  units: "Celsius (°C)",
  notifications: true,
});

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptProfile(profile, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(profile))
  );
  return JSON.stringify({
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 210000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  });
}

async function decryptProfile(blob, password) {
  const record = JSON.parse(blob);
  const salt = base64ToBytes(record.salt);
  const iv = base64ToBytes(record.iv);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBytes(record.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export default function SavedPlacesPanel({ current }) {
  const [profile, setProfile] = useState(() => emptyProfile(current || ""));
  const [locked, setLocked] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [legacyProfile, setLegacyProfile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [encryptionSalt, setEncryptionSalt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    try {
      const secure = localStorage.getItem(STORAGE_KEY);
      if (secure) {
        setHasAccount(true);
        setLocked(true);
        return;
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        setLegacyProfile(JSON.parse(legacy));
      }
    } catch {
      setError("Unable to read the local profile data.");
    }
  }, []);

  const createAccount = async () => {
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const initial = { ...emptyProfile(current || ""), ...(legacyProfile || {}) };
      const keyRecord = JSON.parse(await encryptProfile(initial, password));
      const salt = base64ToBytes(keyRecord.salt);
      const key = await deriveKey(password, salt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keyRecord));
      setEncryptionKey(key);
      localStorage.removeItem(LEGACY_KEY);
      setProfile(initial);
      setHasAccount(true);
      setLocked(false);
      setPassword("");
      setConfirm("");
      setDirty(false);
      setLegacyProfile(null);
      setMessage("Account created. Your profile is encrypted on this device.");
    } catch {
      setError("Could not secure your profile. Please try again.");
    }
  };

  const unlock = async () => {
    setError("");
    setMessage("");
    if (!password) {
      setError("Enter your password.");
      return;
    }
    try {
      const value = await decryptProfile(localStorage.getItem(STORAGE_KEY), password);
      setProfile({ ...emptyProfile(current || ""), ...value });
      const record = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const key = await deriveKey(password, base64ToBytes(record.salt));
      setEncryptionKey(key);
      setEncryptionSalt(salt);
      setLocked(false);
      setPassword("");
      setDirty(false);
    } catch {
      setError("Incorrect password. Your profile remains locked.");
      setPassword("");
    }
  };

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    setMessage("Unsaved changes");
  };

  const saveProfile = async () => {
    setError("");
    if (!encryptionKey) {
      setError("Unlock the account again before saving.");
      return;
    }
    try {
      const salt = encryptionSalt;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        encryptionKey,
        new TextEncoder().encode(JSON.stringify(profile))
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1, algorithm: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: 210000,
        salt: bytesToBase64(salt), iv: bytesToBase64(iv),
        data: bytesToBase64(new Uint8Array(encrypted))
      }));
      setDirty(false);
      setMessage("✓ Saved securely");
    } catch {
      setError("Could not save the encrypted profile.");
    }
  };

  const lock = () => {
    setLocked(true);
    setPassword("");
    setEncryptionKey(null);
    setEncryptionSalt(null);
    setDirty(false);
    setError("");
    setMessage("Profile locked.");
  };

  if (locked && hasAccount) {
    return (
      <section className="wg-user-account" aria-label="User Account">
        <div className="wg-card wg-profile-lock">
          <div className="wg-profile-lock-icon">🔐</div>
          <h2>Private User Account</h2>
          <p>Your profile is encrypted and locked. Enter your password to view or edit your details.</p>
          <label><span>Password</span><input className="wg-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="Enter your password" /></label>
          <button className="wg-btn" onClick={unlock}>Unlock account</button>
          <button className="wg-btn-ghost" type="button" onClick={() => { setForgotMode(true); setError(""); }}>Forgot password?</button>
          {forgotMode && (
            <div className="wg-alert warn" role="alert">
              <strong>Password recovery</strong>
              <p>Your password is never stored, so it cannot be recovered. Resetting the account will permanently delete the encrypted profile on this device.</p>
              <div className="wg-profile-actions">
                <button className="wg-btn-ghost" type="button" onClick={() => setForgotMode(false)}>Cancel</button>
                <button className="wg-btn" type="button" onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setHasAccount(false);
                  setLocked(true);
                  setProfile(emptyProfile(current || ""));
                  setPassword("");
                  setConfirm("");
                  setEncryptionKey(null);
                  setEncryptionSalt(null);
                  setForgotMode(false);
                  setError("");
                  setMessage("Account reset. Create a new password to continue.");
                }}>Reset account</button>
              </div>
            </div>
          )}
          {error && <div className="wg-alert warn" role="alert">{error}</div>}
          <small>Password is never stored. If forgotten, the encrypted profile must be reset on this device.</small>
        </div>
      </section>
    );
  }

  if (locked && !hasAccount) {
    return (
      <section className="wg-user-account" aria-label="User Account">
        <div className="wg-card wg-profile-lock">
          <div className="wg-profile-lock-icon">🔐</div>
          <h2>Create your private account</h2>
          <p>Set a password to protect your WeatherGPT profile. Your password is not stored; your profile is encrypted on this device.</p>
          <label><span>Create password</span><input className="wg-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
          <label><span>Confirm password</span><input className="wg-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAccount()} placeholder="Enter password again" /></label>
          <button className="wg-btn" onClick={createAccount}>Create secure account</button>
          {legacyProfile && <div className="wg-alert info" role="status">Existing profile details found. They will be encrypted when you create your password.</div>}
          {error && <div className="wg-alert warn" role="alert">{error}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="wg-user-account" aria-label="User Account">
      <div className="wg-card wg-profile-card">
        <div className="wg-profile-heading">
          <div>
            <h2>👤 Profile Information</h2>
            <p>Your details are protected by your password and stored as encrypted data on this device.</p>
          </div>
          <div className="wg-profile-actions"><button className="wg-btn" onClick={saveProfile} disabled={!dirty}>💾 Save changes</button><button className="wg-btn-ghost" onClick={lock}>🔒 Lock account</button></div>
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
          <span>{message || "Changes are not saved until you select Save changes"}</span>
        </div>
      </div>
    </section>
  );
}
