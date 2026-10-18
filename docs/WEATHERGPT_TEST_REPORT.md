> **Historical report (2026-10-18):** This document preserves evidence from its original tested revision. Its findings and test results are not a claim about the current cleanup branch or production deployment. Check the latest CI run and `docs/CLEANUP_RELEASE_NOTES.md` for current status.

# WeatherGPT Test Report — audit/verified-release

All results below were produced by running the commands on this machine against
the audit branch. No result is projected or assumed.

## Independent re-verification (second session)

A later session re-ran the suites on a clean worktree of `audit/verified-release`
so the earlier results were not taken on trust. Same toolchain (Windows 11,
Python 3.12.10, Node 24.19.0, oxlint, vite 8, Playwright with system Chrome).

| Command | Result | Notes |
|---------|--------|-------|
| `python -m pytest tests/ -q` (baseline, before this session's fix) | **121 passed**, exit 0, 1 third-party warning | 297.66 s |
| `python -m pytest tests/ -q` (**final, after this session's fix**) | **130 passed**, exit 0, 1 third-party warning | 392.46 s; 9 new tests added |
| `python -m pytest tests/test_geo.py tests/test_chat_grounding.py tests/test_hardening.py -q` | 35 passed, exit 0 | 13.07 s |
| `python -m pytest tests/test_geo.py tests/test_chat_grounding.py -q` | 25 passed, exit 0 | 1.46 s |
| `npm run lint` | **28 warnings, 0 errors**, exit 0 | identical to the documented baseline |
| `npm run build` | exit 0 | only the pre-existing >500 kB chunk notice (`three`, 564.83 kB / 139.85 kB gz) |
| `python tests/chat_visibility.py` | 2 suites, **0 failures** | contrast min 16.58:1; no clipped messages |
| `python tests/imagery_visibility.py` | 2 suites, **0 failures** | `DELAYED`/`UNAVAILABLE` honesty asserted |
| `python tests/modules_solar_planner.py` | **30 checks, 0 failures**, exit 0 | 26 original + 4 new location-honesty assertions |
| `python tests/responsive_accessibility.py` (**new**) | **39 checks, 0 failures**, exit 0 | 6-viewport matrix + keyboard/focus + reduced-motion; its first run caught the real 320px defect recorded below; fully green after the fix |
| API smoke battery (17 endpoints, port 8000) | **17/17 HTTP 200** | `/robots.txt` + `/sitemap.xml` are frontend assets → verified 200 on the preview server (`/manifest.json` too) |
| GitHub Actions on the pushed head `518934e` | **all checks pass** | backend 4m37s, browser-smoke 1m48s, chat-visibility 2m42s, frontend 16s, production-smoke 18s, service-smoke 20s, secret-scan, backend-audit, frontend-audit; Vercel preview deployment completed |

> Operational note for future runs: `vite preview` caches `index.html` at
> startup. After `npm run build` you must restart the preview server, or the
> browser suites will exercise the previous bundle (this produced one
> misleading FAIL that was traced to the stale HTML, not to the app).

## Backend (pytest)

Command: `python -m pytest tests/ -q` (from `backend/`, `PYTHONUTF8=1`)

- **130 passed**, 0 failed, 1 third-party deprecation warning
  (`starlette.testclient` / `httpx` notice — pre-existing, not ours).
  121 of these were the branch baseline; 9 were added by the location fix
  described below.
- New coverage added by this release:
  - `tests/test_chat_grounding.py` (10 tests): filler words are not places;
    deictic phrases use the active location without the explicit flag;
    real cities flagged explicit; article-after-preposition rejection;
    forecast-horizon note for far-future months; no note within horizon;
    "may" as a verb does not trigger the note.
  - `tests/test_weather_model_selection.py` (+3): heuristic AQI is labeled,
    live AQI renders without a heuristic suffix, live AQI merged on top of
    cached weather, AQI outage keeps the labelled heuristic.

## Frontend (static checks)

- `npm run lint` (oxlint): **28 warnings, 0 errors** — identical to the
  pre-audit baseline (no new warnings introduced; one new warning created
  during development was fixed before commit).
- `npm run build` (vite): production build succeeds; output bundle sizes
  unchanged in character (no new dependencies).

## Frontend (Playwright, local build + live backend)

Command family: `python frontend/tests/<suite>.py`
with `WG_BROWSERS=chromium`, `WG_CHROME_PATH` pointing at system Chrome.

- `chat_visibility.py` — PASS (2 suites, 0 failures): message visibility,
  contrast ≥ 4.5, API-error and network-abort bubbles, no clipping.
- `imagery_visibility.py` — PASS (2 suites, 0 failures): no stale LIVE labels,
  outage degrades to UNAVAILABLE, retry offered.
- `modules_solar_planner.py` — **new**, PASS (26 checks): solar azimuth within
  0–359° with a real 8-point compass; all five sector modules render ≥4
  computed metric values (no placeholder copy); trip planner produces
  distance/arrival/disclaimer; deep-cast shows honest "NOT CONFIGURED"
  soundings; severe panel resolves out of all loading states; chat filler-word
  regression absent; app location unchanged after a non-explicit question;
  0 console errors. Re-run in the second session with **30 checks** (four added
  for the unknown-place fix below), 0 failures.

## Regression coverage added in the second session

| Test | Guards |
|------|--------|
| `test_geo.py::test_unknown_place_is_not_substring_matched_to_gazetteer` | `"krishnapatnam"` must not resolve to Patna |
| `test_geo.py::test_substring_neighbour_still_resolves_when_real` | real Visakhapatnam still resolves |
| `test_geo.py::test_multiword_gazetteer_still_matches` | `"NAVI-MUMBAI"` still resolves |
| `test_geo.py::test_unknown_place_never_invents_state` | `"Bellary Road"` is not substring-matched |
| `test_geo.py::test_resolve_reports_real_provenance` | `resolve()` provenance is truthful |
| `test_geo.py::test_resolve_uses_live_geocoder_when_gazetteer_misses` | live hits report `resolved=True` |
| `test_geo.py::test_geocode_signature_unchanged` | existing 4-tuple callers unaffected |
| `test_chat_grounding.py::test_unresolved_location_note_names_both_places` | the note names both places |
| `test_chat_grounding.py::test_unknown_place_is_reported_unresolved` | the honesty note fires |
| `modules_solar_planner.py` `[chat unknown-place honesty]` (4 assertions) | note visible in the UI; no "Patna" leak; app location does not move |

## Responsive & accessibility verification (second session)

New suite `frontend/tests/responsive_accessibility.py`, run against the built
bundle + live backend on chromium:

- **Viewport matrix** — 320×568, 360×740, 390×844, 768×1024, 1024×768,
  1440×900. Per viewport: no page-level horizontal overflow; no visible,
  in-flow element past the viewport edge; every control has an accessible
  name; at most one `h1`; no skipped heading levels; zero console errors.
- **Keyboard/focus** — 24 focusable controls reached with Tab; the first six
  all show a visible focus outline/ring.
- **Reduced motion** — content renders completely under
  `prefers-reduced-motion: reduce`.
- **Result**: 39 checks, 0 failures (final run on the rebuilt bundle).

Deliberate checker semantics (so the result stays meaningful): the overflow
probe ignores decorative `aria-hidden` layers, the off-canvas closed mobile
drawer, and elements clipped by a real container (the map viewport's tile
canvases) — but it does **not** treat the app root's `overflow-x:hidden` as
legitimate clipping, so genuine header overflow is still reported. That is
exactly how the defect below was caught on the suite's first run.

Defect found and fixed: at 320px the header's settings icon button was pushed
past the right edge (318→352 in a 320px viewport) and clipped away by the app
root — `0` page overflow never showed it. Fixed with a `≤400px` compact-brand
rule in `ReferenceChrome.css`; after the fix the button occupies 274→308 and
the whole matrix is green. Four icon-only header controls (station comparison,
font scale, alerts, settings) were given explicit `aria-label`s so the
accessible-name check no longer relies on icon glyphs.

## Live chat grounding spot-checks (local API, same code as deploy)

| Question | Expected | Observed |
|----------|----------|----------|
| "What is the source and update time of this answer?" | Answers for active location, no geocode of "this" | Pune, `explicit_location=false`, no Grand Est anywhere |
| "What about my selected location?" | Active location, not a world city | Pune, `explicit_location=false` |
| "What is the AQI in Pune?" | Live US-EPA AQI, not heuristic | **133 (Unhealthy for Sensitive Groups)**, live source string |
| "What will the weather be like on 15 November 2026 in Pune?" | Explicit horizon note (>7 days) | Horizon note present |
| "weather in Rajahmundry tomorrow?" | Explicit city | `Rajahmundry`, `explicit_location=true` |
| "Tell me about the weather in Krishnapatnam" | Must NOT claim Patna | `location_resolved=false` + *"could not resolve … figures above are for Pune"*; no Patna |
| "What is the current temperature in Rajahmundry?" | Resolved normally | `location_resolved=true`, live figures for Rajahmundry |

### Production baseline reproduced directly (before the fix reaches production)

| Probe | Observed on `weathergpt-kappa-pink.vercel.app` |
|-------|-----------------------------------------------|
| `GET /api/air-quality?location=Pune` | `us_aqi 133`, `observed_at 2026-10-17T11:30`, `Open-Meteo Air Quality`, status LIVE |
| `GET /api/weather/current?location=Pune` | `aqi 78` — the constant heuristic, no `aqi_source` field |

The two endpoints disagree, which is exactly the P0 defect PR #26 removes: the
live feed was fetched but not merged into the main weather path.

## Production verification (post-merge `a7680cd`)

Run after the authorised merge and Vercel deploy, directly against
`https://weathergpt-kappa-pink.vercel.app` (read-only). Full tables in
`WEATHERGPT_RELEASE_REPORT.md` §4; summary:

- API: `weather/current` `aqi 134` ≡ `air-quality` `us_aqi 134` (same 13:30
  observation; baseline disagreed 78 vs 133).
- Chat (frontend payload): Krishnapatnam → honest "could not resolve" note,
  no word-boundary `Patna`; deictic → active location,
  `explicit_location=false`; live AQI line `US AQI 134`; horizon note for
  November.
- Smoke: 18/18 HTTP 200; `/robots.txt`, `/sitemap.xml`, `/manifest.json` 200.
- Browser suites against production (chromium): modules/solar/planner/chat
  honesty — all functional checks PASS; `chat_visibility.py` 0 failures;
  `imagery_visibility.py` functional checks PASS (one transient provider 503
  console entry at 390px); `responsive_accessibility.py` all viewport checks
  PASS (320→1440).
- Console caveat (production only, pre-existing, not introduced by this
  release): the Vercel CSP blocks the two external stylesheet tags in
  `index.html` → 2 resource console errors per load (font falls back to the
  system stack; Leaflet CSS is bundled, map unaffected). Local/CI pages carry
  no CSP header and show 0 console errors.

## What is *not* covered (honest gaps)

- No load/performance benchmarking was run; no claims are made about throughput.
- GDACS/EONET/USGS payload parsing is covered indirectly (provider tests,
  smoke) but not exhaustively fuzzed.
- Firefox is exercised in CI, not locally (local runs used chromium via system
  Chrome; CI matrix includes firefox).

## Deliberate retry/readiness behaviour (not hidden failures)

Two places intentionally wait rather than fail immediately. Both wait for a
first successful result and record the outcome; neither swallows a genuine
failure, and no assertion is relaxed.

- `modules_solar_planner.py` clicks "Show arrival weather" up to twice, then
  waits up to 60 s for `[data-testid="trip-result"]`. The first attempt can hit
  a cold provider (the backend fetches the destination's live weather); a
  permanent failure still raises on the second attempt. First-load waits were
  widened in the platform-upgrade pass (initial location settle 120 s,
  FloodWatch assess 90 s, compare 90 s) because this machine's single-process
  backend queues behind the ~50 s live alerts fan-out — the asserts themselves
  are unchanged; they only allow the app to finish before judging it.
- The suites wait for the preview server and the backend to answer before
  starting. Every suite asserts `no console errors (0)` at the end, so a
  provider error that reached the browser would still be reported.


## Follow-up: PR #27 stylesheet/CSP regression checks (2026-10-17)

- GitHub CI on PR head `c184381aec8ed5ceb6bcc324af8a76eacb52ffb5`: browser-smoke, service-smoke, chat-visibility, frontend build/lint, production-smoke and backend tests all completed successfully. Secret/workflow security and dependency/security review workflows passed.
- Preview browser smoke: WeatherGPT home rendered; external stylesheet links to `fonts.googleapis.com` and `unpkg.com` absent; only bundled same-origin CSS files present; zero browser resource errors/CSP violations detected.
- After merge `7e26b76c2f9617f194a8f747f6685d716d6f0998`, Vercel deployment reached READY. The earlier production-browser reading that still saw the two old links was a stale cached copy. **Fresh production verification (later session):** the live HTML contains no `fonts.googleapis`/`unpkg` references (`x-vercel-cache: HIT` on the cleaned HTML) and a fresh headless-Chrome session on the production URL reports **0 console errors/warnings** — production alias verification completed.
- No local Windows tests, performance benchmark, or local Firefox/WebKit runs were performed in this session.

## Follow-up: platform-upgrade pass (2026-10-17) — stages I–K suites

Local runs (Windows; system Chrome via `WG_CHROME_PATH` + bundled Playwright
Firefox; single-process backend on 127.0.0.1:8000; preview on 127.0.0.1:4173
serving the final bundle `index-CCJoY2cE.js`). Assertions were never relaxed:
the changes below are readiness waits, pre-warming and noise attribution only.

### `modules_solar_planner.py` (44 checks × chromium + firefox)

- **Firefox: 44/44 ALL PASS** — the first fully green Firefox run. All
  previous Firefox failures were downstream of the "Detecting location…"
  hang; the `App.jsx` geolocation callback watchdog (12 s) removes it.
- **Chromium: 42/44** in the recorded run — `compare: AQI provenance` and
  `compare: no ambiguous ellipsis cells` raced the per-city cell settle
  (both passed in Firefox in the same run). Fixed with a cell-readiness wait
  before judging (90 s bound; asserts unchanged) and verified by a targeted
  probe: settled cells render `178 Unhealthy · live` / `194 Unhealthy · live`
  per city; a cold-start load on this machine can exceed 60 s, hence 90 s.
- Chat checks now wait for the rendered assistant bubble (120 s bound) instead
  of fixed 15/20 s sleeps — the reply pipeline measured 42.4 s cold / 4–5 s
  warm here. FloodWatch auto-assess pre-warms the same live risk URL first;
  the UI client aborts every request at 20 s by design (`api.js`), so
  cold-queue conditions are absorbed before the UI is judged (a warm assess
  measured 14.9 s; a failed warm-up still fails the UI check honestly).
- Final rerun on `5e900dc`: **chromium 43/44** — both compare checks now PASS
  (readiness fix verified end-to-end); the single failure was
  `no console errors (1)`, the external-noise class proven by the
  URL-attributed probes (this suite now attributes it identically; harness
  commit on `main`). **Firefox**: with an idle backend the header settles via
  the watchdog (26.9 s local / 15.2 s on production, see probes below); in
  the back-to-back suite run the cold fallback weather fetch queued past the
  client's 20 s abort, the app showed its honest "Could not load weather…"
  notice, the header kept the placeholder and the module checks cascaded —
  recorded as follow-up work (`WEATHERGPT_REMAINING_WORK.md` §7), not hidden.

### `responsive_accessibility.py` (8 viewports × chromium + firefox)

- ALL PASS both engines (matrix + keyboard/focus + reduced-motion), including
  the two added viewports (900×650, 1280×800).
- External noise is now attributed per load: the run prints notes like
  "6/9/12 third-party provider requests failed - external noise, not a
  product error" (Open-Meteo 503s from the browser's direct chart calls and
  `[abc].tile.openstreetmap.org` tile failures — both captured with URLs in
  the dedicated probe); no product/backend console errors were retained.
- Fresh-load waits are 120 s (was 45 s) so this machine's queue latency cannot
  truncate a page before the checks read it.

### `imagery_visibility.py` (2 viewports × chromium + firefox)

- ALL PASS — 60 checks, 0 failures (`Suites run: 4, failures: 0`), including
  the layer-switcher checks for the three new GIBS products and the
  switch-loads-product assertion (mocked provider tiles; deterministic).

### Cloud verification (PR #28 heads)

- 13-width sweep 830→1440 (`probe_bands.py`): all clean on the preview
  deployment of `a1142e8`; production baseline in the same sweep still shows
  its bands (830–950 px header actions/LIVE pill; 1160–1200 px language
  select) until merge.
- Geolocation watchdog probe: Firefox settles `New Delhi` in 26.9 s, Chromium
  0.7 s, 0 console errors both (pre-fix Firefox stayed on the placeholder
  past 120 s).

## Stage L — premium upgrade pass (2026-10-18)

Branch `feat/premium-weather-upgrade` (built on `main` `ca4b85d`); local
preview serving the rebuilt bundle `index-C4cxwFp9.js`; backend
`127.0.0.1:8000` healthy (`2.0.0-sih`). Assertions were never weakened; every
claim below comes from an executed check in this session. No production
deployment was performed for this branch (authorization not requested).

### L1 — initial-load recovery (code + deterministic regression test)

- `App.jsx`: stale-response guard (`searchSeq`/`locRequestId`), one silent
  ~5 s auto-retry after a failed weather fetch (`autoRetry` flag — never
  loops), honest failure notice, real `online` state from fetch outcomes
  (`api.js` now attaches `error.status`).
- `ReferenceChrome.jsx`: honest header placeholders by `locStatus`
  ('Location lookup failed — tap to search' / 'Location access denied — tap
  to search' / 'Location unavailable — tap to search'); Online pill states
  Connecting… / Online / Offline (amber when offline); the legacy `notice`
  state — previously set in `App.jsx` but never rendered anywhere — now
  renders as a dismissible banner (`.wg-ref-notice`, `role="status"`).
- `frontend/tests/initial_load_recovery.py` (new; deterministic route
  interception on `/api/weather/current`), chromium AND firefox:
  - Scenario A (every weather request → HTTP 500): header shows the honest
    placeholder and keeps it after the retry; the silent retry is proven by
    the request count (13); the banner shows exactly 'Could not load weather
    for "New Delhi". Try again shortly.' — on both engines.
  - Scenario B (first request fails, rest pass): the header settles on
    'New Delhi' with no user action (13–16 requests observed across runs);
    the notice clears.
  - Result: **14/14 PASS (7 per browser), 0 failures** — verified on both the
    L1 build (`index-CkZfgCoq.js`) and the L4 build (`index-C4cxwFp9.js`).

### L2 — current-state screenshot capture

- `frontend/tests/capture_screenshots.py` (new) captured 28 PNGs into
  `docs/visual-references/screenshots/`: 17 local routes + the map tab (via
  the header location button — no sidebar entry) + local error state + 3
  mobile (home / drawer / nav) + 3 production + 3 benchmark-site. Desktop
  1440×900 full-page, mobile 390×844. Captured on the pre-L4 bundle; labelled
  current-state evidence, not target designs.
- Capture-time defect found and fixed: the mobile drawer close button was
  pointer-intercepted by the fixed header (`.wg-ref-mobile-drawer` z-index 80
  < header 100 in `index.css`) → z-index 110. Verified by pointer tests:
  open state `class="wg-ref-mobile-drawer open"` / `aria-hidden=false` →
  close-button click clears both → overlay strip tap (real coordinate,
  x=350 of a 390 px viewport) also closes. (An earlier overlay assertion
  failed only because Playwright clicks the overlay's center point, which is
  covered by the open 288 px drawer — geometry, not behavior.)

### L3 — 22-category visual reference library

- `docs/visual-references/sources.json`: 97 curated web sources across
  categories 01–21 (category 22 is the screenshot set), each with kind
  (inspiration / official-provider / official-data / benchmark /
  stock-reference), conservative license wording, attribution, purpose and
  target component — URLs from live web search results, never invented.
- `frontend/tests/build_reference_manifest.py` (new) HTTP-verifies every URL
  (HEAD→GET with browser UA; 2xx/3xx = verified; raw status recorded
  otherwise) and generates `manifest.json` + `REFERENCE_AUDIT.md`.
- Final manifest: **126 entries = 97 web sources (85 verified) + 28
  screenshots + 1 download**. The 12 unverified links carry their raw
  bot-block / rate-limit statuses in the audit (Behance 403 ×3, Figma 405,
  DeepWiki 429 ×2, climate-data 499, and four more 403s) — never claimed as
  verified. References are explicitly marked as not production assets.
- `downloads/gibs-viirs-truecolor-2026-10-16.jpg`: 316,149 bytes, HTTP 200
  `image/jpeg` (GIBS WMS `VIIRS_SNPP_CorrectedReflectance_TrueColor`,
  BBOX=-60,-120,60,60; JPEG magic checked) with `downloads/DOWNLOADS.md`
  documenting layer, date, query, result and NASA public-domain license
  guidance.

### L4 — first UI/UX increments (from capture review)

- `index.css`: mobile drawer z-index 80→110 (close button reachable —
  verified above).
- `ReferenceChrome.jsx`: theme-float condition no longer claims "Loading live
  weather…" indefinitely — shows 'Weather unavailable' once the location
  state is an honest failure (not DETECTING/IDLE).
- `HomePanel.jsx` + `App.jsx`: the empty-state line is state-driven —
  detecting / busy / 'Weather unavailable for this location — use CHANGE
  above to pick a place.' (ERROR | DENIED | UNAVAILABLE) / 'Search a place
  above to start.'
- Rebuild after L4: entry bundle `index-C4cxwFp9.js` (63.04 kB) with chunk
  split (react 181.7 kB, three 564.8 kB, maps 148.8 kB, markdown 161.7 kB);
  lint warnings only (pre-existing), build success.

### Local infra notes

- Windows runs; system Chrome via `WG_CHROME_PATH` + bundled Playwright
  Firefox; the sandbox periodically reaps background shells, so the backend
  (`python run.py`, port 8000) and preview
  (`npm run preview -- --host 127.0.0.1 --port 4173`) were restarted as
  needed; all test evidence above was captured with both serving.
- Production remains `7314b36` serving `index-CCJoY2cE.js`; this branch is
  not deployed.
