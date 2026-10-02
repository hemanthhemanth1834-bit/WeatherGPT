# SIH 2026 PRESENTATION PACKAGE — WeatherGPT

Claims below describe the repository architecture and documented verification history. Current tests and provider health must be rerun after subsequent commits; deployment is intentionally not modified by this maintenance pass.

---

## 1. 15-SLIDE PPT CONTENT

**S1 Title.** WeatherGPT — AI Weather Intelligence. Muchakarla Hemanth Kumar,
B.Tech CSE–AI/ML, SRK Institute of Technology (2024–2028). SIH 2026, PS 26068 (MoES/IMD).

**S2 Problem.** Citizens and farmers can't parse technical IMD bulletins;
static apps don't answer local questions ("spray today?", "safe to travel?").

**S3 Solution.** Conversational, multilingual, voice-enabled weather
intelligence that answers with live, source-labelled evidence — chat, GIS,
alerts, advisories, analytics.

**S4 Innovation.** Provably grounded AI: every figure traced to a live tool
(regression-tested); honest LIVE→NOT CONFIGURED provenance on every card;
11 Indian languages with voice.

**S5 Architecture.** User → React UI → intent router → location engine →
deterministic tools → free providers → provenance/validation → grounded reply.
(See `docs/ARCHITECTURE.md`.)

**S6 AI Agent.** Detect language → extract place → classify intent → call tool
→ template reply. 19 tools. Hallucination tests. Optional LLM adapters,
deterministic default. (See `docs/AI_AGENT.md`.)

**S7 Live Data Sources.** Open-Meteo ×5, NOAA ADDS, RainViewer, NASA GIBS,
BigDataCloud, GDACS, OSM — all free, probed live. WRF/MOSDAC/IMD/INCOIS/LLM
honestly NOT CONFIGURED.

**S8 Key Features.** Live weather + 24h/7d, GPS, chat+voice, AQI+UV,
risk+travel, alerts, GIS radar, agri, aviation-live, marine-live, ERA5 history,
compare, saved places.

**S9 GIS + Disaster Intelligence.** Leaflet + live radar timeline + computed
zones + DEMO cyclone track + GDACS official feed + 112/1078 actions +
readiness builder. Computed ≠ official.

**S10 Agriculture / Aviation / Marine / Climate.** Rule advisories
(informational), live ADDS METAR/TAF with STATIC fallback, wave-model marine
with provenance, OBSERVED ERA5 yearly+monthly.

**S11 Security + Reliability.** No secrets, CORS allowlist, rate limits,
validation, retries, honest 502s, TTL caches, guarded chat fallback.

**S12 Testing + Performance.** 64/64 pytest, oxlint 0 errors, Vite build,
16-screen browser QA (0 errors, 0 overflow), entry ~374KB lazy-split,
production smoke 14/14 per deploy.

**S13 Impact / Use Cases.** Citizens, farmers, pilots, fishermen, disaster
cells, researchers — vernacular voice access where bulletins can't reach.

**S14 Future Scope.** Official feeds when accessible, CPCB stations, WRF
pipeline, push alerts, offline PWA, validated risk thresholds.

**S15 Demo / Conclusion.** Live 4-minute run (see `docs/SIH_DEMO.md`).
Close: "Every number on screen came from a live, labelled source."

---

## 2. 4-MINUTE LIVE DEMO SCRIPT

(0:00) Open the site — hero + live Pune snapshot + ticker.
(0:20) GPS button → allow → "📍 Current Location — City, State" refresh.
(0:50) Chat: "Will it rain tomorrow in Vijayawada?" — grounded reply + source.
(1:20) Forecast tab — 24h strip, sparkline, 7-day, cloud cover.
(1:40) AQI card (live US AQI + pollutants) + UV level + advice.
(2:00) Alerts + Severe desk — computed alerts, DEMO track, GDACS cards, 112 chips.
(2:25) Map — press ▶ radar, toggle layers, legend.
(2:45) Air·Sea — LIVE ADDS chip, marine direction/period/SST.
(3:05) Agri (Cotton/Nagpur) + Risk Assess — drivers + travel line.
(3:25) Language → Telugu question; mic button (fallback message if blocked).
(3:45) NWP tab — Providers health: 8/14 LIVE, WRF/MOSDAC NOT CONFIGURED.
(4:00) Close: problem → solution → "every number from a live, labelled source."

