> **Historical report (2026-10-18):** This document preserves evidence from its original tested revision. Its findings and test results are not a claim about the current cleanup branch or production deployment. Check the latest CI run and `docs/CLEANUP_RELEASE_NOTES.md` for current status.

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
| 2.9 | Icon-only header controls: accessible names; responsive/a11y matrix unverified | 4 `aria-label`s added (station comparison, font scale, alerts, settings); new `frontend/tests/responsive_accessibility.py`: 6-viewport matrix (320→1440), accessible-name check, heading order, keyboard reachability + visible focus, reduced-motion render — **39 checks, 0 failures** | COMPLETED AND VERIFIED |

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

### 3.6 P2 — header settings button unreachable at 320px

- **Found by**: the new `responsive_accessibility.py` suite, 320×568 cell. At
  ≤820px the settings icon button (which opens Settings/Platform) is the only
  visible header action; at 320px it was laid out at x=318–352 — a ~2px
  sliver, clipped away by the app root's `overflow-x:hidden` guard, invisible
  and untappable.
- **Root cause**: `menu (38) + gap (14) + brand (flex-shrink:0, 240) + gap
  (14) + actions (34)` = 352px of natural width; nothing brought it inside
  320px.
- **Fix**: `frontend/src/components/ReferenceChrome.css` —
  `@media(max-width:400px)` compacts the brand (`font-size:15px`, hides the
  decorative "PRO AI" badge). The full brand returns at ≥401px.
- **Reproduced before / after**:

  | Probe at 320×568 | Before | After |
  |------------------|--------|-------|
  | `.wg-ref-header-actions` box | 318→352 (clipped away) | 274→308 (fully inside) |
  | Header screenshot | gear icon not visible | gear icon visible top-right |
  | Matrix result | 1 FAIL | 0 failures (39 checks) |

- **Status**: COMPLETED AND VERIFIED.

## 4. Remaining work

| Task | Detail | Status |
|------|--------|--------|
| Merge PR #26 to `main` | Merged as `a7680cd` on 2026-10-17 after explicit owner authorisation; all workflows on `main@a7680cd` green. | COMPLETED AND VERIFIED |
| Production deployment | Vercel production now serves the merged bundle (`assets/index-BuSzGuDf.css`, matching the local build hash). | COMPLETED AND VERIFIED |
| Production verification of the fixes | API/chat probes plus all four browser suites re-run against production: AQI consistent (134 ≡ 134, same observation); unknown place answered with the resolution note, no Patna; modules/solar and responsive/a11y checks all pass. See `WEATHERGPT_RELEASE_REPORT.md` §4. | COMPLETED AND VERIFIED |
| Production console noise: CSP blocked 2 external stylesheet tags (Google Fonts; redundant unpkg Leaflet CSS) | **Resolved by PR #27** (merged `7e26b76`): the two dead tags were removed from `frontend/index.html` without weakening the CSP. Production verification was completed with fresh evidence: the live HTML contains no `fonts.googleapis`/`unpkg` references (CDN `x-vercel-cache: HIT` serves the new HTML) and a fresh headless-Chrome session on the production URL reports **0 console errors/warnings** (only a normal map-tile abort). The earlier "old links still observed" note was a stale cached copy. | COMPLETED AND VERIFIED |
| Firefox/WebKit local runs | Locally there is **no bundled Chromium** (system Chrome is used via `WG_CHROME_PATH`) and no WebKit; the bundled Playwright **Firefox (`firefox-1555`) is installed** and now actually runs locally after fixing the suite harness to apply `WG_CHROME_PATH` to chromium only (matching `chat_visibility`/`imagery_visibility`). CI runs chromium+firefox. | chromium+firefox TESTED locally; WebKit CI-only |
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


## 6. Follow-up: CSP stylesheet cleanup (PR #27, 2026-10-17)

