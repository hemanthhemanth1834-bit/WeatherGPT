# WeatherGPT Test Report — audit/verified-release

All results below were produced by running the commands on this machine against
the audit branch. No result is projected or assumed.

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
  0 console errors.

## Live chat grounding spot-checks (local API, same code as deploy)

| Question | Expected | Observed |
|----------|----------|----------|
| "What is the source and update time of this answer?" | Answers for active location, no geocode of "this" | Pune, `explicit_location=false`, no Grand Est anywhere |
| "What about my selected location?" | Active location, not a world city | Pune, `explicit_location=false` |
| "What is the AQI in Pune?" | Live US-EPA AQI, not heuristic | **133 (Unhealthy for Sensitive Groups)**, live source string |
| "What will the weather be like on 15 November 2026 in Pune?" | Explicit horizon note (>7 days) | Horizon note present |
| "weather in Rajahmundry tomorrow?" | Explicit city | `Rajahmundry`, `explicit_location=true` |

## What is *not* covered (honest gaps)

- No load/performance benchmarking was run; no claims are made about throughput.
- GDACS/EONET/USGS payload parsing is covered indirectly (provider tests,
  smoke) but not exhaustively fuzzed.
- Firefox is exercised in CI, not locally (local runs used chromium via system
  Chrome; CI matrix includes firefox).
