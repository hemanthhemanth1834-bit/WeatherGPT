import React from "react";
import { User, GraduationCap, Trophy, ExternalLink } from "lucide-react";

export default function AboutDeveloper() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="wg-card" style={{ padding: "1.2rem 1.3rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--wg-accent)" }}>
          <Trophy size={14} style={{ verticalAlign: "-2px" }} /> SMART INDIA HACKATHON 2026
        </div>
        <h2 style={{ margin: "0.3rem 0", fontSize: "1.5rem" }}>WeatherGPT — AI Weather Intelligence</h2>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--wg-muted)" }}>
          AI-powered conversational weather intelligence and decision-support platform · AI / ML / Weather
          Intelligence / Disaster Decision Support
        </p>
      </div>

      <div className="wg-card" style={{ padding: "1.2rem 1.3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", fontWeight: 800, color: "var(--wg-accent)" }}>
          <User size={15} /> Developer
        </div>
        <div style={{ fontWeight: 800, marginTop: "0.5rem" }}>Muchakarla Hemanth Kumar</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--wg-muted)", marginTop: "0.25rem" }}>
          <GraduationCap size={13} /> B.Tech CSE – AI/ML · SRK Institute of Technology (SRKIT) · 2024–2028
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.8rem" }}>
          <a
            href="https://github.com/hemanthhemanth1834-bit"
            target="_blank"
            rel="noreferrer"
            className="wg-btn-ghost"
          >
            <ExternalLink size={13} /> github.com/hemanthhemanth1834-bit
          </a>
          <a
            href="https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/"
            target="_blank"
            rel="noreferrer"
            className="wg-btn-ghost"
          >
            <ExternalLink size={13} /> LinkedIn — Hemanth Kumar Muchakarla
          </a>
        </div>
      </div>

      <div className="wg-card" style={{ padding: "1.2rem 1.3rem", fontSize: "0.82rem", lineHeight: 1.65, color: "var(--wg-muted)" }}>
        <div style={{ fontWeight: 800, color: "var(--wg-ink)", marginBottom: "0.4rem" }}>How this project was built</div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li>Application code independently implemented for SIH 2026 (see <span className="wg-mono">docs/PROVENANCE.md</span>).</li>
          <li>Deterministic risk engine (LOW / MODERATE / HIGH / EXTREME) with documented thresholds.</li>
          <li>NWP interface (GFS LIVE via Open-Meteo; WRF NOT CONFIGURED) with GRIB/NetCDF-ready design.</li>
          <li>Satellite pointers (NASA GIBS live links; MOSDAC NOT CONFIGURED) — static images never shown as live.</li>
          <li>Indian sources registry with honest status labels; agent tool registry so numbers always come from data tools.</li>
          <li>Source transparency (LIVE / DEMO / SIMULATED / STATIC / NOT CONFIGURED) on every major display.</li>
        </ul>
      </div>
    </div>
  );
}
