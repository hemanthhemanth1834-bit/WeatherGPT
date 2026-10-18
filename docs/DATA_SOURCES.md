# DATA SOURCES — WeatherGPT SIH 2026

Provider statuses are runtime-dependent; use `/api/providers/health?live=true` for a current probe. The table below documents configured sources, not guaranteed availability. A request succeeding now does not guarantee the next request will succeed.

| Provider | Purpose | Status | Free / Key | Limitations |
|---|---|---|---|---|
| Open-Meteo Forecast | current/hourly/daily, cloud, UV, sun | Runtime-dependent | Free, no key | Model blend, not station obs |
| Open-Meteo Geocoding | place search + GPS fallback | Runtime-dependent | Free, no key | Village coverage varies |
| Open-Meteo Air Quality | US AQI + 6 pollutants | Runtime-dependent | Free, no key | Modelled, not CPCB station |
| Open-Meteo Marine | waves/dir/period/SST | Runtime-dependent | Free, no key | Wave model, not buoys |
| Open-Meteo Archive (ERA5) | yearly/monthly history | Runtime-dependent | Free, no key | Reanalysis, 2–5 day lag |
| GFS via Open-Meteo | `models=gfs_seamless` selector | Runtime-dependent | Free, no key | Single-model run, no cycle meta |
| RainViewer | radar tiles + timeline | Runtime-dependent | Free, no key | Composite, ~10 min delay |
| NASA GIBS | satellite imagery via WMS (true-color, flood water, rain rate, aerosol) + viewer links | Runtime-dependent (daily product) | Free, no key | Loaded directly in-browser, not proxied; previous-day products labelled DELAYED |
| NOAA ADDS | METAR/TAF 6 Indian airports | Runtime-dependent | Free, no key | US source; outages fall back STATIC |
| BigDataCloud | GPS reverse-geocode | Runtime-dependent | Free, no key | Low-volume fair use |
| GDACS (UN JRC) | global disaster events | OFFICIAL third-party | Free, no key | Global context, not Indian warnings |
| USGS | earthquakes M4.5+, 7-day | OFFICIAL third-party | Free, no key | Geological, worldwide |
| NASA EONET | open wildfires | OFFICIAL third-party | Free, no key | Satellite detections, verify locally |
| OpenStreetMap | basemap tiles | Runtime-dependent | Free (ODbL) | Tile fair-use policy |
| Web Speech API | STT/TTS 11 languages | Runtime-dependent | Browser-native | Chrome/Edge best; mic permission |
| WRF feed | — | NOT CONFIGURED | would need feed | Optional local-file adapter (`wrf_adapter.py`, OFF); GFS is the production alternative |
| IMD district-nowcast RSS | official district warning feed | LIVE when upstream responds | Public RSS, no key | Official warning text; do not imply protected IMD API access |
| MOSDAC / ISRO | — | NOT CONFIGURED | auth required | Portal reachable, no open data API |
| IMD protected API | — | NOT CONFIGURED | account required | RSS is the live keyless path; protected API is not claimed |
| INCOIS feed | — | NOT CONFIGURED | no open API found | Portal reachable only |
| LLM providers | — | NOT CONFIGURED | keys absent | Adapters ready; deterministic default |

If a provider is unavailable, the application should show an explicit unavailable state rather than fabricate a current observation. Forecasts, archive/reanalysis, computed indicators, and official warning feeds must retain distinct provenance labels.
