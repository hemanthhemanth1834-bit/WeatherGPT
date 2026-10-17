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
| WeatherGPT CI | `main@a7680cd` (merge of #26) | success — run `39017152156`, all jobs green (4m41s) |
| Secret and Workflow Security | `main@a7680cd` | success — run `39017152165` |
| Dependency and Security Review (npm/pip audit) | `main@a7680cd` | success — run `39017152188` |
| Vercel production deployment | `main@a7680cd` | completed — production serves the merged bundle (see §4) |

## 4. Production status

**Deployed and verified.** PR #26 was merged to `main` as `a7680cd`
(2026-10-17T08:23Z, authorised by the project owner) and the Vercel production
deployment completed. Everything below was run directly against
`https://weathergpt-kappa-pink.vercel.app` (read-only probes).

Deploy identity:

- Production HTML references `assets/index-BuSzGuDf.css` — the exact content
  hash of the local build of the merged commit.
- All GitHub Actions workflows on `main@a7680cd` are green (§3).

API verification:

| Probe | Result |
|-------|--------|
| `GET /api/weather/current?location=Pune` | `aqi` **134**, `aqi_source` `Open-Meteo Air Quality (US EPA) · observed 2026-10-17T13:30` |
| `GET /api/air-quality?location=Pune` | `us_aqi` **134**, `observed_at 2026-10-17T13:30` — **consistent** with the weather path (baseline: 133 vs 78) |
| 17-endpoint smoke + `POST /api/language/analyze` | 18/18 HTTP 200 |
| `/robots.txt`, `/sitemap.xml`, `/manifest.json` | 200 |

Chat verification (payload exactly as the frontend sends it —
`{query, persona, language, location_name}`):

| Question (`location_name=Pune`) | Result |
|---------------------------------|--------|
| "Tell me about the weather in Krishnapatnam" | `location_resolved=false`; note *"I could not resolve “Krishnapatnam” to a location, so the figures above are for Pune, not the place you named."*; no word-boundary `Patna` anywhere |
| "What about my selected location?" | answered for Pune, `explicit_location=false` |
| "What is the AQI in Pune?" | *"Air quality (LIVE, US AQI (EPA)): US AQI 134 …, PM2.5 30.3, PM10 38.9"* |
| "…15 November 2026…" | explicit horizon note (*"my live forecast horizon is about 7 days…"*) |

Browser suites re-run against production (chromium, read-only):

| Suite | Result on production |
|-------|----------------------|
| `modules_solar_planner.py` | all functional checks PASS (solar 212° / compass "SW" consistent + estimate label; all five sector modules ≥4 computed values, no placeholder copy; trip planner; deep-cast honest; severe slots resolved; chat guard + unknown-place honesty, app location unchanged) |
| `chat_visibility.py` | 2 suites, 0 failures |
| `imagery_visibility.py` | all functional checks PASS at 1440px and 390px (DELAYED labels, retry, mocked tiles) |
| `responsive_accessibility.py` | all checks PASS at 320→1440 (overflow, accessible names, headings, keyboard, reduced-motion) — only the console-error check fails, on the pre-existing CSP entries below |

Pre-existing production console conditions (present in the baseline
`d7810ba` configuration — not introduced by this release):

1. The `vercel.json` CSP (`style-src 'self' 'unsafe-inline'`) blocks the two
   external stylesheet links still present in `frontend/index.html`
   (Google Fonts; `unpkg.com` Leaflet 1.9.4) → 2 resource-load console errors
   per page. Impact is cosmetic: `--wg-font` falls back to the system stack,
   and Leaflet's CSS is bundled into the app CSS (`.leaflet-container` present
   in the built stylesheet), so the map is unaffected.
2. Transient upstream provider failures can appear as resource errors in the
   console of one run (a 503 was observed once in `imagery_visibility` at
   390px); the UI degrades exactly as designed and no functional check failed.

Both are recorded in `WEATHERGPT_REMAINING_WORK.md` §4. No production change
was made for them in this release.

## 5. Rollback position

The release is a self-contained change set with no schema, dependency or
infrastructure changes. Reverting merge commit `a7680cd` restores the previous
production behaviour completely; no data migration is involved.

## 6. Decisions taken

- Merge to `main` and production verification were authorised by the project
  owner on 2026-10-17 and performed in this run (merge `a7680cd`; results in
  §4).
- The pre-existing CSP/console conditions in §4 were **not** modified; they
  await a separate decision (options recorded in `WEATHERGPT_REMAINING_WORK.md`
  §4).


## 7. Follow-up release: CSP stylesheet cleanup (PR #27, 2026-10-17)

PR [#27](https://github.com/hemanthhemanth1834-bit/WeatherGPT/pull/27) was merged to `main` as `7e26b76c2f9617f194a8f747f6685d716d6f0998` after all CI jobs passed, including backend, frontend, browser-smoke, chat-visibility, service-smoke and production-smoke. Secret/workflow security and dependency/security review checks also passed. Vercel deployment `dpl_AgBoLwGVkMEPvNQo4pW91gKArq4W` reached READY and lists the production alias.

The change removes the Google Fonts and redundant unpkg Leaflet stylesheet tags from `frontend/index.html`; it does not loosen the Content Security Policy and adds no dependencies. The PR preview rendered successfully and reported no external stylesheet links or browser resource/CSP errors.

**Production verification completed (same day, later session).** A fresh probe
of `https://weathergpt-kappa-pink.vercel.app/` serves HTML with no external
stylesheet links (`x-vercel-cache: HIT`), and a fresh headless-Chrome session
reports **0 console errors/warnings** (previously 2 CSP errors per load). The
earlier "old links still observed" reading was a stale cached copy. The CSP
console issue is fixed and verified in production.
