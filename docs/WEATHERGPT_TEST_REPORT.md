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
| API smoke battery (17 endpoints, port 8000) | **17/17 HTTP 200** | `/robots.txt` + `/sitemap.xml` are frontend assets → verified 200 on the preview server (`/manifest.json` too) |

> Operational note for future runs: `vite preview` caches `index.html` at
> startup. After `npm run build` you must restart the preview server, or the
> browser suites will exercise the previous bundle (this produced one
> misleading FAIL that was traced to the stale HTML, not to the app).

## Backend (pytest)

Command: `python -m pytest tests/ -q` (from `backend/`, `PYTHONUTF8=1`)

- **121 passed**, 0 failed, 1 third-party deprecation warning
  (`starlette.testclient` / `httpx` notice — pre-existing, not ours).
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
| `test_chat_grounding.py::test_unknown_place_is_reported_unresolved` | the honesty note fires |
| `modules_solar_planner.py` `[chat unknown-place honesty]` (2 assertions) | note visible in the UI; no "Patna" leak |

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

## What is *not* covered (honest gaps)

- No load/performance benchmarking was run; no claims are made about throughput.
- GDACS/EONET/USGS payload parsing is covered indirectly (provider tests,
  smoke) but not exhaustively fuzzed.
- Firefox is exercised in CI, not locally (local runs used chromium via system
  Chrome; CI matrix includes firefox).
