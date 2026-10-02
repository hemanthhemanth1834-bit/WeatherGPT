# WeatherGPT

## AI Weather Intelligence

Conversational weather forecasts, alerts, and climate insight for India —
built for demonstration and decision support, with honest data labels on
every display.

## Smart India Hackathon 2026

SIH 2026 · AI / ML / Weather Intelligence / Disaster Decision Support ·
MoES / IMD problem statement 26068 (Disaster Management, Software).

## Problem Statement

**WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and
Climate Information.** Citizens and farmers struggle with technical
bulletins; static apps cannot answer local questions. The required system
covers: (1) real-time weather, (2) natural-language queries, (3) NWP
integration, (4) extreme-weather alerts, (5) location forecasting,
(6) advisories, (7) Indian-language support, (8) climate/history analysis,
(9) voice interaction, (10) GIS visualization, (11) real-time ingestion,
(12) disaster decision support.

## Solution

A React + FastAPI app where a multilingual chat engine routes each query
to **deterministic data tools** (never inventing numbers), backed by live
Open-Meteo NWP, computed threshold alerts, a documented risk engine, and
per-panel source labels (`LIVE / DEMO / STATIC / ESTIMATED / SIMULATED /
NOT CONFIGURED`).

## Key Features

- Live current + 24-hour + 7-day forecasts for any Indian place (gazetteer + live geocoding)
- Chat in 11 languages (en, hi, mr, ta, te, bn, gu, pa, kn, ml, or) with voice input/output
- Computed CAP-style alerts with severity filters and audio broadcast
- Deterministic LOW–EXTREME risk engine with published thresholds
- Leaflet GIS: live RainViewer radar, illustrative alert zones and cyclone line
- **3D Earth (lazy tab)**: procedural three.js globe, Natural Earth coastlines,
  day/night terminator, live markers (place, alerts, DEMO track, USGS quakes,
  EONET fires); adaptive quality, reduced-motion aware
- Farm advisories (6 crops), live NOAA ADDS aviation data with STATIC fallback, estimated marine advisories
- STATIC decadal climate reference with bar visualisations
- City-vs-city comparison, saved places, NWP/satellite provenance panels

## Architecture

```
React 19 + Vite + Tailwind ──REST /api/*, WS /ws/alerts──▶ FastAPI
  lazy-loaded panels (Leaflet isolated)      intent router (chat.py)
                                             ─▶ deterministic tools
                                             Open-Meteo │ cache (TTL)
```

## AI Agent

`POST /api/chat/query` → language detect → place extract → intent
(compare / agri / aviation / marine / alerts / weather) → tool call →
templated reply. Full registry at `GET /api/agent/tools`. Numbers always
originate from tools.

## Weather Data

Open-Meteo NWP blend (**LIVE**): current, hourly, daily, sunrise/sunset,
UV. AQI is an **ESTIMATED** placeholder band. Every payload carries
`data_source / status / updated_at_ist / confidence`; upstream failure
yields a labelled **SIMULATED** estimate, never a crash.

Free provider stack (see `GET /api/providers/health`):
Open-Meteo Forecast, Geocoding, **Air Quality** (US AQI + PM2.5/PM10/NO₂/O₃/SO₂/CO),
**Marine** (wave height/direction/period, sea temperature), **Archive/ERA5**
(observed yearly history), RainViewer radar, NASA GIBS tiles.
WRF/MOSDAC/IMD feeds: NOT CONFIGURED. Key-gated tiers and Nominatim were
evaluated and deliberately not used (see `THIRD_PARTY_NOTICES.md`).

## GFS / WRF / NWP

- **GFS: LIVE** via the Open-Meteo blend (`GET /api/nwp/status`).
- **WRF: NOT CONFIGURED.** Optional local-file adapter (`services/wrf_adapter.py`,
  `Dockerfile.wrf` reference only, OFF by default) activates only when
  `WRF_ENABLED=true` plus a real GRIB2/NetCDF path is present.

## GIS

Leaflet + OSM basemap, **LIVE** RainViewer radar toggle,
**DEMO** alert circles and cyclone line, layer switches (incl. USGS quakes,
EONET wildfires), quick-focus buttons. Provenance strip distinguishes live from
illustrative layers. A lazy **3D Earth** tab adds a three.js globe with the
same live markers; simplified automatically on small screens.

## Satellite

Pointers, not proxied pixels: NASA GIBS/Worldview live viewer links
(**API-DEPENDENT**), RainViewer radar (**LIVE**), MOSDAC/ISRO
(**NOT CONFIGURED** — needs data access). No static image is shown as live.

## Alerts

Computed from live station telemetry against documented thresholds
(rain, storm, heat, coastal wind) plus an illustrative synoptic note.
**Not official IMD bulletins.** Each card shows severity, area, window,
source, and recommended action.

## Risk Engine

Deterministic heat/rainfall/flood/wind/thunderstorm/cyclone levels from
published thresholds (`backend/app/services/risk_engine.py`),
`GET /api/risk/assess`. Output is **ESTIMATED** — unvalidated, unofficial.

## Agriculture

Rule-based advice for paddy, cotton, wheat, sugarcane, soybean, mustard
from live temp/rain/humidity. **Informational only**, Meghdoot-style format.

## Aviation

