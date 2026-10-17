# WeatherGPT — Remaining Work Register

Single source of truth for what is done, what is verified, and what is left.
Every status below is backed by a command or an observation recorded in
`WEATHERGPT_TEST_REPORT.md`, `WEATHERGPT_LIVE_SITE_AUDIT.md` or
`WEATHERGPT_BASELINE_AUDIT.md`. Nothing here is projected.

- Repository: `hemanthhemanth1834-bit/WeatherGPT`
- Baseline commit (audit start): `d7810ba30c8e657123bc68ca5e61aaff69b34db0`
- Audit branch: `audit/verified-release`
- Status legend: **COMPLETED AND VERIFIED** · **IMPLEMENTED BUT UNVERIFIED** ·
  **PARTIALLY COMPLETE** · **FAILING** · **NOT IMPLEMENTED** · **BLOCKED**

---

## 1. Work that was already complete and verified (skipped)

| Task | Evidence | Status |
|------|----------|--------|
| Assistant message visibility, clipping and contrast (PR #24) | Present on `main`; `tests/chat_visibility.py` PASS on this machine (contrast 16.58:1, 0 clipped messages, both viewports) | COMPLETED AND VERIFIED |
| Site-wide honest radar/satellite imagery, `DELAYED`/`RECENT HISTORY` labels, outage degradation (PR #25) | Merged into `main` at `d7810ba`; `tests/imagery_visibility.py` PASS (DELAYED labels, `UNAVAILABLE` on outage, retry offered) | COMPLETED AND VERIFIED |
| Weather model selection + AQI provenance groundwork (PR #23) | On `main`; model query paths return 200 in the smoke battery | COMPLETED AND VERIFIED |
| 20-section navigation renders on desktop and mobile | `WEATHERGPT_LIVE_SITE_AUDIT.md`: 20/20 sections, 0 console errors, 0 HTTP 5xx, 0 horizontal overflow | COMPLETED AND VERIFIED |
| Browser regression suites exist in CI | `.github/workflows/ci.yml`: `browser-smoke`, `chat-visibility` (chromium+firefox), `production-smoke` | COMPLETED AND VERIFIED |
| Backend test suite baseline | 121 passed on the audit branch (this run, see test report) | COMPLETED AND VERIFIED |
| CI green on `main` | Run `38766374244` (WeatherGPT CI) success | COMPLETED AND VERIFIED |

## 2. Implemented on `audit/verified-release`, verified in this run

Covered by PR [#26](https://github.com/hemanthhemanth1834-bit/WeatherGPT/pull/26)
(open, mergeable/clean, all checks green incl. Vercel preview).

| # | Task | Verification performed in this run | Status |
|---|------|------------------------------------|--------|
| 2.1 | Chat grounding: filler words / deictic phrases must not be geocoded | 8-question live battery against a local API; "this answer" → active location with `explicit_location=false`; no "Grand Est" | COMPLETED AND VERIFIED |
| 2.2 | Live AQI (US EPA) merged into the main weather path | Production baseline reproduced the defect (see §3.1). Local API now returns `aqi=133` matching Open-Meteo `us_aqi=133` with `aqi_source` provenance string | COMPLETED AND VERIFIED |
| 2.3 | Forecast-horizon honesty for dates beyond ~7 days | Full response for "15 November 2026" contains the explicit horizon note (response was truncated in the earlier 420-char probe; the full body carries it) | COMPLETED AND VERIFIED |
| 2.4 | Solar geometry: impossible azimuth ≥360° / hardcoded "(SW)" | `modules_solar_planner.py`: azimuth 184°, compass "S" from a real 8-point set, estimate disclaimer present | COMPLETED AND VERIFIED |
| 2.5 | Severe panel permanent "Loading…" on provider failure | `Promise.allSettled` per feed; browser suite confirms OSM/USGS/EONET/flood slots all resolve, no permanent loading text | COMPLETED AND VERIFIED |
| 2.6 | Life Cast / RoadWatch / TreeGuard / UtilityWatch / Deep-Cast placeholder copy | Browser suite: ≥4 cards and ≥4 non-empty computed metric values per module, placeholder copy absent, labels COMPUTED/LIVE/FORECAST/STATIC/ESTIMATED | COMPLETED AND VERIFIED |
| 2.7 | Trip Planner arrival weather | Distance, arrival time and explicit "planning estimates" disclaimer all asserted present | COMPLETED AND VERIFIED |
| 2.8 | Deep-Cast honesty for unconfigured soundings | `NOT CONFIGURED` text asserted present (no fabricated sounding data) | COMPLETED AND VERIFIED |

## 3. Defects found and fixed in THIS session

### 3.1 P0 — unknown place silently answered as an unrelated city

- **Found by**: live grounding battery — "Tell me about the weather in
  Krishnapatnam" returned *"Weather for **Patna**, Bihar"* with
  `explicit_location=true` and Patna's coordinates (25.5941, 85.1376), ~1200 km
  from the real Krishnapatnam.
- **Root cause**: `backend/app/services/geo.py::geocode` matched gazetteer keys
  by plain substring (`if key in query`). `"krishnapatnam"` contains
  `"patna"`. The same class of bug produced `"Bellary Road"` → Pune.
- **Fix**: whole-token matching (`all(token in tokens …)`), preserving
  legitimate multi-word keys (`new delhi`, `navi mumbai`).
- **Reproduced before / after**:

  | Query | Before | After |
  |-------|--------|-------|
  | `Krishnapatnam` | `Patna, Bihar` (25.5941, 85.1376) | `Pune` + explicit "could not resolve" note (`location_resolved=false`) |
  | `Bellary Road` | `Pune`(silently, via substring) | live geocoder → default + note |
  | `Visakhapatnam` | `Visakhapatnam` | `Visakhapatnam` (unchanged) |
  | `Navi Mumbai` | `Navi Mumbai` | `Navi Mumbai` (unchanged) |

- **Regression coverage added**: `backend/tests/test_geo.py`
  (`test_unknown_place_is_not_substring_matched_to_gazetteer`,
  `test_substring_neighbour_still_resolves_when_real`,
  `test_multiword_gazetteer_still_matches`,
  `test_unknown_place_never_invents_state`,
  `test_resolve_reports_real_provenance`,
  `test_resolve_uses_live_geocoder_when_gazetteer_misses`,
  `test_geocode_signature_unchanged`) and `backend/tests/test_chat_grounding.py`
  (`test_unknown_place_is_reported_unresolved`), plus two browser assertions in
  `frontend/tests/modules_solar_planner.py`.
- **Status**: COMPLETED AND VERIFIED (local API + browser).

### 3.2 P1 — unresolvable place presented as if it were the asked location

- **Found by**: the same probe. Once the substring bug is fixed, an unknown
  name falls back to the built-in default (Pune) with no visible indication,
  so the reply still reads as though Pune were the requested place.
- **Fix**: `geo.resolve()` reports resolution provenance; `ChatResponse` gains
  `location_resolved`; the markdown reply appends
  *"Note: I could not resolve “X” to a location, so the figures above are for
  Pune, not the place you named."* `geocode()` keeps its 4-tuple signature so
  all other callers are untouched.
- **Evidence**: local API response for `Krishnapatnam` →
  `location_resolved:false` + note; `Rajahmundry` → `location_resolved:true`,
  no note; browser assertion PASS.
- **Status**: COMPLETED AND VERIFIED.

### 3.3 P1 — an unresolved answer still moved the app's active location

- **Found by**: the new browser assertion (see §3.4 for the false alarm that
  preceded it). Asking about an unresolvable place still pushed the app's
  active location to the fallback city.
- **Root cause**: `frontend/src/App.jsx` synced the app location whenever the
  backend reported `explicit_location`. An explicit-but-unresolved place is
  still `explicit_location: true`, so the fallback city was adopted silently —
  the mirror image of the prior session's anti-hijack guard.
- **Fix**: the sync now also requires `location_resolved !== false`. The reply
  still names the city it describes; the app's own location is untouched.
- **Regression coverage**: third assertion in the
  `[chat unknown-place honesty]` block of `modules_solar_planner.py`
  (`unresolvable place did not move the app location`).
- **Status**: COMPLETED AND VERIFIED.

### 3.4 P1 — flaky browser assertion (test defect, not product defect)

- **Found by**: first local run of `modules_solar_planner.py` — `chat: active
  location unchanged (Detecting location…)` failed.
- **Root cause**: the suite captured `start_location` from the header while it
  still displayed the "Detecting location…" placeholder, then compared it to
  the settled value later. The assertion itself is valid; the readiness check
  was racy.
- **Fix**: added a `stable_location()` helper that waits for two identical
  consecutive reads (placeholder excluded) and used it for both the baseline
  and the final comparison. The assertion was **not** weakened.
- **Evidence**: identical suite now PASS with
  `active location unchanged ('New Delhi' -> 'New Delhi')`.
- **Status**: COMPLETED AND VERIFIED.

### 3.5 Harness defect — `vite preview` served a stale bundle

- **Found by**: a complete FAIL of the new location-hijack assertion after the
  frontend fix had demonstrably been compiled into `dist`.
- **Root cause**: `vite preview` reads `index.html` at startup. The rebuilt
  bundle had a new content hash, but the running preview server kept serving
  the old HTML and therefore the old JavaScript. The backend response was
  verified correct at the same moment (raw `location_resolved: false`
  captured from the browser's own network log).
- **Fix**: restart the preview server after every `npm run build`; the served
  bundle hash is now checked explicitly. Recorded as an operational note in
  `WEATHERGPT_TEST_REPORT.md`.
- **Status**: COMPLETED AND VERIFIED (not a product defect).

## 4. Remaining work

| Task | Detail | Status |
|------|--------|--------|
| Merge PR #26 to `main` | PR is mergeable/clean with green CI and a Vercel preview build. Merge to `main` was **not** performed: it publishes to the public production site. Authorisation given for this session covered pushing the branch and updating the PR, not merging. | BLOCKED (awaiting authorisation) |
| Production verification of the fixes | Requires the merge/deploy above. Production as of this run still shows `aqi=78` for Pune and the Patna false-positive. | NOT TESTED (blocked by deploy) |
| Firefox/WebKit local runs | Only chromium is installed locally (`chromium-1243`); CI runs chromium+firefox. Not a product gap — a local-coverage gap. | NOT TESTED (locally) |
| Vercel deployment-log inspection | Propagate API returned 403 (no Vercel token in this environment). Deployment identity was verified indirectly via the GitHub `Vercel` commit status on the PR head. | BLOCKED (no credentials) |
| Load/performance benchmarking | Never claimed. `three` chunk is 565 kB (139 kB gzip) — a P3 optimisation candidate. | NOT IMPLEMENTED |

## 5. Honesty notes carried forward

- No weather value, warning, provider status or AI result in this document was
  invented; each figure is copied from an observed response.
- Mocked fixtures used by the browser suites are labelled as fixtures inside
  the fixture text itself and are never presented as live provider data.
- "Live News Broadcast" and "Severe Alerts" intentionally open the same
  `AlertCenter` view (navigation alias, documented as a non-defect).
- The cyclone track panel remains `DEMO` geometry and is never presented as
  live storm positions.
