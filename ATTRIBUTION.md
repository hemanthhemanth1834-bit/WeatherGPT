# ATTRIBUTION — WeatherGPT SIH 2026

## Project implementation

The application code in this repository (backend, frontend, configuration,
tests, and documentation) was independently implemented for Smart India
Hackathon 2026 by:

**Muchakarla Hemanth Kumar** — B.Tech CSE–AI/ML, SRK Institute of Technology
(SRKIT), 2024–2028.

No claim is made over third-party libraries, services, data, or map tiles;
those belong to their respective owners and are listed below and in
`THIRD_PARTY_NOTICES.md`.

## Relationship to the earlier downloaded archive

An earlier unknown-provenance archive was used only to understand the
problem space. Because its origin and license could not be verified, **none
of its project-specific source files ship in this repository** — every such
file was independently reimplemented (full lists in `docs/PROVENANCE.md`).
Accordingly there are no inherited copyright notices to preserve; if the
original source is ever identified, this file will be updated.

## Third-party components (summary)

- **Libraries**: React, React-DOM, Vite, Tailwind CSS, Leaflet,
  lucide-react, react-markdown, remark-gfm, FastAPI,
  uvicorn, pydantic, httpx, requests, python-dotenv, pytest.
  (Exact versions and licenses in `THIRD_PARTY_NOTICES.md`.)
- **Data/services**: Open-Meteo (forecast + geocoding), RainViewer
  (recent-past radar composites for personal/educational use with
  attribution; coverage varies and unavailable areas render the basemap —
  never labeled LIVE), NASA GIBS/Worldview (daily true-color satellite
  tiles, U.S. public domain, shown as DELAYED previous-day observations
  with acquisition dates; viewer links for exact timestamps),
  OpenStreetMap contributors and CARTO/Esri basemap providers
  (attribution retained in the map), Web Speech browser APIs.
- **Imagery honesty rules**: radar frames carry their observation
  timestamps; GIBS layers carry their product date; cached or historical
  imagery is never labeled LIVE; decorative SVG/CSS diagrams are never
  presented as observations.
- No affiliation with IMD, MoES, INCOIS, or ISRO is claimed; official
  sources are referenced as data authorities only.
