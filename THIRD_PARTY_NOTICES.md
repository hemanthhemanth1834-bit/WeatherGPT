# THIRD-PARTY NOTICES — WeatherGPT SIH 2026

Licenses below were read from the installed packages' own metadata
(`pip show`, `package-lock.json`) on 30 Sep 2026. License texts live
with each package (npm `node_modules/<pkg>/LICENSE`, PyPI project
pages) — this file records, not reproduces, them. Nothing below is
vendored into this repository.

## Frontend (`frontend/package.json`)

| Package | Version | License | Purpose |
|---|---|---|---|
| react, react-dom | 19.2.8 | MIT | UI runtime |
| vite, @vitejs/plugin-react | 8.2.2 / 6.1.1 | MIT | Build tooling |
| tailwindcss, @tailwindcss/vite | 4.3.3 | MIT | Styling |
| leaflet | 1.9.4 | BSD-2-Clause | Interactive maps |
| react-leaflet | 5.0.0 | Hippocratic-2.1 | React bindings for Leaflet — ethical-source terms; review if your policy requires pure OSI licensing (map use is isolated in `GISMap.jsx`) |
| lucide-react | 1.38.0 | ISC | Icons (About/Risk/NWP panels) |
| react-markdown, remark-gfm | 10.1.0 / 4.0.1 | MIT | Chat markdown rendering |
| oxlint (dev) | 1.80.0 | MIT | Linting |

## Backend (`backend/requirements.txt`)

| Package | License (per PyPI metadata) | Purpose |
|---|---|---|
| fastapi | MIT (upstream) | API framework |
| uvicorn | BSD-3-Clause (upstream) | ASGI server |
| pydantic | MIT (upstream) | Data validation |
| httpx | BSD-3-Clause | HTTP client |
| requests | Apache-2.0 | HTTP client |
| python-multipart | Apache-2.0 (upstream) | Form parsing |
| python-dotenv | BSD-3-Clause | Env loading |
| pytest | MIT (upstream) | Testing |

(“upstream” = the license historically published by that project; confirm
against the version you install if your compliance process requires it.)

## Data, tiles, and browser APIs (terms apply at the provider)

- **Open-Meteo** (forecast + geocoding): free for non-commercial use with
  attribution — attributed in UI source badges and docs.
- **RainViewer**: radar tiles under provider terms — attributed in the map.
- **OpenStreetMap contributors / CARTO**: ODbL basemap terms — attribution
  retained in the map control.
- **NASA GIBS / Worldview**: satellite viewer links only; no imagery
  redistributed; NASA open-data policies apply at the provider.
- **Web Speech API**: browser-native; no key, no redistribution.
- Fonts via Google Fonts (Inter, JetBrains Mono) under their own licenses.
