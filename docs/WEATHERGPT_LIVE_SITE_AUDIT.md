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
