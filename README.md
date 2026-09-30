# WeatherGPT

## SIH 2026

**Smart India Hackathon 2026 (SIH 2026)** submission — AI / ML / Weather Intelligence / Disaster Decision Support.

**WeatherGPT — AI Weather Intelligence**: an AI-powered conversational weather intelligence and decision-support platform.

## Problem Statement

**WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information** (MoES / IMD #26068, Disaster Management, Software).

The system provides:

1. Real-time weather information — **LIVE** (Open-Meteo NWP blend)
2. Natural-language weather queries — **LIVE** (deterministic tool-routed engine)
3. Numerical weather prediction integration (GFS/WRF) — **GFS LIVE via Open-Meteo · WRF NOT CONFIGURED**
4. Extreme weather alerts — **LIVE telemetry scan (computed, not official bulletins)**
5. Location-based forecasting — **LIVE** (450+ Indian locations + global geocoding)
6. Advisory generation — **DEMO-grade** (Agromet rules; informational only)
7. Multilingual Indian-language support — **LIVE** (10 languages: en, hi, mr, ta, te, bn, gu, pa, kn, ml, or)
8. Climate trends and historical weather analysis — **STATIC reference series**
9. Voice-enabled interaction — **LIVE** (Web Speech API STT/TTS; provider-dependent)
10. GIS/weather visualization — **LIVE radar tiles + DEMO overlays**
11. Disaster preparedness and decision support — **ESTIMATED risk engine + CAP-style hub**
12. Scalable real-time data ingestion — **READY** (cached REST + WebSocket heartbeat)

Status labels used everywhere: **LIVE · DEMO · SIMULATED · STATIC · API-DEPENDENT · MODEL-DEPENDENT · NOT CONFIGURED · ESTIMATED**.

## Solution

WeatherGPT routes natural-language queries (typed or spoken, in 10+ Indian languages) to **deterministic weather tools** — never letting the language layer invent numbers. Live NWP values come from Open-Meteo; alerts are computed from live telemetry against documented thresholds; risk is computed from a transparent deterministic engine; and every result carries **source + timestamp + status**.

SIH 2026 additions over the downloaded base: risk engine, NWP interface (GFS LIVE / WRF NOT CONFIGURED), satellite module, Indian sources registry, explicit agent tool registry, source-transparency badges, env-based config, caching, saved locations, About/SIH surfaces, and tests.

## Features

- Conversational weather AI (10 languages + auto-detect + transliteration)
- Voice assistant (Speech → STT → intent → weather tool → response → TTS) with clean fallback
- Dashboard: current, feels-like, humidity, pressure, wind, visibility, precipitation, cloud, sunrise/sunset, UV, AQI (estimated), hourly (24h), daily (7-day)
- GIS map (Leaflet + OSM/Esri basemaps + RainViewer LIVE radar + DEMO cyclone/alert overlays)
- Alert center (CAP-style, severity filters, audio broadcast)
- Cyclone track viewer (**DEMO** illustrative track — never a live bulletin)
- Agriculture advisories (paddy, cotton, wheat, sugarcane, soybean, mustard; informational only)
- Aviation briefing (STATIC sample METAR/TAF for VIDP/VABB/VOBL/VECC — clearly labelled samples)
- Marine advisory (LIVE coastal wind + empirical wave model — estimate, not official INCOIS bulletin)
- Climate analytics (STATIC 1970–2026 reference series vs 1961–1990 baseline)
- Risk engine (LOW/MODERATE/HIGH/EXTREME, documented thresholds, ESTIMATED)
- City comparison (temp, humidity, AQI, rain risk, travel score, health personas)
- Saved preferred locations (browser localStorage; no personal data transmitted)

## Architecture

```
[ React 19 + Vite + Tailwind + Leaflet + Chart.js ]
        │  REST /api/*  +  WebSocket /ws/alerts
        ▼
[ FastAPI backend (Python) ]
  intent router (llm_engine) → deterministic tools:
    weather_current / weather_forecast / weather_alerts / location_search /
    risk_analysis / agriculture_advisory / climate_analysis / satellite_information
  upstream: Open-Meteo forecast + geocoding (LIVE, no key)
  cache: in-memory TTL (600s default) · config: env-based
```

## AI Architecture

- `process_conversational_query()` detects language → extracts location(s) → classifies intent (compare / cyclone / agri / aviation / marine / default) → calls deterministic tool(s) → renders templated multilingual markdown + speech text.
- Tool registry: `GET /api/agent/tools` lists all 11 tools with sources.
- Rule: numerical weather values ALWAYS originate from tools. The LLM layer never fabricates observations, warnings, cyclone positions, or model accuracy.

## Weather Sources

| Source | Status | Used for |
|---|---|---|
| Open-Meteo forecast | **LIVE** | current/hourly/daily, NWP blend |
| Open-Meteo geocoding | **LIVE** | global + taluka search |
| RainViewer | **LIVE** | radar tiles on GIS map |
| Local 450+ location index | **STATIC** | fast geocoding |
| AQI | **ESTIMATED** | heuristic band bundled with weather |
| Aviation METAR/TAF | **STATIC samples** | 4 airports, labelled |
| Marine waves | **MODEL-DEPENDENT estimate** | empirical SMB from live wind |
| Climate series | **STATIC reference** | 1970–2026 anomalies |

## GFS/WRF/NWP

- **GFS: LIVE** via Open-Meteo global blend (0.125° ensemble grid). Status: `GET /api/nwp/status`.
- **WRF: NOT CONFIGURED.** Interface is ready: `WRF_ENABLED` + `WRF_GRIB_PATH` env → cfgrib/xarray ingestion → lat/lon subset → serve via `/api/nwp/forecast` (to be added when a feed is provisioned). GRIB/NetCDF deps intentionally not installed until then.

## GIS

Leaflet + OSM/Esri basemaps. Layers: LIVE RainViewer radar, DEMO cyclone track, DEMO CAP polygons, STATIC radar-station markers. Provenance strip on the map distinguishes LIVE vs DEMO. Basemaps: OpenStreetMap contributors, Esri/Maxar.

## Multilingual Support

Architecture: script/keyword detection (`detect_language`) → per-language response templates + condition/AQI translation tables → BCP-47 voice mapping. UI language switcher in navbar. Languages: English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Punjabi, Kannada, Malayalam, Odia. Technical values (numbers/units) are never translated, only labelled.

## Voice Assistant

Pipeline: Speech → Web Speech STT → intent → weather tool → templated response → Web Speech TTS. Indian-language voices where the browser/provider supports them. Fallback: typed input + clear "not supported in this browser" message. No API keys exposed (browser-native APIs only).

## Climate Analytics

STATIC reference series (1970–2026 anomalies vs 1961–1990 baseline; monsoon vs 880.6mm LPA). Charts via Chart.js. Labelled OBSERVED/ESTIMATED where applicable — not live station records.

## Alerts

CAP-style alerts computed from LIVE telemetry against IMD-style thresholds (heavy rain, thunderstorm/Damini proxy, heatwave, coastal wind). The fallback synoptic alert is illustrative. **These are NOT official IMD bulletins.** Each alert carries severity, location, issue/start/end times, source, and recommended action. Always follow IMD/NDMA/local authorities.

## Risk Engine

Deterministic LOW / MODERATE / HIGH / EXTREME engine (`backend/app/services/risk_engine.py`) with documented thresholds for heat, rainfall, flood (rainfall-driven proxy), wind, thunderstorm (WMO codes), and cyclone (wind+rain coincidence). Output is labelled **ESTIMATED** — not scientifically validated, not an official warning. Try: `GET /api/risk/assess?location=Pune`.

## Agriculture

Rule-based advisories per crop using live temp/rain-prob/humidity. Covers irrigation, spray timing, harvest windows + Damini lightning proxy. **Informational only — not a substitute for professional agricultural advice.**

## Aviation

STATIC sample METAR/TAF for VIDP, VABB, VOBL, VECC with decoded fields + flight categories (VFR/MVFR/IFR/LIFR). Samples are illustrative, not live observations. Do not use for flight planning.

## Marine

LIVE coastal wind → empirical wave height (SMB) → sea state + fisherman warning tiers. **Estimate, not an official INCOIS bulletin.** Tide times are illustrative offsets.

## Technology Stack

- Frontend: React 19, Vite, Tailwind CSS v4, Leaflet + react-leaflet, Chart.js + react-chartjs-2, lucide-react, react-markdown
- Backend: FastAPI, uvicorn, requests/httpx, pydantic, python-dotenv, pytest
- Data: Open-Meteo (forecast + geocoding), RainViewer (radar), NASA GIBS links (satellite viewer)
- Deploy: Vercel (`vercel.json`: Python API + static frontend build)

## Installation

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Environment Variables

See `.env.example` (placeholders only — never commit `.env` with real credentials):

| Variable | Default | Purpose |
|---|---|---|
| `CORS_ALLOW_ORIGINS` | `*` | Allowed CORS origins |
| `WEATHERGPT_VERSION` | `2.0.0-sih` | API version string |
| `WEATHERGPT_ENV` | `development` | Environment name |
| `WEATHER_CACHE_TTL_SECONDS` | `600` | Weather cache TTL |
| `OPENAI_API_KEY` | blank | Future LLM provider (NOT CONFIGURED) |
| `OPENWEATHER_API_KEY` | blank | Future provider (NOT CONFIGURED) |
| `IMD_API_KEY` | blank | Future IMD feed (NOT CONFIGURED) |
| `MOSDAC_API_KEY` | blank | Future MOSDAC access (NOT CONFIGURED) |
| `WRF_ENABLED` | `false` | WRF feed switch |
| `WRF_GRIB_PATH` | blank | WRF GRIB/NetCDF path |
| `VITE_API_URL` | blank | Frontend API override for local dev |

## Running Locally

```bash
# Terminal 1 — backend (http://127.0.0.1:8000/docs)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

## API Documentation

Interactive docs: `http://127.0.0.1:8000/docs`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/query` | Conversational weather queries |
| `GET` | `/api/weather/current` | Live observations + hourly/daily (LIVE) |
| `GET` | `/api/weather/compare` | Two-city comparison |
| `GET` | `/api/weather/history` | Reference climate context (STATIC) |
| `GET` | `/api/locations/search` | Autocomplete |
| `GET` | `/api/locations/regional-explorer` | Taluka explorer |
| `GET` | `/api/alerts/active` | Computed CAP-style alerts |
| `GET` | `/api/alerts/cyclone-track` | Illustrative track GeoJSON (DEMO) |
| `GET` | `/api/advisory/crop` | Agromet advisory (DEMO-grade) |
| `GET` | `/api/advisory/crops-list` | Supported crops |
| `GET` | `/api/aviation/briefing` | Sample METAR/TAF (STATIC) |
| `GET` | `/api/marine/advisory` | Wave/fisherman estimate |
| `GET` | `/api/climate/trends` | Reference series (STATIC) |
| `GET` | `/api/risk/assess` | Deterministic risk (ESTIMATED) |
| `GET` | `/api/nwp/status` | GFS LIVE / WRF NOT CONFIGURED |
| `GET` | `/api/satellite/info` | Satellite pointers (API-DEPENDENT) |
| `GET` | `/api/sources/indian` | IMD/MOSDAC/INCOIS/Open-Meteo status |
| `GET` | `/api/agent/tools` | Agent tool registry |
| `GET` | `/api/meta/developer` | Developer identity |
| `GET` | `/api/meta/project` | Project identity + license note |
| `GET` | `/api/health` | Health check |
| `WS` | `/ws/alerts` | Heartbeat + alert count |

## Testing

```bash
cd backend
python -m pytest -q        # backend unit tests (risk engine, API health, tools)
cd ../frontend
npm run lint               # oxlint
npm run build              # production build check
```

## Deployment

Vercel per `vercel.json` (API → `api/index.py`, frontend static build). Set `VITE_API_URL` only if the API lives on a different origin; same-origin `/api` is the default in production. Never commit `.env`.

## Project Structure

```
WeatherGPT-main/
├── api/index.py                 # Vercel Python entry (imports backend app)
├── backend/
│   ├── app/
│   │   ├── main.py              # routes incl. risk/nwp/satellite/sources/agent/meta
│   │   ├── config.py            # env-based config (NEW, SIH 2026)
│   │   ├── schemas/models.py    # + transparency fields, RiskAssessment, DeveloperMeta
│   │   └── services/
│   │       ├── weather_service.py  # + TTL cache + source labels
│   │       ├── cache.py            # NEW: TTL cache
│   │       ├── risk_engine.py      # NEW: deterministic risk
│   │       ├── nwp_service.py      # NEW: GFS LIVE / WRF NOT CONFIGURED
│   │       ├── satellite_service.py# NEW: satellite pointers
│   │       ├── indian_sources_service.py # NEW: IMD/MOSDAC/INCOIS registry
│   │       ├── agent_tools.py      # NEW: tool registry
│   │       ├── alert_service.py / agri_advisory.py / aviation_service.py /
│   │       │   marine_service.py / historical_service.py / llm_engine.py
│   ├── requirements.txt / run.py
│   └── tests/                   # NEW: pytest suite
├── frontend/src/
│   ├── components/ SourceBadge, RiskPanel, AboutDeveloper, NwpSatellitePanel (NEW) + existing
│   └── services/api.js, voice.js
├── .env.example                 # NEW: placeholders only
└── vercel.json
```

## Screenshots

> Add SIH demo screenshots here (`docs/screenshots/`): chat, dashboard with source badge, GIS map with LIVE/DEMO strip, alerts, risk panel, NWP/satellite provenance, About/SIH page. No screenshots are bundled in this revision.

## Developer

**Muchakarla Hemanth Kumar**
B.Tech CSE – AI/ML
SRK Institute of Technology (SRKIT)
2024–2028
SIH 2026

## GitHub

https://github.com/hemanthhemanth1834-bit

## LinkedIn

https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/

## Acknowledgements

- **Original open-source base**: the downloaded `WeatherGPT-main` ZIP (React + FastAPI weather intelligence app: conversational engine, Open-Meteo integration, Leaflet GIS, CAP-style alerts, Agromet/aviation/marine/climate modules). The original archive contained **no LICENSE, NOTICE, or author/copyright file**, and no upstream repository URL inside the archive. A same-named public repository (`Kavin1467/WeatherGPT`, same SIH problem statement) was found during investigation, but its project structure (vanilla-JS frontend, `Prototype/`, Windows `.exe`) does **not** match this archive — so it could **not** be verified as the exact upstream. See `ATTRIBUTION.md`.
- **Modifications by Muchakarla Hemanth Kumar (SIH 2026)**: risk engine, NWP/satellite/Indian-sources/agent-tools modules, source-transparency layer, caching, env config, saved locations, About/SIH surfaces, rebranding to "WeatherGPT — AI Weather Intelligence", README rewrite, `.env.example`, tests; finalization round: CORS hardening, code-splitting, honesty labels, error states, accessibility labels, crash fixes.
- **Third-party data/services**: Open-Meteo (forecast + geocoding), RainViewer (radar), NASA GIBS/Worldview (satellite viewer links), OpenStreetMap contributors, Esri/Maxar (basemap tiles), IMD/MOSDAC/INCOIS (referenced as authoritative sources; no affiliation claimed).
- **Third-party libraries**: React, Vite, Tailwind CSS, Leaflet, lucide-react, react-markdown, FastAPI, uvicorn, pydantic — each under its own upstream license (see `frontend/package.json`, `backend/requirements.txt`, `THIRD_PARTY_NOTICES.md`).
- **License/attribution status**: ⚠️ The downloaded base included **no license file**. Required original copyright/attribution notices (if any existed upstream) have been preserved as far as present in the archive (none were found to remove). Because there is no license granting redistribution rights, **do not assume this code can be freely redistributed** — the SIH submission should confirm the upstream repository URL and license with the event organisers before any public redistribution. No claim is made that inherited code was originally written by the SIH developer. See `ATTRIBUTION.md` and `## License` below.

## License

No license file was present in the downloaded archive, and the exact upstream repository could **not** be verified (see `ATTRIBUTION.md`). Consequently:

- This project currently has **no redistribution license**. All rights to the inherited portions remain with their unknown original authors.
- The modifications documented in this README / `ATTRIBUTION.md` are the work of **Muchakarla Hemanth Kumar** for SIH 2026.
- **Do not publicly redistribute** (including pushing the full copied source to a public GitHub repository) until the upstream source and its license are confirmed, or until the event organisers advise otherwise.
