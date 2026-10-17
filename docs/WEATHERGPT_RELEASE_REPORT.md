# WeatherGPT Release Report — audit/verified-release

Status is stated as of this run. Nothing below claims a merge, deploy or
production change that was not actually observed.

- Repository: `hemanthhemanth1834-bit/WeatherGPT`
- Branch under audit: `audit/verified-release`
- Baseline commit (`main`): `d7810ba30c8e657123bc68ca5e61aaff69b34db0`
  (merge of PR #25, site-wide imagery)
- Production site: `https://weathergpt-kappa-pink.vercel.app/`
- Production deployment serving the baseline: verified live during this run

## 1. What is in the release candidate

PR [#26](https://github.com/hemanthhemanth1834-bit/WeatherGPT/pull/26)
("fix: chat grounding + live AQI + functional sector modules"), open and
**mergeable / clean**, plus this session's location-resolution fixes.

| Change set | Files | Purpose |
|------------|-------|---------|
| Chat grounding + live AQI + module indicators (first session) | `backend/app/services/chat.py`, `backend/app/services/weather.py`, `backend/app/models.py`, `frontend/src/App.jsx`, `frontend/src/components/ReferenceModulePanel.jsx`, `frontend/src/components/SevereWeatherPanel.jsx`, `frontend/src/index.css`, + docs/tests | Six audited defects from `WEATHERGPT_BASELINE_AUDIT.md` |
| Location resolution correctness + honesty (this session) | `backend/app/services/geo.py`, `backend/app/services/chat.py`, `backend/app/models.py`, `frontend/src/App.jsx`, + tests/docs | Unknown place must never be answered as a different real city; the fallback must be named |
| Accessibility labels + 320px header fix + responsive/a11y suite (this session) | `frontend/src/components/ReferenceChrome.jsx`, `frontend/src/components/ReferenceChrome.css`, `frontend/tests/responsive_accessibility.py` | Icon-only header controls labelled; header fits at 320px; the responsive/accessibility matrix is now an automated suite |

No dependency changes. No new services. No new credentials. No paid APIs.

## 2. Verification performed (this session, on this machine)

| Check | Command | Result |
|-------|---------|--------|
| Backend suite (branch baseline, before this session's fix) | `python -m pytest tests/ -q` | 121 passed, exit 0 |
| Backend suite (final, after fix) | `python -m pytest tests/ -q` | **130 passed**, exit 0 |
| Frontend lint | `npm run lint` | 28 warnings / 0 errors, exit 0 |
| Frontend production build | `npm run build` | exit 0 |
| Chat visibility regression | `python tests/chat_visibility.py` | 2 suites, 0 failures |
| Imagery honesty regression | `python tests/imagery_visibility.py` | 2 suites, 0 failures |
| Modules / solar / planner / chat guard | `python tests/modules_solar_planner.py` | 30 checks, 0 failures |
| Responsive / accessibility matrix | `python tests/responsive_accessibility.py` | 39 checks, 0 failures (after fixing the 320px defect it caught) |
| Live chat grounding battery | 9 questions against the local API | all grounded; one defect found and fixed (see below) |
| API smoke battery (17 endpoints) | local port 8000 | 17/17 HTTP 200 |
| Static assets | preview port 4173 | `/robots.txt`, `/sitemap.xml`, `/manifest.json` 200 |

Defect found and fixed during this session's verification (details in
`WEATHERGPT_REMAINING_WORK.md` §3.1–§3.5): an unknown place name was silently
answered as an unrelated real city, and the resulting fallback could move the
app's active location. Both are fixed with regression coverage.

## 3. CI status

| Workflow | Ref | Status |
|----------|-----|--------|
| WeatherGPT CI | `main@d7810ba` | success (run `38766374244`) |
| Secret and Workflow Security | `main@d7810ba` | success |
| Dependency and Security Review | `main@d7810ba` | success |
| WeatherGPT CI | PR #26 head `518934e` | success — all jobs green (backend 4m37s, browser-smoke 1m48s, chat-visibility 2m42s, frontend, production-smoke, service-smoke) |
| Secret and Workflow Security | PR #26 head `518934e` | success |
| Dependency and Security Review | PR #26 head `518934e` | success |
| Vercel (commit status) | PR #26 head `518934e` | success — preview deployment completed |

## 4. Production status

**Not yet deployed by this run.** Production still serves the baseline commit.
Confirmed directly during this run:

- `GET /api/health` → 200 `{"status":"healthy","service":"WeatherGPT Engine"}`
- `GET /api/air-quality?location=Pune` → `us_aqi 133`, fresh `observed_at`
- `GET /api/weather/current?location=Pune` → `aqi 78` (heuristic, no
  provenance field) — the defect the release candidate removes

Consequently the following remain live in production until the branch is
merged and deployed, and are **not** claimed as fixed there:

1. Chat answers for an unknown place can be presented as an unrelated real
   city (e.g. Krishnapatnam → Patna).
2. The main weather path still reports the state-level heuristic AQI instead
   of the available live feed.
3. Life Cast / RoadWatch / TreeGuard / UtilityWatch / Deep-Cast still render
   placeholder copy rather than computed indicators.
4. The solar panel can show an impossible azimuth from a hardcoded direction.

Post-deploy verification plan (to run only after a verified merge):
`/api/health`, `/api/weather/current?location=Pune` (expect live AQI and
`aqi_source`), `POST /api/chat/query` with the Krishnapatnam question (expect
the resolution note and no Patna), plus the 20-section UI walk at 390 px and
1440 px.

## 5. Rollback position

The release candidate is a single, self-contained change set with no schema,
dependency or infrastructure changes. Reverting the merge commit restores the
previous behaviour completely; no data migration is involved.

## 6. Decision required

Merging to `main` publishes to the public production site. That step was
**not** taken in this run; the branch is pushed and the PR is updated with the
findings above so the merge can be performed deliberately.
