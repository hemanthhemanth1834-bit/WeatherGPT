# WeatherGPT Audit Implementation Log

Date: 2026-11-04
Repo: `wg-navclean-recovered` (branch `local/nav-cleanup-2026-recovered`, HEAD `c17a322`)

This log records changes made in response to the product/UI/engineering audit.
It is intentionally explicit about what is implemented, what is verified, and
what still requires authorized feeds or later roadmap phases.

## Implemented in this pass

### Ensemble uncertainty (new)

- `backend/app/services/ensemble.py`
  - Free, keyless Open-Meteo Ensemble API (`gfs025`, `ecmwf_ifs025`,
    `icon_global`).
  - Returns member spread, per-hour min/mean/max, standard deviation, and rain
    probability (share of members >= 0.5 mm/h).
  - Explicit `LIVE` / `UNAVAILABLE` status; provider failure returns no
    substituted values.
  - 10-minute cache; 12-second timeout; source and source URL included.
- `GET /api/ensemble/forecast?lat=&lon=&days=`
  - Bounds: lat -90..90, lon -180..180, days 1..7.
  - Response `data_type = ENSEMBLE_FORECAST`, `data_kind = FORECAST`.
- Frontend: `fetchEnsembleForecast()` in `frontend/src/services/api.js` and a
  "09B Ensemble Spread & Rain Probability" section in `DeepCastPanel.jsx`
  showing member count, mean/widest spread, peak rain probability, a 12-hour
  table, and the limitations.
- Tests: `backend/tests/test_ensemble.py` (parser, fail-closed, endpoint
  bounds) and `frontend/tests/deepcast_ensemble.py` (live backend, three
  viewports).

### Honesty rules applied

- Spread is disagreement, not accuracy.
- Rain probability is a member share, not a calibrated probability.
- Ensemble output is never presented as an official IMD/NDMA warning.
- No values are invented when the provider is unavailable.

## Verification evidence

| Check | Result |
| --- | --- |
| `npm run build` | PASS, 5.44s (pre-existing three.js chunk warning) |
| `npm run lint` | 0 errors, 19 pre-existing warnings |
| Backend full suite | 201 passed, 1 pre-existing warning, 312.82s |
| Focused ensemble/LLM/provider tests | 39 passed, 1 warning, 121.99s |
| Live ensemble endpoint | LIVE, 122 members, 24 hours, 3 models |
| DeepCast E2E (1440/768/390) | 3 suites, 0 failures |
| Chat live regression (1440/768/390) | 3 suites, 0 failures |
| Invalid latitude | 422 rejected |
| Engine/provider truthfulness | active DETERMINISTIC, selected openai-compatible, health NOT_CHECKED for live=false |

## Data Integrity & Reliability v2 — P0 progress (04 Nov 2026)

### Central data-kind contract

- `backend/app/services/taxonomy.py` defines canonical kinds OBSERVED,
  FORECAST, REANALYSIS, MODEL, COMPUTED, ESTIMATED, STATIC, plus OFFICIAL
  for published bulletins.
- Weather, computed and official provenance now carry `data_kind`, `units`
  and `methodology`. Risk/travel values remain COMPUTED; IMD bulletins remain
  OFFICIAL; estimated fallbacks remain ESTIMATED.
- `GET /api/data-contract` publishes version 1.0, required provenance fields,
  precedence rules and methodology notes.
- Chat evidence shows a KIND chip beside SOURCE, TYPE and FRESHNESS.

### Request-body limit

- Central middleware caps POST/PUT/PATCH bodies under `/api/` at 8192 bytes
  (`MAX_REQUEST_BODY_BYTES`), before routing.
- Oversized payloads return 413; invalid Content-Length returns 400; GET is
  untouched; legitimate chat payloads still return 200.

### Verification (this round)

