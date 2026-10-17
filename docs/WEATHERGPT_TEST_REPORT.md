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
  waits up to 30 s for `[data-testid="trip-result"]`. The first attempt can hit
  a cold provider (the backend fetches the destination's live weather); a
  permanent failure still raises on the second attempt.
- The suites wait for the preview server and the backend to answer before
  starting. Every suite asserts `no console errors (0)` at the end, so a
  provider error that reached the browser would still be reported.


## Follow-up: PR #27 stylesheet/CSP regression checks (2026-10-17)

- GitHub CI on PR head `c184381aec8ed5ceb6bcc324af8a76eacb52ffb5`: browser-smoke, service-smoke, chat-visibility, frontend build/lint, production-smoke and backend tests all completed successfully. Secret/workflow security and dependency/security review workflows passed.
- Preview browser smoke: WeatherGPT home rendered; external stylesheet links to `fonts.googleapis.com` and `unpkg.com` absent; only bundled same-origin CSS files present; zero browser resource errors/CSP violations detected.
- After merge `7e26b76c2f9617f194a8f747f6685d716d6f0998`, Vercel deployment reached READY. A later production browser inspection still saw the two old external stylesheet links, so production alias verification is pending. Do not interpret preview success or deployment READY as proof that the public alias is serving the new HTML.
- No local Windows tests, performance benchmark, or local Firefox/WebKit runs were performed in this session.
