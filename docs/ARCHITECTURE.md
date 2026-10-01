# ARCHITECTURE — WeatherGPT SIH 2026

All components below are implemented and live in production.

```
USER (browser: chat / dashboard / map / panels)
 ↓ HTTPS (same-origin /api; CORS allowlist)
WEATHERGPT UI — React 19 + Vite + Tailwind, lazy-loaded panels,
Leaflet isolated in its own chunk, localStorage saved places
 ↓ REST /api/* + WS /ws/alerts (heartbeat)
AI / INTENT ROUTER — backend/app/services/chat.py :: answer()
 ↓ language detect (11 scripts) → place extract → intent classify
LOCATION ENGINE — backend/app/services/geo.py
 ↓ 100+ city gazetteer → Open-Meteo geocoding (24h cache) → default
 ↓ GPS path: browser Geolocation → /api/locations/reverse (BigDataCloud)
TOOLS (deterministic, numbers always originate here)
 ├─ weather.py — Open-Meteo forecast (auto blend or GFS), TTL 10 min
 ├─ air_quality.py — Open-Meteo AQ (US AQI + 6 pollutants), TTL 30 min
 ├─ advisories.py — marine via Open-Meteo Marine (TTL 30 min) else empirical
 │   FALLBACK; crops (rules); aviation STATIC samples; climate STATIC series
 ├─ aviation_live.py — NOAA ADDS METAR/TAF (TTL 30 min) else STATIC sample
 ├─ history.py — Open-Meteo Archive/ERA5 yearly + monthly (TTL 24 h)
 ├─ alerts.py — 10-station live telemetry scan vs documented thresholds
 │   (rain/storm/heat/cold/coastal), TTL effectively per-request
 ├─ gdacs.py — UN JRC global events feed (TTL 30 min)
 ├─ risk_engine.py + travel.py — deterministic LOW→EXTREME / trip read
 └─ geo.reverse — BigDataCloud GPS→city (TTL 24 h)
FREE DATA PROVIDERS — Open-Meteo ×5, RainViewer, NASA GIBS, NOAA ADDS,
BigDataCloud, GDACS, OSM tiles, Web Speech (browser)
 ↓
PROVENANCE + VALIDATION — every payload: source, status
(LIVE/OFFICIAL/COMPUTED/FALLBACK/ESTIMATED/SIMULATED/DEMO/STATIC/NOT CONFIGURED),
IST timestamp; shared http.py timeout+retry+backoff; per-IP rate limit;
pydantic validation; guarded endpoints (honest 502, never 500 leak)
 ↓
GROUNDED RESPONSE — templated per-language reply + speech text, or honest
"data unavailable" message. Figures are never invented (regression-tested).
```

## Frontend / backend split

- Frontend: presentation + input only. No keys, no secrets, no direct
  third-party calls except RainViewer tiles/GIBS links (public, keyless).
- Backend: all provider calls, caching, routing, validation, CORS, rate limit.
- Cache: in-memory TTL per data type (alerts shortest, geocoding/history longest).
- Fallback order everywhere: LIVE → FALLBACK → ESTIMATED/SIMULATED, labelled.

## Security

See `docs/SECURITY.md`. Keys server-env only; `.env` git-ignored;
`.env.example` placeholders; CORS allowlist with safe wildcard rule;
120→300/min rate limit with 429+Retry-After; 500-char query cap.

## Deployment

Vercel project `muchakarla/weathergpt`: static Vite build + Python
serverless function (`api/index.py`), `/api/*` rewrites, production env
`CORS_ALLOW_ORIGINS` set to the site URL. Same-origin `/api` default.