| Check | Result |
| --- | --- |
| `python -m compileall -q app` | PASS |
| Focused taxonomy/body-limit/ensemble/provenance tests | 22 passed, 3.51s |
| Backend full suite | 213 passed, 1 pre-existing warning, 244.19s |
| `npm run build` | PASS, 3.67s (pre-existing three.js chunk warning) |
| `npm run lint` | 0 errors, 19 pre-existing warnings |
| `GET /api/data-contract` | 200, version 1.0, 8 kinds |
| 9000-byte chat request | 413 "Request body exceeds 8192 bytes." |
| Normal chat request | 200, provenance `data_kind=FORECAST`, `units=metric` |
| Chat evidence E2E (2 viewports) | 2 suites, 0 failures |
| Chat live integration (1440/768/390) | 3 suites, 0 failures |
| Engine/provider truthfulness | active DETERMINISTIC, selected openai-compatible, health NOT_CHECKED for live=false |

## Not implemented (requires authorization, data or a later phase)

- IMD official API, NDMA SACHET CAP, CWC river gauges, MOSDAC/ISRO,
  APSDMA: need authorized access and licence review. No scraping or fake
  feeds were added.
- Copernicus/ERA5/GloFAS: require accounts/credentials; not wired.
- Local Ollama/Qwen installation and benchmarking.
- Full nav consolidation across all audit-proposed destinations; existing
  verified routes are preserved.
- WebKit E2E: Playwright WebKit binary is missing on this machine.
- Live LLM generation success: the configured provider returned RATE_LIMIT;
  deterministic grounded fallback verified.
- Module provenance labels still come from a static frontend map rather than
  the backend taxonomy; extending it is a low-risk follow-up.

## Constraints respected

- No commit, push, merge, deploy, reset, clean, or overwrite of user work.
- No paid API or mandatory AI key.
- Existing routes, modules, datasets and uncommitted changes preserved.

## Removal & Cleanup Audit — completed

**Scope:** remove redundant prototype surfaces, shorten the homepage, simplify
routes, eliminate dead code. No backend data logic changed.

### Removed
- Files: `frontend/src/components/Navbar.jsx`,
  `ReferenceModulePanel.jsx`, `SolarPhotoPanel.jsx`, `CityComparison.jsx`.
- Routes/tabs: `compare`, `life_cast`, `roadwatch`, `treeguard`,
  `trip_planner`, `utilitywatch`, `solar`, `evacuation`. Deep-Cast is now a
  direct route to `DeepCastPanel`.
- Frontend API wrapper `fetchCityComparison` (backend comparison endpoint kept).
- Homepage: Explanation Grid, Field Notes, both editorial CineBands, Live
  Intelligence Strip, duplicate 7-day outlook/trajectory, mini-map, Satellite
  Explorer, sectoral guidance cards, and dead helpers/state. `HomePanel.jsx`
  is now 499 lines and keeps hero, briefing, hourly, alerts, risk, radar,
  freshness, shortcuts.
- Platform Status: Preview & Postponed Modules section removed.

### Verification
- `npm run build`: PASS, 1.89s, 2145 modules; only the pre-existing three.js
  560.35 kB chunk warning.
- `npm run lint`: 0 errors, 17 warnings (down from 19; all pre-existing).
- Playwright (Chromium): chat_evidence 2/2, chat_lifecycle 3/3,
  chat_live_integration 3/3, chat_visibility 4/4, deepcast_ensemble 3/3 —
  all 0 failures. Chat helpers now open the navigation drawer before routing.
- Homepage smoke at 390/768/1440: 0 px horizontal overflow, 0 page errors.
- Backend untouched: 213 tests passing baseline.

### Preserved
- DeepCastPanel and ensemble forecasting, GIS/radar/satellite, alerts,
  preparedness, FloodWatch, climate, agri, aviation/marine, AI chat.
- Earth3D retained (no approval to remove). No CSS deleted.
- HEAD c17a322; 98 uncommitted entries; no commit, push or deploy.
