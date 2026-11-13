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
          hourly, 7-day outlook, cloud cover, UV, sun times and model-specific comparisons.
          Air quality uses the Open-Meteo air-quality model on the US EPA AQI scale; it is a
          modelled indicator, not a local monitor. Every payload carries source, status and IST
          timestamp, and unavailable values stay visibly unavailable.
        </Section>
        <Section title="🌡 Climate data">
          Historical temperature and rainfall use the Open-Meteo Historical Weather API
          (ERA5 reanalysis). The page shows annual, seasonal and monthly series against a
          1991–2020 baseline and separates observed history from any forecast or projection.
        </Section>
        <Section title="🗺 GIS">
          Leaflet + OpenStreetMap basemap with <span className="wg-chip live">LIVE</span> RainViewer
          radar frames (playable timeline), selected-place marker, computed alert zones and an
          illustrative cyclone line (<span className="wg-chip demo">DEMO</span>). Attributions retained on-map.
        </Section>
        <Section title="🗣 Multilingual + voice">
          11 languages with script-aware detection (Telugu auto-detection included), per-language
          templates, UI switcher, and Web Speech STT/TTS with explicit fallbacks. No Bhashini
          integration — browser speech only.
        </Section>
        <Section title="⚠ Alerts and risk">
          Official IMD RSS text and verified third-party feeds (GDACS, USGS) are kept visually
          separate from application-computed estimates. Computed levels run LOW → EXTREME for
          heat, rainfall, flood, wind, thunderstorm and cyclone from published thresholds
          (<span className="wg-chip estimated">COMPUTED</span>, unvalidated, unofficial). An
          empty feed is not a safety clearance.
        </Section>
        <Section title="📜 Provenance + license">
          Application code independently implemented for SIH 2026 (see <span className="wg-mono">docs/PROVENANCE.md</span>).
          Original code under MIT (<span className="wg-mono">LICENSE</span>); third-party packages
          under their own licenses (<span className="wg-mono">THIRD_PARTY_NOTICES.md</span>).
        </Section>
      </div>

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <div className="wg-section-title">🔤 Glossary — what the terms mean</div>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(15rem,1fr))", gap: "0.55rem 1.1rem", margin: "0.6rem 0 0", fontSize: "0.78rem", lineHeight: 1.55, color: "var(--wg-muted)" }}>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>NWP</dt><dd style={{ margin: 0 }}>Numerical Weather Prediction — a computer model that simulates the atmosphere from current observations.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>GFS · ICON · ECMWF</dt><dd style={{ margin: 0 }}>Separate global forecast models. Comparing them shows model spread, not an accuracy ranking.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>ERA5</dt><dd style={{ margin: 0 }}>A gridded historical reanalysis of past weather, used here for climate context rather than live conditions.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>AQI</dt><dd style={{ margin: 0 }}>Air Quality Index on the US EPA scale: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups, higher is worse.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>PM2.5 / PM10</dt><dd style={{ margin: 0 }}>Airborne particles smaller than 2.5 and 10 micrometres. Smaller particles penetrate deeper into the lungs.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>UV index</dt><dd style={{ margin: 0 }}>Strength of sunburn-producing ultraviolet radiation: 0–2 low, 3–5 moderate, 6–7 high, 8+ very high.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>Nowcast</dt><dd style={{ margin: 0 }}>A very short-range warning, usually for the next few hours, based on current storms and radar.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>IMD</dt><dd style={{ margin: 0 }}>India Meteorological Department — the official national weather authority. Its RSS text is shown separately from computed alerts.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>GDACS / USGS</dt><dd style={{ margin: 0 }}>International disaster-alert and earthquake feeds. They cover different hazards and regions than IMD.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>GIBS / WMS</dt><dd style={{ margin: 0 }}>NASA's satellite imagery service and the map standard used to display delayed imagery layers.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>RainViewer</dt><dd style={{ margin: 0 }}>A live radar mosaic used for recent-past precipitation around the selected place. Blank means no coverage, not clear skies.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>OSM</dt><dd style={{ margin: 0 }}>OpenStreetMap — the free, contributor-built basemap behind the Leaflet maps.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>LLM</dt><dd style={{ margin: 0 }}>Large Language Model. If no model is configured, the assistant says so and answers only from deterministic weather tools.</dd></div>
          <div><dt style={{ fontWeight: 800, color: "var(--wg-text-primary)" }}>TTL cache</dt><dd style={{ margin: 0 }}>A short-lived stored copy of an upstream response, used to avoid repeated provider calls while keeping data fresh.</dd></div>
        </dl>
      </div>

      <div className="wg-card" style={{ padding: "1rem 1.2rem" }}>
        <div className="wg-section-title">Limitations (honest)</div>
        <ul style={{ fontSize: "0.82rem", color: "var(--wg-muted)", lineHeight: 1.7, margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
          <li>WRF, MOSDAC and LLM providers: not configured in this local build.</li>
          <li>IMD RSS, GDACS, USGS, NASA GIBS, RainViewer and OpenStreetMap tiles are live remote services and can be delayed or unavailable.</li>
          <li>Aviation briefings use NOAA ADDS where the feed responds and fall back to clearly labelled static samples; they are never for flight planning.</li>
          <li>Computed alerts are application estimates, never official government warnings. Read the original warning before acting.</li>
          <li>FloodWatch models rainfall and terrain context only; it does not measure river levels, inundation depth or road access.</li>
          <li>Voice needs a supporting browser with microphone permission.</li>
        </ul>
      </div>
    </div>
  );
}
