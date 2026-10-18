> **Historical audit snapshot (2026-10-18):** This report records findings from the pre-cleanup revision. Do not treat its findings as current release status; see `docs/CLEANUP_RELEASE_NOTES.md` and the current CI/deployment checks.

# WeatherGPT Live Site Audit

Machine-run audit of the production site (baseline deployment `7097846696`,
commit `d7810ba`) and the local build of the audit branch. Every section was
visited with a real browser (chromium, 1440×900 and 390×844), console errors
and failed requests monitored, horizontal overflow measured.

## Section-by-section result (production baseline)

| # | Section (nav label) | Load | Console errors | 5xx | Overflow | Data honesty observed |
|---|---------------------|------|----------------|-----|----------|-----------------------|
| 1 | Overview | OK | 0 | 0 | none | Live weather card + computed alerts |
| 2 | Live Weather | OK | 0 | 0 | none | LIVE label, model + update time shown |
| 3 | AI Weather Deep-Cast | OK | 0 | 0 | none | GFS LIVE via Open-Meteo; WRF/MOSDAC "NOT CONFIGURED" |
| 4 | Life Cast | OK | 0 | 0 | none | placeholder cards (see finding #6) |
| 5 | Station Comparison | OK | 0 | 0 | none | Real per-city fetches |
| 6 | Climate Trends | OK | 0 | 0 | none | ESTIMATED/PROXY labels present |
| 7 | Live News Broadcast | OK | 0 | 0 | none | AlertCenter (same view as #8) |
| 8 | Severe Alerts | OK | 0 | 0 | none | "computed from live telemetry … not official IMD bulletins" |
| 9 | Disaster Management | OK | 0 | 0 | none | TRACK: DEMO DATA · ALERTS: COMPUTED |
| 10 | FloodWatch | OK | 0 | 0 | none | SIMULATED/ESTIMATED labels |
| 11 | Platform Status | OK | 0 | 0 | none | resolves out of CHECKING; per-provider status |
| 12 | Privacy & Data | OK | 0 | 0 | none | static policy text |
| 13 | About WeatherGPT | OK | 0 | 0 | none | static |
| 14 | Farm / Crop Advisory | OK | 0 | 0 | none | advisories derived from live weather |
| 15 | RoadWatch | OK | 0 | 0 | none | placeholder cards (finding #6) |
| 16 | TreeGuard | OK | 0 | 0 | none | placeholder cards (finding #6) |
| 17 | Trip Planner | OK | 0 | 0 | none | placeholder cards (finding #6) |
| 18 | UtilityWatch | OK | 0 | 0 | none | placeholder cards (finding #6) |
| 19 | Solar Energy Potential | OK | 0 | 0 | none | ESTIMATED labels; azimuth bug (finding #4) |
| 20 | AI Weather Assistant | OK | 0 | 0 | none | Grounding defects (findings #1, #3) |

Result: 20/20 sections load on desktop and mobile with **0 console errors,
0 HTTP 5xx responses, 0 horizontal overflow**.

## Imagery verification (carried from PR #25, re-verified)

- Dashboard radar/satellite figures: `DELAYED` chips, not `LIVE`;
  timestamps shown ("… recent-past composite", "… daily product").
- Home radar: "RECENT HISTORY" label; no stale "LIVE RADAR" text remains.
- RainViewer tiles load (256px) on Home; NASA GIBS tiles load (256px) on the
  satellite tab.
- Provider-outage test: tiles degrades to `UNAVAILABLE` chip + retry action,
  no infinite "LIVE" claim.

## Provider probe results (production + local, direct calls)

| Provider | Endpoint checked | Freshness | Status |
|----------|------------------|-----------|--------|
| Open-Meteo forecast | `api.open-meteo.com/v1/forecast` | current hour (matches UI temp) | LIVE |
| Open-Meteo air quality | `air-quality-api.open-meteo.com` | observed_at current half-hour | LIVE |
| Open-Meteo geocoding | `geocoding-api.open-meteo.com` | n/a | LIVE |
| RainViewer radar | `api.rainviewer.com/public/weather-maps.json` | 12 past frames, ~1.8 min age, 0 nowcast | LIVE |
| NASA GIBS (WMTS/WMS) | VIIRS/MODIS layers (previous day) | yesterday's daily product | DELAYED (honest) |
| USGS earthquakes | `earthquake.usgs.gov` M4.5+ 7d | latest events same-day | LIVE |
| NASA EONET wildfires | `eonet.gsfc.nasa.gov` | current events | LIVE |
| GDACS | UN JRC feed | current events | LIVE |
| OSM tiles | `tile.openstreetmap.org` | n/a | LIVE |
| Overpass (emergency places) | `overpass-api.de` | live query, ~13 s typical | LIVE (slow) |

Note: an earlier GIBS probe error was traced to a probe-script omission
(`version` parameter missing); the application itself calls GIBS correctly.

## Content-extraction highlights (claims found on the baseline site)

- Severe Alerts: "Computed from live telemetry against documented thresholds —
  not official IMD bulletins" — verified honest.
- Disaster Management: `TRACK: DEMO DATA`, `ALERTS: COMPUTED` — verified.
- FloodWatch: `SIMULATED` / `ESTIMATED` — verified.
- Solar: `ESTIMATED` / `MODEL` / `PROXY` — verified (plus the azimuth defect,
  fixed on the audit branch).
- Life Cast/RoadWatch/TreeGuard/UtilityWatch/Trip Planner/Deep-Cast: identical
  placeholder copy for every card ("Shows what this feature means for …") —
  replaced with computed, labelled indicators on the audit branch.
- Chat battery (11 questions) surfaced findings #1, #2 and #3; AQI shown as a
  constant state-level heuristic (78 Maharashtra, 145 Delhi, 68 Kerala/Goa)
  while a live AQI feed was available — fixed.

## Verified after fixes (local build, then production — see release report)

- Solar: azimuth within 0–359°, dynamic 8-point compass, altitude from
  sunrise/sunset solar geometry (date + latitude), all values labelled as
  estimates.
- Modules: Life Cast/RoadWatch/TreeGuard/UtilityWatch/Deep-Cast render real
  indicators computed from the live weather payload each labelled
  COMPUTED/LIVE/FORECAST/STATIC/ESTIMATED; no placeholder copy remains.
- Trip Planner: computes distance (straight-line), planning duration, arrival
  time and destination weather from live forecasts, with explicit
  "planning estimate, not routed driving time" disclaimer.
- Severe panel: independent per-feed failure handling (`Promise.allSettled`),
  explicit "unavailable" text instead of permanent spinners.
- Chat: filler words are no longer geocoded; the app location only syncs for
  explicit place names; live AQI (US EPA) flows into chat answers with source
  labelling; dates beyond the ~7-day horizon produce an explicit note.

## Second-session findings (this audit)

The sections above were re-verified on a clean worktree of
`audit/verified-release`. In addition, a chat battery surfaced one further
location defect that the first session had not covered.

### Finding #7 (P0) — unknown place resolved to an unrelated city

- Question: *"Tell me about the weather in Krishnapatnam"*.
- Baseline reply: **"Weather for Patna, Bihar"** with Patna's coordinates and
  `explicit_location=true`. Krishnapatnam is a real port town in Andhra
  Pradesh, roughly 1200 km from Patna, and the reply gave no indication that a
  different place had been substituted.
- Cause: `geo.geocode()` matched gazetteer keys by plain substring, so
  `"krishnapatnam"` matched the key `"patna"`. The same mechanism turned
  `"Bellary Road"` into Pune.
- Fixed with whole-token matching plus an explicit
  `location_resolved` flag. Unknown names now answer for the fallback city
  **with a visible note naming both places**; real names that merely contain a
  gazetteer key (`Visakhapatnam`, `Prayagraj`) still resolve correctly.

### Production status during this audit

Production served the baseline commit `d7810ba` during the main audit, with
both defects live. Post-merge update below.

### Post-merge verification (merge `a7680cd`, 2026-10-17)

The audit branch was merged and deployed. The same probes now run against
production show both defects fixed:

| Probe | Baseline (`d7810ba`) | Production after merge `a7680cd` |
|-------|----------------------|----------------------------------|
| `GET /api/weather/current?location=Pune` → `aqi` | `78` (constant heuristic, no provenance field) | **`134`**, `aqi_source` `Open-Meteo Air Quality (US EPA) · observed 2026-10-17T13:30` — consistent with `/api/air-quality` (`us_aqi 134`, same observation) |
| Chat "weather in Krishnapatnam" (`location_name=Pune`) | "Weather for Patna, Bihar" | Pune **+ "could not resolve" note**, `location_resolved=false`; no word-boundary "Patna" anywhere |

Full post-merge evidence (chat battery, smoke, browser suites incl.
modules/solar and responsive/a11y against production):
`WEATHERGPT_RELEASE_REPORT.md` §4.

Pre-existing condition noted during the post-merge runs: the `vercel.json` CSP
blocks the two external stylesheet tags in `index.html` (Google Fonts, unpkg
Leaflet CSS) → 2 resource console errors per page in production only. Present
since the baseline; impact is cosmetic (font falls back to the system stack;
Leaflet CSS is bundled). See release report §4.


## Follow-up verification — PR #27 CSP stylesheet cleanup (2026-10-17)

- PR #27 merged as `7e26b76c2f9617f194a8f747f6685d716d6f0998` after the full WeatherGPT CI job set passed (backend, frontend, browser-smoke, chat-visibility, service-smoke, production-smoke); security and dependency review workflows passed too.
- The Vercel deployment for that merge reached READY. Its preview browser run rendered the home view, loaded the bundled `index-BuSzGuDf.css` and `maps-vh-t_kPv.css`, had no Google Fonts/unpkg stylesheet links, and reported no resource or CSP console errors.
- **Production alias verification completed (2026-10-17, later session).** Fresh evidence: the live HTML contains no `fonts.googleapis`/`unpkg` references (`x-vercel-cache: HIT`, so the CDN edge itself is serving the cleaned HTML) and a fresh headless-Chrome session on the production URL reports **0 console errors/warnings**. The earlier reading that still saw the old links was a stale cached copy. Status: COMPLETED AND VERIFIED in production.


## Follow-up verification — platform upgrade (PR #28, 2026-10-17)

- PR [#28](https://github.com/hemanthhemanth1834-bit/WeatherGPT/pull/28) merged to `main` as `7314b36` after the full WeatherGPT CI job set passed on head `5e900dc`.
- The production alias serves the new bundle `index-CCJoY2cE.js` (fresh, `x-vercel-cache: MISS` at first fetch).
- The pre-existing header width bands (830–950 px, 1160–1200 px on the old build) are gone in production: 13-width sweep 830→1440 **all clean** on the live alias.
- Fresh browser sessions (Chromium + Firefox) settle the location (`New Delhi`; 1.8 s / 15.2 s via the geolocation fallback watchdog), render the home dashboard figures, and report **0 console errors/warnings** both.
- Status: COMPLETED AND VERIFIED in production.
