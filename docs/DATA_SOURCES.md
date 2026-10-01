# DATA SOURCES — WeatherGPT SIH 2026

Verified live on 30 Sep–01 Oct 2026 (see `/api/providers/health`).

| Provider | Purpose | Status | Free / Key | Limitations |
|---|---|---|---|---|
| Open-Meteo Forecast | current/hourly/daily, cloud, UV, sun | LIVE | Free, no key | Model blend, not station obs |
| Open-Meteo Geocoding | place search + GPS fallback | LIVE | Free, no key | Village coverage varies |
| Open-Meteo Air Quality | US AQI + 6 pollutants | LIVE | Free, no key | Modelled, not CPCB station |
| Open-Meteo Marine | waves/dir/period/SST | LIVE | Free, no key | Wave model, not buoys |
| Open-Meteo Archive (ERA5) | yearly/monthly history | LIVE | Free, no key | Reanalysis, 2–5 day lag |
| GFS via Open-Meteo | `?model=gfs` selector | LIVE | Free, no key | Single-model run, no cycle meta |
| RainViewer | radar tiles + timeline | LIVE | Free, no key | Composite, ~10 min delay |
| NASA GIBS | satellite viewer links + tile pattern | LIVE | Free, no key | Viewed at provider, not proxied |
| NOAA ADDS | METAR/TAF 6 Indian airports | LIVE | Free, no key | US source; outages fall back STATIC |
| BigDataCloud | GPS reverse-geocode | LIVE | Free, no key | Low-volume fair use |
| GDACS (UN JRC) | global disaster events | OFFICIAL third-party | Free, no key | Global context, not Indian warnings |
| USGS | earthquakes M4.5+, 7-day | OFFICIAL third-party | Free, no key | Geological, worldwide |
| NASA EONET | open wildfires | OFFICIAL third-party | Free, no key | Satellite detections, verify locally |
| OpenStreetMap | basemap tiles | LIVE | Free (ODbL) | Tile fair-use policy |
| Web Speech API | STT/TTS 11 languages | LIVE | Browser-native | Chrome/Edge best; mic permission |
| WRF feed | — | NOT CONFIGURED | would need feed | No free live source; interface ready |
| MOSDAC / ISRO | — | NOT CONFIGURED | auth required | Portal reachable, no open data API |
| IMD feed | — | NOT CONFIGURED | no open API found | Probed paths 404; portal only |
| INCOIS feed | — | NOT CONFIGURED | no open API found | Portal reachable only |
| LLM providers | — | NOT CONFIGURED | keys absent | Adapters ready; deterministic default |

Fallback order: LIVE → FALLBACK → ESTIMATED/SIMULATED, always labelled
with source + IST timestamp. Nothing stale is ever shown as LIVE.
