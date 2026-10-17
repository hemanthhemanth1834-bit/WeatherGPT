# WeatherGPT Baseline Audit

Scope definition and verified baseline for the autonomous audit + verified-release
effort. Everything in this document was checked against the real repository and
the live production site — nothing is assumed.

## Repository & deployment baseline

- Repository: `hemanthhemanth1834-bit/WeatherGPT` (default branch `main`).
- Baseline commit at audit start: `d7810ba30c8e657123bc68ca5e61aaff69b34db0`
  (merge of PR #25, site-wide imagery honesty upgrade).
- CI status at baseline: green (run `38766374244`, chromium + firefox).
- Production: `https://weathergpt-kappa-pink.vercel.app/` — deployment
  `7097846696`, serving the baseline commit.
- Audit branch: `audit/verified-release` (created from `main@d7810ba`,
  never force-pushed).

## Environment

- Windows 11, PowerShell 5.1, Python 3.12, Node/npm with Vite 8, oxlint.
- Local verification stack: FastAPI (`uvicorn app.main:app` on `127.0.0.1:8000`)
  + `vite preview` on `127.0.0.1:4173`, Playwright (chromium locally; CI adds
  firefox).
- Free-only data posture confirmed: no paid APIs, no API keys required by any
  runtime provider (see `WEATHERGPT_DATA_SOURCE_REGISTER.md`).

## Working-tree preservation

The pre-existing working checkout (outside this audit's clone) held unfinished
local changes (8 modified files + one stash). These were **not touched**; the
audit and all fixes were performed in a separate clean clone to guarantee no
WIP loss.

## Method

1. **Baseline** — confirm commit, CI and WIP state (this document).
2. **Live site audit** — crawl/click all 20 navigation sections on desktop and
   mobile viewports; record console errors, HTTP 5xx, layout overflow; extract
   visible claims (labels, timestamps, sources) per section.
   → `WEATHERGPT_LIVE_SITE_AUDIT.md`
3. **Provider probes** — hit every external data path directly and record
   freshness (Open-Meteo, Air Quality, Geocoding, RainViewer, NASA GIBS, USGS,
   EONET, GDACS, OSM tiles, Overpass).
4. **AI grounding test** — 11-question battery against the production chat
   endpoint (filler words, deictic references, fantasy places, future dates,
   AQI, alerts honesty). Findings drove the P0 fixes.
5. **Fix + verify** — root-cause fixes only, each with a regression test
   (see `WEATHERGPT_TEST_REPORT.md`).
6. **Release** — PR → CI → merge → deploy → production re-verification
   (see `WEATHERGPT_RELEASE_REPORT.md`).

## Baseline findings summary

The baseline was functional and honest in most sections but had six verified
defects, all fixed on the audit branch:

| # | Severity | Finding | Where |
|---|----------|---------|-------|
| 1 | P0 | Filler word "this" geocoded to "This, Grand Est" (France) and poisoned the app location | `backend/app/services/chat.py`, `frontend/src/App.jsx` |
| 2 | P0 | Live AQI feed existed but was unused in the main weather path (constant heuristic 78/145/68) | `backend/app/services/weather.py` |
| 3 | P1 | Future-date questions (beyond 7-day horizon) answered with current-day data, unlabelled | `backend/app/services/chat.py` |
| 4 | P1 | Solar panel showed impossible azimuth (≥360°, hardcoded "(SW)") and UV-derived altitude proxy | `frontend/src/components/ReferenceModulePanel.jsx` |
| 5 | P1 | Severe-weather panel: `Promise.all` + `catch → null` = permanent "Loading…" text on any provider failure | `frontend/src/components/SevereWeatherPanel.jsx` |
| 6 | P2 | Life Cast / RoadWatch / TreeGuard / UtilityWatch / Trip Planner / Deep-Cast showed identical placeholder copy instead of functional indicators | `frontend/src/components/ReferenceModulePanel.jsx` |

## Non-defects confirmed (documented, intentionally unchanged)

- "Live News Broadcast" and "Severe Alerts" navigation items both open the same
  `AlertCenter` tab. This is a navigation alias, not duplicated data; no news
  feed is fabricated.
- "Save report" in Platform Status stores the diagnostic report to
  `localStorage` (not a file download) — intended behavior.
- Cyclone track panel is labelled DEMO and draws demonstration geometry only.
- Compare-tab "my selected location" resolving to the previous city was a
  consequence of intentional app-location sync; kept, but guarded so only
  **explicit** places may move the active location (fix #1).
