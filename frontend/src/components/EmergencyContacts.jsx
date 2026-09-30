import React, { useEffect } from "react";

/* Public emergency helplines (STATIC public information, not live data).
   Numbers are widely published national helplines. */
const CONTACTS = [
  { name: "National Emergency", number: "112", note: "Single emergency number (voice/SMS)" },
  { name: "NDMA Helpline", number: "1078", note: "Disaster management control room" },
  { name: "Relief Commissioner", number: "1070", note: "State relief coordination" },
  { name: "IMD Weather Helpdesk", number: "1800-180-1717", note: "Public weather enquiry (toll-free)" },
];

export default function EmergencyContacts({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="wg-drawer-veil" onClick={onClose} aria-hidden="true" />
      <div className="wg-card" role="dialog" aria-modal="true" aria-label="Emergency contacts"
        style={{ position: "fixed", zIndex: 62, top: "12vh", left: "50%", transform: "translateX(-50%)", width: "min(26rem, 92vw)", padding: "1.1rem 1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>📞 Emergency contacts</h3>
          <button className="wg-btn-ghost" onClick={onClose} aria-label="Close emergency contacts">✕</button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--wg-muted)" }}>
          <span className="wg-chip static">STATIC PUBLIC INFO</span> Published helplines. In immediate danger, call <strong>112</strong> first.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.6rem" }}>
          {CONTACTS.map((c) => (
            <a key={c.number} href={`tel:${c.number.replace(/-/g, "")}`} style={{ textDecoration: "none", color: "inherit" }}
              className="wg-card hoverable" aria-label={`Call ${c.name} at ${c.number}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.85rem" }}>
                <span><strong>{c.name}</strong><span style={{ display: "block", fontSize: "0.72rem", color: "var(--wg-muted)" }}>{c.note}</span></span>
                <span className="wg-mono" style={{ fontWeight: 800, fontSize: "1rem", color: "var(--wg-accent)" }}>{c.number}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