- PR [#27](https://github.com/hemanthhemanth1834-bit/WeatherGPT/pull/27) merged to `main` as `7e26b76c2f9617f194a8f747f6685d716d6f0998` after all WeatherGPT CI jobs passed; dependency/security review and secret/workflow security checks also passed. Vercel production deployment reached READY.
- Removed the blocked Google Fonts stylesheet and redundant unpkg Leaflet stylesheet links from `frontend/index.html`. No CSP weakening, new dependency, paid service, or API key was introduced.
- Preview browser verification: home view renders; only the two same-origin bundled CSS files are linked; no Google Fonts/unpkg stylesheet links; no resource/CSP console errors detected.
- **Production alias verification completed (2026-10-17, later session)**: a fresh probe of `https://weathergpt-kappa-pink.vercel.app/` serves HTML with no `fonts.googleapis`/`unpkg` references (`x-vercel-cache: HIT`, so the CDN itself serves the cleaned HTML), and a fresh headless-Chrome session reports **0 console errors/warnings**. The earlier "old links still observed" reading was a stale cached copy; the alias now demonstrably serves the cleaned HTML.
- Remaining independent items: load/performance benchmark not implemented; Firefox/WebKit were not run locally (CI browser matrix covers Chromium/Firefox); direct Vercel build-log inspection remains unavailable without deployment credentials.

## 7. Platform-upgrade + imagery pass (branch `feat/platform-upgrade`)

Continues PRs #26/#27. Full status table in `WEATHERGPT_COMPLETION_REPORT.md`.

| Item | Detail | Status |
|------|--------|--------|
| Stage D/E visual + module fixes (8 items) | Solar `\n`/badge, climate axis clamp, compare provenance + placeholders, dashboard AQI tile, FloodWatch auto-assess, header pill | COMPLETED AND VERIFIED (probe + suite assertions) |
| Round-2 fixes | CapabilitiesHub providers card honest states + request timeouts; pill selector-collision regression fixed with dedicated class | COMPLETED AND VERIFIED (probe 2) |
| Live-imagery expansion | NASA GIBS flood-water 2-day composite, GPM IMERG rain rate, MODIS aerosol depth added to the existing `LiveImagery` architecture; FloodWatch flood-context figure; per-layer honesty notes | COMPLETED AND VERIFIED (live WMS probes + probe 2 + suite assertions) |
| Keyed stock-photo APIs (Unsplash/Pexels/Pixabay) | Not integrated: require keys; project ships keyless-only; stock photos risk misrepresentation as current conditions | NOT IMPLEMENTED (documented decision, data-source register) |
| Wikimedia/NASA-Images illustrative content | Candidate for future *clearly illustrative* sections; needs per-file licence review | NOT IMPLEMENTED (future work) |
| Backend `active_alerts()`/provider-health latency | Local cold calls ≈50 s vs ≈33 s (sequential per-station provider fan-out, single backend process). Not refactored in this pass — UI/state honesty hardened instead; documented. | DOCUMENTED (not a functional defect) |
| Local browser harness fix | `WG_CHROME_PATH` now applied to chromium only in `modules_solar_planner.py` + `responsive_accessibility.py` (they previously passed the Chrome binary to the Firefox launcher) | COMPLETED AND VERIFIED (Firefox suite runs locally) |
| Round-3 geolocation watchdog | `App.jsx` 12 s callback watchdog (honest fallback; a late callback still wins) removes the Firefox/real-user "Detecting location…" hang | COMPLETED AND VERIFIED (probe: settles 26.9 s local / 15.2 s prod; pre-fix Firefox stayed on the placeholder past 120 s) |
| Round-3 suite readiness + noise attribution | Chat checks wait for the rendered reply (120 s bound) + warm-up pre-flights; FloodWatch assess pre-warm; compare cell-readiness wait; console noise attributed to recorded failed third-party requests in all three local suites; asserts unchanged | COMPLETED AND VERIFIED (final chain: chromium modules 43/44 — both compare checks PASS, 1 attributed noise entry; responsive + imagery ALL PASS both engines) |
| Initial-load auto-retry / header state under cold load | When the first automatic weather fetch fails (the UI client aborts at 20 s by design, under this machine's local queue), the app shows its honest "Could not load weather…" notice but the header keeps "Detecting location…" and nothing retries; observed once in the Firefox suite under back-to-back load (idle-backend Firefox settles in 26.9 s / production 15.2 s) | DONE 2026-10-18 — one silent ~5 s retry, honest header placeholders, rendered notice banner, real Online pill; verified by `initial_load_recovery.py` (14/14 chromium+firefox on the L1 and L4 builds) |
| PR #28 release | Merged as `7314b36` after CI green on `5e900dc`; alias serves `index-CCJoY2cE.js`; 13-width sweep all clean; watchdog/console probes 0 errors | COMPLETED AND VERIFIED in production |
