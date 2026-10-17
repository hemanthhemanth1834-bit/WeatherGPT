# WeatherGPT — Implementation Plan (stages A–H)

Plan and status for the WeatherGPT complete-platform-upgrade pass. Stages are
executed strictly in order; a stage may only carry **COMPLETED AND VERIFIED**
once its evidence exists in the repository docs or in a probe output captured
in the session log.

- Repository: `hemanthhemanth1834-bit/WeatherGPT`
- Branch: `feat/platform-upgrade` (base `f882c76` = post PR #26, post PR #27)
- Cross-references: `WEATHERGPT_COMPLETION_AUDIT.md` (findings),
  `WEATHERGPT_VISUAL_DESIGN_SYSTEM.md` (UI rules), `WEATHERGPT_TEST_REPORT.md`,
  `WEATHERGPT_LIVE_SITE_AUDIT.md`, `WEATHERGPT_RELEASE_REPORT.md`,
  `WEATHERGPT_REMAINING_WORK.md`.

## Guardrails (apply to every stage)

1. No fabricated data, alerts, provider status, imagery timestamps, or test
   results. Honest labels: `LIVE`, `DELAYED`, `RECENT HISTORY`, `ESTIMATED`,
   `COMPUTED`, `STATIC`, `DEMO`, `NOT CONFIGURED`, `UNAVAILABLE`.
2. CSP is never weakened: no new external stylesheets/fonts/CDNs; imagery and
   tiles stay allow-listed providers already documented in
   `WEATHERGPT_DATA_SOURCE_REGISTER.md`.
3. No paid APIs, no mandatory keys; licenses/terms checked and recorded before
   adding any resource.
4. Tests are never weakened or skipped; regression tests are added for each
   fix where an assertion is stable.
5. Existing working implementations (PRs #23–#27) are kept; changes are
   minimal and root-cause targeted.

## Stage map

| Stage | Scope | Status | Evidence |
|-------|-------|--------|----------|
| A | Recon: baseline audits, CI mapping, repo reconciliation | COMPLETED AND VERIFIED | `WEATHERGPT_BASELINE_AUDIT.md`; CI job map; merged PRs #23–#27 inspected |
| B | Critical correctness fixes (location resolution, chat grounding, AQI merge) | COMPLETED AND VERIFIED | PR #26 (`a7680cd`), merged; live-battery evidence in `WEATHERGPT_TEST_REPORT.md` |
| C | Security / CSP hardening (external stylesheet removal) | COMPLETED AND VERIFIED | PR #27 (`7e26b76`); production HTML clean + 0 console errors on the alias (fresh session) |
| D | Visual audit battery + polish fixes | COMPLETED AND VERIFIED | 2× full battery (19 desktop + 6 mobile, active-nav validated, 0 console errors in run 2); 8 fixes §D |
| E | Module completion (states, honesty labels, first-screen usefulness) | COMPLETED AND VERIFIED | `probe_fixes.py` + suite assertions (§E) |
| F | Verification battery (backend, frontend, suites, prod probes, imagery checks) | see completion report | `WEATHERGPT_COMPLETION_REPORT.md` §verification |
| G | Documentation package | IN PROGRESS → completion report closes it | this file + audit + design system + register + test/live-site docs updated |
| H | Release (PR, CI green, merge, production verification, release docs) | see completion report | PR link + production alias probe in `WEATHERGPT_COMPLETION_REPORT.md` |
| I | Live-imagery expansion (imagery pass; free/open sources) | see completion report | §I below; audit §6.2 |
| J | Second-round fixes (platform card states, pill regression) | see completion report | audit §6.1; probe 2 (`shots3/`) |
| K | Third round (geolocation watchdog, suite readiness/pre-warm, noise attribution) | see completion report | audit §6.1.5–6.1.6 + §6.3; watchdog probe; warm-latency measurements |

## Stage D — visual audit & polish

Battery: scripted navigation of all 19 desktop sections + mobile drawer/tabs,
geolocation granted, per-section console capture, active-nav verification after
every click, screenshot per view. Findings fixed:

1. Solar: literal `\n` text artifact removed (`ReferenceModulePanel.jsx`).
2. Solar: cloud badge now labeled "Cloud Cover" (was "Cloud Attenuation" showing
   the cloud-cover input); modeled `-loss%` remains on the Loss stat/hover.
3. Climate: rainfall axis floor clamped at 0 for non-negative series.
4. Compare: per-city AQI provenance (`· live` / `· est.`).
5. Compare: `loading…` / `unavailable` / numeric cells — no ambiguous "…",
   failed alerts feed no longer coerced to a fabricated "0".
6. Dashboard: AQI tile provenance-aware ("live" vs "estimated").
7. Header location pill: single line, ellipsis on the location name only.
8. (covered in Stage E) FloodWatch first-screen usefulness.

## Stage E — module completion

- `RiskPanel` (FloodWatch) auto-assesses on mount and re-assesses when the
  active location changes; explicit `role="status"` "Assessing …" state;
  manual "Assess risk" button retained.
- AQI provenance rule unified across dashboard tile, compare rows, and chat
  (`aqi_source` contains "open-meteo air quality" ⇒ live).
- Regression coverage added to `frontend/tests/modules_solar_planner.py`:
  solar artifact + badge text, FloodWatch auto-assess, compare provenance and
  placeholder cells.

## Stage F — verification battery

Planned checks (results recorded in the completion report):

1. `pytest -q` (backend, full) — no test changes to backend in this pass.
2. `oxlint` + `vite build` — 0 lint errors, build success.
3. Browser suites on **chromium + firefox**:
   `modules_solar_planner.py`, `responsive_accessibility.py`,
   `chat_visibility.py`, `imagery_visibility.py` (with `WG_BROWSERS`,
   `WG_CHROME_PATH`, `WG_UI_URL`).
4. `probe_fixes.py` focused re-verification (§audit).
5. API smoke: weather/current (live AQI source), compare (per-city source),
   risk/assess, alerts/active.
6. Production: served HTML + console probe post-deploy.

## Stage H — release

1. Commit the pass on `feat/platform-upgrade` (docs + fixes + tests).
2. Push, open PR; wait for the full WeatherGPT CI job set (backend,
   frontend, browser-smoke, chat-visibility, service-smoke, production-smoke,
   security, dependency review).
3. Merge with a regular merge commit (project convention), no force-push.
4. Verify the production alias serves the merged build (HTML + console probe).
5. Update `WEATHERGPT_RELEASE_REPORT.md`,
   `WEATHERGPT_REMAINING_WORK.md`, `WEATHERGPT_LIVE_SITE_AUDIT.md` and the
   completion report with the final hashes/statuses.

## Stage I — live-imagery expansion (imagery pass)

Requested: topic-relevant live imagery across the app from free/open sources.
Audit conclusion: extend the existing `LiveImagery` + GIBS/RainViewer
architecture (already honest, already reused) rather than introduce keyed
stock-photo APIs; see `WEATHERGPT_DATA_SOURCE_REGISTER.md` for the source
evaluation.

Shipped:

1. `services/gibs.js`: MODIS flood-water 2-day composite, GPM IMERG rain rate,
   MODIS aerosol optical depth — each with label, resolution, cadence and an
   honesty note.
2. Live Weather + NWP satellite figures: new layers in the existing switcher;
   per-layer description and observed-at line ("not a rain gauge", "not a
   ground AQI measurement").
3. FloodWatch: "Satellite flood-water context · India" figure — real MODIS
   2-day composite, `DELAYED`, source attribution, "not an official flood
   warning" note.
4. Tests: `imagery_visibility.py` asserts the switcher offers all three new
   layers and that switching loads the selected product image;
   `modules_solar_planner.py` asserts the FloodWatch figure renders.
5. Docs: data-source register (products, licensing, stock-API decision),
   visual design system (imagery architecture), audit §6.2.

Evidence: live WMS probes (flood 141 KB / IMERG 76 KB / AOD 36 KB real JPEGs);
probe 2 on the real build — flood-layer switch loads the real product,
FloodWatch figure loads, 0 console errors.

## Stage J — second-round fixes

1. CapabilitiesHub: "Weather Providers" card honest states
   (`N LIVE` / `UNAVAILABLE` + retry hint; CHECKING only while in flight) and
   request timeouts (75 s providers, 20 s engine/matrix).
2. Header pill regression from the first CSS attempt fixed with a dedicated
   `.wg-ref-location-text` class (selector collision with `Live3DIcon`).
3. Header width bands fixed (pre-existing in production): progressive
   disclosure tiers — full ≥1281 px; install/language/user-name hidden
   ≤1280 px; online/LIVE/compare/font/alerts hidden ≤1010 px; pill shrinkable
   (`min-width:0`, name ellipsizes). Width sweep 830→1440 all clean.
4. Test-harness hardening: `WG_CHROME_PATH` applied to chromium only in
   `modules_solar_planner.py` + `responsive_accessibility.py` (Firefox now
   runs locally); imagery-suite console-noise correlation by provider
   response status; responsive matrix extended with 900×650 + 1280×800.

Evidence: probe 2 — grid shows `Weather Providers UNAVAILABLE`, zero CHECKING
left; pill single-line with visible name (`w=159 px`, `h=20 px`); band sweep
clean on the new build; suites re-run on chromium + firefox.

## Stage K — third round (cross-browser robustness + suite readiness)

1. **Geolocation callback watchdog** (`App.jsx`): 12 s timer mirroring the
   TIMEOUT error branch — fixes Firefox (and real users) being stranded on
   "Detecting location…" when the browser never invokes either
   `getCurrentPosition` callback (pending permission prompt). A late callback
   still wins. Verified: Firefox settles `New Delhi` in 26.9 s; Chromium
   unchanged (0.7 s); 0 console errors.
2. **Suite readiness instead of fixed sleeps** (`modules_solar_planner.py`):
   `warm_chat()` + `wait_for_reply()` (waits for the rendered assistant
   bubble, 120 s bound) replace fixed 15/20 s sleeps whose targets take 42 s
   cold / 4–5 s warm; `warm_backend()` pre-warms the risk URL because the UI
   client's intended 20 s abort makes the cold-queue case unpassable by
   waiting. Asserts unchanged; failures still fail honestly.
3. **Console-noise attribution** (`responsive_accessibility.py`): records
   failed third-party requests (open-meteo, OSM tiles, GIBS, RainViewer) and
   excuses only generic resource-load errors when such a failure occurred in
   the same load; retained product errors are printed. Fresh-load waits
   ≥120 s everywhere; settle default 90 s (covers the watchdog floor).
4. **Cloud verification**: PR-head preview re-swept (13 widths clean; prod
   still banded until merge).

## Definition of Done checklist

- [ ] All Stage D/E fixes verified by probe or suite assertion.
- [ ] Backend tests, lint, build green; browser suites green on
      chromium+firefox.
- [ ] Required docs present: completion audit, implementation plan, visual
      design system, completion report; register + release/test/live-site docs
      updated.
- [ ] Intended commit merged to `main` and deployed to the production alias.
- [ ] Production smoke evidence captured (HTML + console).
- [ ] Remaining blockers (if any) listed with honest status.
