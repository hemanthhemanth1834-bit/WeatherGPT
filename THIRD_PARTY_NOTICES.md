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
| three | 0.x (npm) | MIT | Lazy 3D globe (Earth tab only) |
| topojson-client | 3.x (npm) | BSD-3-Clause | Decode Natural Earth TopoJSON at runtime |
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

- **Open-Meteo** (forecast + geocoding + air quality + marine + archive/ERA5):
  free for non-commercial use with attribution — attributed in UI source
  badges and docs. All five endpoints probed LIVE on 30 Sep 2026
  (see `/api/providers/health`).
- **RainViewer**: radar tiles under provider terms — attributed in the map.
- **OpenStreetMap contributors**: ODbL tile terms — attribution retained in
  the map control. (CARTO basemaps were removed after they began requiring
  an API key.)
- **NASA GIBS / Worldview**: satellite viewer links + one verified WMTS tile
  pattern (tile fetch probed HTTP 200 on 30 Sep 2026); no imagery
  redistributed; NASA open-data policies apply at the provider.
- **USGS Earthquake Hazards Program**: FDSN event feed (GeoJSON), official US
  public data, no key. Displayed as geological events, never as Indian alerts.
- **NASA EONET**: open natural-event feed (wildfires etc.), no key.
  Displayed with source links; verify locally.
- **Natural Earth coastlines** (via world-atlas TopoJSON, public domain),
  fetched at runtime for the 3D globe; wireframe fallback when offline.
- **Web Speech API**: browser-native; no key, no redistribution.
- Fonts via Google Fonts (Inter, JetBrains Mono) under their own licenses.
- Evaluated but not used: OpenWeather/WeatherAPI key tiers (unneeded —
  Open-Meteo covers requirements), Nominatim (1 req/s policy; Open-Meteo
  geocoding plus a 24 h cache suffice).