## 3. 60-SECOND ELEVATOR PITCH

"WeatherGPT turns IMD-style complexity into conversation. Ask in your language —
by text or voice — and get live forecasts, rain outlooks, farm advice, flight
briefings, and disaster alerts, every figure traced to a labelled live source
and never invented. Eleven languages, GPS-aware, with GIS radar, risk scoring,
and honest provenance on every card — built on free public data for SIH 2026."

## 4. JUDGE Q&A (20)

See `docs/SIH_QA.md` (16) plus:

17. **How is GPS kept private?** Coordinates travel only inside the weather
    query; last fix stays in browser localStorage; denial keeps manual place.
18. **What if two providers disagree?** Displayed side-by-side where relevant
    (blend vs GFS); fallback chain never mixes labels.
19. **Why deterministic over LLM?** Safety: weather decisions need
    traceability; LLM wording is optional, figures never are.
20. **What breaks first under load?** Upstream rate limits — absorbed by TTL
    caches + retries + per-IP rate limiting; degrades to labelled fallback.

## 5. PROBLEM → SOLUTION → INNOVATION → IMPACT

Problem: technical bulletins exclude most Indians. Solution: conversational,
multilingual, voice-first intelligence with evidence. Innovation: provable
grounding + total provenance honesty. Impact: farmers, fishermen, pilots,
disaster cells, researchers — in their language.

## 6. AI AGENT ARCHITECTURE

`docs/AI_AGENT.md`: language → place → intent → 19 deterministic tools →
templated reply + speech; hallucination regression tests; optional LLM
adapters (none configured → deterministic).

## 7. FREE-DATA / PROVIDER ARCHITECTURE

`docs/DATA_SOURCES.md` + live `/api/providers/health`: 8 LIVE core providers,
4 explicitly non-live/metadata-only entries, all probed; fallback chain LIVE → FALLBACK → ESTIMATED/
SIMULATED with timestamps; key-gated tiers evaluated and declined.

## 8. SECURITY + HALLUCINATION PREVENTION

`docs/SECURITY.md`: no secrets, CORS allowlist, 300/min rate limit, 500-char
query cap, retries, honest 502s, no raw HTML. Anti-hallucination:
tool-originated figures only, payload-membership tests, unavailable-data replies.

## 9. TESTING / PERFORMANCE EVIDENCE

64/64 pytest (risk/geo/chat/intents/providers/API/CORS/hardening), oxlint
0 errors, Vite build ~374KB entry with lazy chunks, 16-screen scripted QA
(0 console errors, 0 failed requests, 0 overflow at 1440/390/430px),
14/14 production smoke checks per deploy with IST timestamps.

## 10. LIMITATIONS + FUTURE SCOPE

NOT CONFIGURED: WRF, MOSDAC, IMD/INCOIS feeds, LLM. STATIC: aviation fallback,
decadal climate. ESTIMATED: AQI fallback, marine fallback, travel, risk.
Computed alerts unofficial; cyclone DEMO; voice browser-dependent. Future:
official feeds, CPCB stations, WRF pipeline, push alerts, offline PWA,
validated thresholds.

## 11. FINAL SIH SUBMISSION CHECKLIST

- [x] Problem statement mapped (`docs/SIH_MAPPING.md`)
- [x] Working production URL with live data
- [x] Demo flow rehearsed against production
- [x] PPT content ready (section 1 above)
- [x] Elevator pitch + 20 Q&A ready
- [x] Architecture/data/agent/security docs synchronized
- [x] License (MIT) + attribution + third-party notices present
- [x] Tests/build/lint/production QA green
- [x] No secrets; honest labels everywhere
- [x] Identity correct: Muchakarla Hemanth Kumar, SRKIT, CSE–AI/ML, 2024–2028