**LIVE NOAA ADDS with STATIC fallback**: METAR/TAF data for the supported
Indian airport set when the upstream feed responds. When ADDS is silent or
unavailable, the UI uses clearly labelled STATIC demonstration data.
Never use the demo data for flight planning.

## Marine

Live coastal wind → empirical wave estimate (**MODEL-DEPENDENT**),
sea state, fisherman tiers, indicative tides. **Not an INCOIS bulletin.**

## Climate Analytics

**STATIC** decadal reference (temperature anomalies, monsoon departure
vs 880.6 mm LPA, event counts) with bar charts and plain-language
insights. Not live station records.

## Multilingual Support

Script + keyword detection across 11 languages — including Romanized
(Hinglish-style) vocabulary scoring with confidence — per-language reply
templates (figures never translated, only labelled), UI switcher,
BCP-47 voice mapping. Analysis API: `POST /api/language/analyze`.

## Voice

Speech → Web Speech STT → intent → weather tool → reply → TTS, with
explicit fallbacks when the browser denies mic/support. No keys involved.

## Technology Stack

Frontend: React 19, Vite, Tailwind CSS 4, Leaflet + react-leaflet,
lucide-react, react-markdown. Backend: FastAPI, uvicorn, pydantic,
httpx/requests, python-dotenv, pytest. Data: Open-Meteo, RainViewer,
NASA GIBS links, OSM/CARTO tiles.

## Installation

```bash
# backend
cd backend && pip install -r requirements.txt
# frontend
cd frontend && npm install
```

## Environment Variables

See `.env.example` (placeholders only — never commit `.env`):
`CORS_ALLOW_ORIGINS` (default local Vite origins; `*` disables
credentials automatically), `WEATHERGPT_VERSION`, `WEATHERGPT_ENV`,
`WEATHER_CACHE_TTL_SECONDS`, optional `OPENAI_API_KEY`,
`OPENWEATHER_API_KEY`, `IMD_API_KEY`, `MOSDAC_API_KEY`, `WRF_ENABLED`,
`WRF_GRIB_PATH`, frontend `VITE_API_URL`.

## Running Locally

```bash
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload  # docs at /docs
cd frontend && npm run dev   # http://localhost:5173
```

## Testing

```bash
cd backend && python -m pytest -q     # run the complete backend suite; latest reported baseline: 100 passing tests
cd frontend && npm run build          # production bundle check (entry ~374KB; Earth/Leaflet lazy)
cd frontend && npx oxlint src         # lint (0 errors in the latest reported baseline)
```

Outbound provider calls use timeout + retry with backoff (`services/http.py`).
A best-effort per-IP rate limit (`RATE_LIMIT_PER_MINUTE`, default 300/min;
chat/compare 60/min, climate/explain 30/min via `RATE_LIMIT_*` vars)
returns JSON 429 with `Retry-After`. Documented honestly as BEST-EFFORT PER
INSTANCE — no shared state on serverless, no paid store used.

## Production

Same-origin `/api` by default; set `VITE_API_URL` only for split hosting.
Set explicit `CORS_ALLOW_ORIGINS` on the platform (never commit secrets).
Backend: any ASGI host (`vercel.json` included for Vercel). Run the smoke
checks in Testing after deploy.

If Vercel reports `upgradeToPro=build-rate-limit`, that is a deployment
quota condition rather than evidence of an application build failure.
Do not change working application code to work around it; retry deployment
after the provider's quota window clears and then verify the deployed commit.

## Limitations

WRF / MOSDAC / IMD feed / LLM keys: NOT CONFIGURED.
Aviation uses LIVE NOAA ADDS when available and STATIC fallback when silent.
Climate STATIC. AQI/marine/risk ESTIMATED. Alerts computed, unofficial.
Voice needs a supporting browser. See per-panel labels.

## Attribution

Application code independently implemented by Muchakarla Hemanth Kumar
for SIH 2026. Third parties in `THIRD_PARTY_NOTICES.md`; provenance in
`docs/PROVENANCE.md`; summary in `ATTRIBUTION.md`.

## Third-Party Notices

See `THIRD_PARTY_NOTICES.md` (licenses verified from installed package
metadata; texts live with each package).

## Project License

**MIT License** (see `LICENSE`) — applies to the original WeatherGPT SIH 2026
application code by Muchakarla Hemanth Kumar. Third-party packages, data
services, tiles, and fonts remain under their own upstream licenses
(see `THIRD_PARTY_NOTICES.md`). Provenance is documented in
`docs/PROVENANCE.md`.

## Developer

**Muchakarla Hemanth Kumar**
B.Tech CSE – AI/ML · SRK Institute of Technology (SRKIT) · 2024–2028 · SIH 2026

## GitHub

https://github.com/hemanthhemanth1834-bit

## LinkedIn

https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/

### VibeVoice voice output (optional)

WeatherGPT can use Microsoft's VibeVoice-Realtime-0.5B as an optional TTS provider. The browser-native Web Speech engine remains the automatic fallback, so the main deployment does not require a GPU. VibeVoice is primarily documented for English and requires a separately hosted inference service; set backend `VIBEVOICE_TTS_URL` to that service's `/tts` endpoint. The integration sends only the generated `speech_text` to the voice service.

Official model/docs: https://github.com/microsoft/VibeVoice and https://huggingface.co/microsoft/VibeVoice-Realtime-0.5B
