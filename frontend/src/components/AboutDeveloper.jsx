import React from "react";

function Section({ title, children }) {
  return (
    <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
      <div className="wg-section-title">{title}</div>
      <div style={{ fontSize: "0.83rem", lineHeight: 1.65, color: "var(--wg-text-secondary)", marginTop: "0.45rem" }}>{children}</div>
    </div>
  );
}

export default function AboutDeveloper() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div className="wg-hero-band wg-enter" style={{ padding: "clamp(1.2rem, 4vw, 2rem)" }}>
        <span className="wg-chip live">SMART INDIA HACKATHON 2026</span>
        <h2 className="wg-hero-title" style={{ marginTop: "0.5rem" }}>
          WeatherGPT <span className="wg-gradient-text">— AI Weather Intelligence</span>
        </h2>
        <p style={{ margin: "0.5rem 0 0", color: "var(--wg-muted)", fontSize: "0.88rem", maxWidth: "46rem", lineHeight: 1.6 }}>
          Problem statement: SIH 2026 — WeatherGPT. Conversational AI weather forecasting, alerts,
          GIS intelligence, risk awareness, climate information, and decision support for India.
        </p>
      </div>

      <div className="wg-card" style={{ padding: "1.1rem 1.2rem" }}>
        <div className="wg-section-title">Developer</div>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginTop: "0.4rem" }}>Muchakarla Hemanth Kumar</div>
        <div style={{ fontSize: "0.82rem", color: "var(--wg-muted)", marginTop: "0.2rem" }}>
          B.Tech CSE – AI/ML · SRK Institute of Technology (SRKIT) · 2024–2028 · Smart India Hackathon 2026
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.8rem" }}>
          <a className="wg-btn-ghost" href="https://github.com/hemanthhemanth1834-bit" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a className="wg-btn-ghost" href="https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/" target="_blank" rel="noreferrer">LinkedIn ↗</a>
          <a className="wg-btn-ghost" href="https://github.com/hemanthhemanth1834-bit/WeatherGPT#third-party-notices" target="_blank" rel="noreferrer">Attribution ↗</a>
          <a className="wg-btn-ghost" href="https://github.com/hemanthhemanth1834-bit/WeatherGPT/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License ↗</a>
        </div>
      </div>

      <div className="wg-grid-panels">
        <Section title="⚙ Architecture">
          React 19 + Vite frontend with lazy-loaded panels; FastAPI backend where a chat router
          calls deterministic data tools (weather, alerts, risk, advisories, climate). Numbers
          always come from tools — the reply layer only chooses words. 10-minute TTL cache
          avoids repeat upstream calls.
        </Section>
        <Section title="🌐 Weather data">
          Open-Meteo NWP blend (<span className="wg-chip live">LIVE</span>): current, 24-hour
          hourly, 7-day outlook, cloud cover, UV, sun times. AQI is an <span className="wg-chip estimated">ESTIMATED</span> placeholder
          until a licensed feed is connected. Every payload carries source, status, and IST timestamp.
        </Section>
        <Section title="🗺 GIS">
          Leaflet + CARTO/OSM basemap with <span className="wg-chip live">LIVE</span> RainViewer
          radar frames (playable timeline), selected-place marker, computed alert zones and an
          illustrative cyclone line (<span className="wg-chip demo">DEMO</span>). Attributions retained on-map.
        </Section>
        <Section title="🗣 Multilingual + voice">
          11 languages with script-aware detection (Telugu auto-detection included), per-language
          templates, UI switcher, and Web Speech STT/TTS with explicit fallbacks. No Bhashini
          integration — browser speech only.
        </Section>
        <Section title="⚠ Risk engine">
          Deterministic LOW → EXTREME levels for heat, rainfall, flood, wind, thunderstorm and
          cyclone from published thresholds (<span className="wg-chip estimated">ESTIMATED</span>,
          unvalidated, unofficial). Cold-wave alerts trigger from live minima.
        </Section>
        <Section title="📜 Provenance + license">
          Application code independently implemented for SIH 2026 (see <span className="wg-mono">docs/PROVENANCE.md</span>).
          Original code under MIT (<span className="wg-mono">LICENSE</span>); third-party packages
          under their own licenses (<span className="wg-mono">THIRD_PARTY_NOTICES.md</span>).
        </Section>
      </div>

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <div className="wg-section-title">Limitations (honest)</div>
        <ul style={{ fontSize: "0.82rem", color: "var(--wg-muted)", lineHeight: 1.7, margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
          <li>WRF, MOSDAC, IMD live feed, and LLM providers: NOT CONFIGURED.</li>
          <li>Aviation briefings are STATIC samples; climate series is STATIC reference.</li>
          <li>Alerts are computed estimates, never official government warnings.</li>
          <li>Voice needs a supporting browser with microphone permission.</li>
        </ul>
      </div>
    </div>
  );
}
