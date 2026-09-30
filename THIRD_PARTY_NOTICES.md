# THIRD-PARTY NOTICES — WeatherGPT (SIH 2026)

This file lists third-party software, data, and services used by the project.
It does not reproduce license texts — consult each package's own license file
(`node_modules/<pkg>/LICENSE`, PyPI project pages, or provider terms).

## Data & services (no code redistribution; subject to provider terms)

| Provider | Use | Terms / attribution |
|---|---|---|
| Open-Meteo (https://open-meteo.com/) | LIVE forecast + geocoding | Free for non-commercial use, requires attribution |
| RainViewer (https://www.rainviewer.com/) | LIVE radar tiles on GIS map | Provider API terms; in-map attribution retained |
| NASA GIBS / Worldview (https://worldview.earthdata.nasa.gov/) | Satellite viewer links only (no imagery redistributed) | NASA open-data policies apply at the provider |
| OpenStreetMap contributors | Basemap tiles + attribution | ODbL; attribution retained in map control |
| Esri / Maxar / Earthstar Geographics | Alternate basemap tiles | Esri terms; attribution retained in map control |
| IMD / MOSDAC-ISRO / INCOIS | Referenced as authoritative sources only; no affiliation claimed; no scraped content | Respective government data policies |

## Frontend libraries (`frontend/package.json`)

- react, react-dom — Meta (upstream license, see package)
- vite, @vitejs/plugin-react — Evan You / Vite team (upstream license, see package)
- tailwindcss, @tailwindcss/vite — Tailwind Labs (upstream license, see package)
- leaflet, react-leaflet — Leaflet contributors (BSD-2-Clause as published upstream)
- lucide-react — Lucide contributors (ISC as published upstream)
- react-markdown, remark-gfm — respective authors (MIT as published upstream)

Removed as unused in finalization: `chart.js`, `react-chartjs-2`, `canvas-confetti`
(not imported anywhere under `frontend/src/`).

## Backend libraries (`backend/requirements.txt`)

- fastapi, uvicorn, pydantic, httpx, requests, python-multipart, python-dotenv, pytest —
  each under its own upstream license (see PyPI project pages).

## Note on the inherited base

The downloaded archive carried no license file, so the license of the inherited
application code itself is unknown — see `ATTRIBUTION.md` and `README.md → License`.
The entries above cover independently published third-party packages/services only.
