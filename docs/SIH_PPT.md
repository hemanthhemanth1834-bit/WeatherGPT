# SIH PPT CONTENT — WeatherGPT (15 slides, verified facts only)

## 1. Title
WeatherGPT — AI Weather Intelligence. Muchakarla Hemanth Kumar, B.Tech
CSE–AI/ML, SRK Institute of Technology (2024–2028). Smart India Hackathon 2026.

## 2. Problem
Citizens/farmers can't parse technical IMD bulletins; static apps don't
answer local questions ("spray today?", "safe to travel?"). SIH 26068, MoES/IMD.

## 3. Proposed Solution
Conversational, multilingual, voice-enabled weather intelligence that answers
with live, source-labelled evidence — chat, GIS, alerts, advisories.

## 4. Innovation
Provably grounded AI: every figure traced to a live tool (regression-tested);
honest LIVE→NOT CONFIGURED provenance on every card; 11 Indian languages.

## 5. Architecture
User → React UI → intent router → location engine → deterministic tools →
free providers → provenance/validation → grounded reply. (See ARCHITECTURE.md.)

## 6. AI Agent
Detect language → extract place → classify intent → call tool → template reply.
14 tools. Hallucination tests. Optional LLM adapters, deterministic default.

## 7. Live Data Sources
Open-Meteo ×5, NOAA ADDS, RainViewer, NASA GIBS, BigDataCloud, GDACS, OSM —
all free, probed live. WRF/MOSDAC/IMD/INCOIS honestly NOT CONFIGURED.

## 8. Key Features
Live weather + 24h/7d, GPS, chat+voice, AQI+UV, risk+travel, alerts, GIS radar,
agri, aviation-live, marine-live, ERA5 history, compare, saved places.

## 9. GIS + Disaster Intelligence
Leaflet + live radar timeline + computed zones + DEMO cyclone track + GDACS
official feed + 112/1078 actions + readiness builder. Computed ≠ official.

## 10. Agriculture / Aviation / Marine / Climate
Rule advisories (informational), live ADDS METAR/TAF with STATIC fallback,
wave-model marine with provenance, OBSERVED ERA5 yearly+monthly.

## 11. Security + Reliability
No secrets, CORS allowlist, rate limits, validation, retries, honest 502s,
TTL caches, guarded chat fallback.

## 12. Testing + Performance
64/64 pytest, oxlint 0 errors, Vite build, 16-screen browser QA (0 errors,
0 overflow), entry ~374KB lazy-split, production smoke 14/14 per deploy.

## 13. Impact / Use Cases
Citizens, farmers, pilots, fishermen, disaster cells, researchers —
 vernacular voice access where bulletins can't reach.

## 14. Future Scope
Official feeds when accessible, CPCB stations, WRF pipeline, push alerts,
offline PWA, validated risk thresholds.

## 15. Demo / Conclusion
Live 4-minute run (see SIH_DEMO.md). Close: "Every number on screen came
from a live, labelled source."
