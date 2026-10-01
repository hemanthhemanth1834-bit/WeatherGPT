# FREE DATA PROVIDER MATRIX — WeatherGPT SIH 2026

"FREE" below means verified no-key access on 30 Sep–01 Oct 2026.
"SUBJECT TO TERMS" everywhere — see THIRD_PARTY_NOTICES.md. No free-forever claims.

| Provider | URL pattern | Key | Cost | License/terms | Rate behavior | Status |
|---|---|---|---|---|---|---|
| Open-Meteo Forecast | api.open-meteo.com/v1/forecast | none | FREE non-commercial | attribution required | fair use + 600s cache | LIVE |
| Open-Meteo Geocoding | geocoding-api.open-meteo.com | none | FREE non-commercial | attribution | fair use + 24h cache | LIVE |
| Open-Meteo Air Quality | air-quality-api.open-meteo.com | none | FREE non-commercial | attribution | fair use + 30min cache | LIVE |
| Open-Meteo Marine | marine-api.open-meteo.com | none | FREE non-commercial | attribution | fair use + 30min cache | LIVE |
| Open-Meteo Archive/ERA5 | archive-api.open-meteo.com | none | FREE non-commercial | attribution | heavy queries + 24h cache | LIVE |
| Open-Meteo Elevation | api.open-meteo.com/v1/elevation | none | FREE non-commercial | attribution | fair use + 24h cache | LIVE |
| NOAA ADDS | aviationweather.gov/api/data | none | PUBLIC DATA (US gov) | public domain-ish | fair use + 30min cache | LIVE |
| RainViewer | api.rainviewer.com | none | FREE tier | attribution required | aggressive client cache | LIVE |
| NASA GIBS | gibs.earthdata.nasa.gov/wmts | none | PUBLIC DATA | NASA open-data policy | link-out, no proxy | LIVE |
| NASA EONET | eonet.gsfc.nasa.gov/api | none | PUBLIC DATA | NASA open-data policy | 30min cache | LIVE |
| USGS FDSN | earthquake.usgs.gov/fdsnws | none | PUBLIC DATA (US gov) | USGS policy | 10min cache | LIVE |
| GDACS API | gdacs.org/gdacsapi | none | PUBLIC (UN JRC) | cite source | 30min cache | LIVE |
| OSM tiles | tile.openstreetmap.org | none | FREE (ODbL) | attribution + tile policy | browser cache | LIVE |
| Overpass | overpass-api.de/api/interpreter | none | FREE (fair use) | ODbL | on-demand + 24h cache | LIVE |
| BigDataCloud reverse | api.bigdatacloud.net | none | FREE client tier | fair use | GPS-only + 24h cache | LIVE |
| Natural Earth land | jsdelivr world-atlas | none | PUBLIC DOMAIN | — | browser cache | LIVE |
| IMD / MOSDAC / INCOIS / NDMA / Bhuvan | portals | auth-gated | N/A | — | — | NOT_CONFIGURED |
| OpenWeather / WeatherAPI tiers | — | key required | FREE TIER exists | — | — | NOT USED (OM suffices) |
| Nominatim | — | none | FREE (1 req/s policy) | strict usage policy | — | NOT USED (OM suffices) |
| FIRMS | firms.modaps API | MAP_KEY required | key-gated | — | — | NOT_CONFIGURED (EONET covers fires) |
| Copernicus Marine/Data Space | various | account required | account-gated | — | — | NOT_CONFIGURED |
| Any paid LLM | various | key required | PAID/optional | — | — | NOT USED (deterministic default) |
