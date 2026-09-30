# PROVENANCE — WeatherGPT SIH 2026

## 1. Original downloaded archive

Work began from `WeatherGPT-main.zip`: a React + Vite + Tailwind + Leaflet
frontend and a FastAPI backend (conversational weather app for SIH problem
statement 26068, MoES/IMD). The archive contained:

- **No LICENSE, NOTICE, copyright, author, or repository-URL metadata.**
- No `.git` history and no `author`/`repository` fields in any manifest.
- Identical timestamps on all files (GitHub-ZIP export style, 02-09-2026).

## 2. What could / could not be verified

| Question | Result |
|---|---|
| Upstream repository URL | **Could not be verified.** No URL exists anywhere in the archive. |
| `Kavin1467/WeatherGPT` (same SIH statement, found by web search) | **Rejected as upstream.** Vanilla-JS frontend, `Prototype/` layout, Windows `.exe`, flat `backend/main.py` — structurally different from the archive (React + Vite, modular `backend/app/...`, `api/index.py`, `vercel.json`). Name similarity alone is not evidence. |
| Other same-theme SIH repos (`NullErrOR-404/WeatherGPT-068`, `MartsTech/WeatherGPT`, …) | **Rejected.** Different stacks (Angular/Django, PWA/vanilla, single-HTML). |
| Copyright headers in the archive | None found (searched `Copyright`, `©`, `Author:`, `MIT License`, …). |
| License of the archive | **Unknown.** Nothing grants redistribution. |

## 3. Resolution: independent reimplementation

Because no upstream could be verified, **every project-specific file of
unknown provenance was independently reimplemented** from the SIH problem
statement and the public API contracts — not paraphrased or renamed:

Backend (`backend/app/`): `models.py`, `main.py`, services `geo.py`,
`weather.py`, `chat.py`, `alerts.py`, `advisories.py` (crops, aviation,
marine, climate), plus `run.py` and `api/index.py`.
Kept as original transformation work: `config.py`, `services/cache.py`,
`risk_engine.py`, `nwp_service.py`, `satellite_service.py`,
`indian_sources_service.py`, `agent_tools.py`, `tests/`.

Frontend (`frontend/src/`): `App.jsx`, `main.jsx`, `index.css`,
`index.html`, services `api.js`/`voice.js`, components `Navbar`,
`WeatherChat`, `WeatherDashboard`, `GISMap`, `AlertCenter`,
`ClimateAnalytics`, `CityComparison`, `AgriAdvisor`, `AviationMarine`,
`ModernWeatherCard`. Kept: `SourceBadge`, `RiskPanel`, `AboutDeveloper`,
`NwpSatellitePanel`. Removed dead/unused: `App.css`, template art
(`hero.png`, `react.svg`, `vite.svg`), third-party logo `favicon.svg`
(replaced with an original mark), unused sprite `icons.svg`, unused
dependencies (`chart.js`, `react-chartjs-2`, `canvas-confetti`).

## 4. What was NOT copied

City coordinates are geographic facts. WMO weather codes are an
international standard. General agronomic practices, METAR/TAF field
formats, and Leaflet/Open-Meteo/RainViewer API shapes are public
knowledge and interface facts — all prose, templates, advice text,
sample reports, and code expressing them were written fresh for
this project.

## 5. Third-party dependencies and data

See `THIRD_PARTY_NOTICES.md` (licenses verified against installed
package metadata) and `ATTRIBUTION.md`. No third-party source files
are vendored into this repository; dependencies resolve via npm/pip
and are excluded from version control.

## 6. Remaining uncertainties

- The original archive's author and license remain unknown; that code
  no longer ships in this repository (see file lists above), so it
  cannot encumber redistribution of this tree.
- `react-leaflet@5` declares a Hippocratic-2.1 license (ethical-source
  terms) — teams with strict license policies should review it; a
  swap to plain Leaflet bindings is straightforward since map usage
  is isolated in `GISMap.jsx`.
- Project license for the original code in this tree: **not yet
  selected** (see README → License). Until one is chosen, all rights
  are reserved by default.
