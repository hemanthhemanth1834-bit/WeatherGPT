# WeatherGPT — SIH 2026 Complete Free-First Implementation Map

This document maps the SIH presentation to the repository without claiming unavailable services as live.

## 1. Data ingestion
- **Open-Meteo:** live forecast, history, GFS, ECMWF and ICON; core path is no-key.
- **IMD:** official RSS is integrated; the IMD API gateway is available when an account/API credential is configured.
- **RainViewer:** recent public radar tiles.
- **NASA GIBS:** public Earth-observation imagery.
- **USGS / EONET / GDACS:** public disaster/event feeds.
- **NOAA Aviation Weather:** current METAR/TAF API.
- **OpenStreetMap:** maps and nearby-place context.
- **BigDataCloud:** client-side GPS reverse geocoding without a key.

## 2. Query understanding
Natural-language input is converted into intent, location, time, hazard, persona and language. The deterministic weather engine remains the source of numeric values.

## 3. Weather intelligence
Forecast retrieval, warning correlation, climate context, agriculture rules, risk calculations, multi-model comparison and uncertainty/provenance are presented as separate explainable layers.

## 4. NWP
- LIVE: Auto, GFS, ECMWF IFS, DWD ICON through Open-Meteo.
- READY/OPTIONAL: WRF GRIB2/NetCDF file adapter.
- FREE ALTERNATIVE: NOAA NOMADS GRIB2 for model-data workflows.
- Model disagreement can be surfaced instead of hidden.

## 5. Trust and safety
Every source is classified as LIVE, OFFICIAL, COMPUTED, ESTIMATED, STATIC, DEMO or NOT CONFIGURED. A provider is not labelled LIVE merely because an adapter exists.

## 6. Disaster intelligence
Heavy rain, flood proxy, severe weather, cyclone context, earthquakes, wildfires/natural events, GDACS events and location-aware emergency context are supported.

## 7. Sector intelligence
- **Agriculture:** crop/weather advisory rules.
- **Aviation:** METAR/TAF and briefing workflow.
- **Marine:** marine/weather context and estimates.
- **Road/utility/lifestyle/solar:** application-specific weather decision modules.

## 8. GIS and 3D
Leaflet/OpenStreetMap provides 2D GIS. Three.js provides the 3D Earth with markers and motion-safe rendering. The advanced UI uses telemetry cards, source chips, animated states and progressive disclosure rather than replacing the existing information architecture.

## 9. Live visual evidence
LiveEvidencePanel.jsx shows recent RainViewer radar imagery, NASA GIBS/MODIS Earth-observation imagery, current weather/provider provenance and selected location state. This is intentionally different from embedding a static screenshot and calling it live.

## 10. Real-time architecture
- REST for query/data retrieval.
- WebSocket support already exists.
- **Optional free extension:** self-hosted Mosquitto MQTT.
- **Optional WIS2.0 extension:** connect a real WIS2 topic/feed when credentials/access are available.
- MQTT events can be bridged into the existing WebSocket UI without changing the core weather engine.

## 11. Storage and cache
- Existing lightweight development path remains usable.
- Optional PostgreSQL/PostGIS for spatial persistence.
- Optional Valkey for cache.
- Free Docker Compose definitions are provided under infra/.

## 12. Local AI
Ollama can be used as an optional local NLU/LLM layer. The project does not require a paid LLM for core weather answers.

## 13. Voice and languages
Browser-native speech recognition/synthesis remains the zero-cost baseline. The application supports the existing Indian-language conversational layer and can use local/free voice bridges when separately hosted.

## 14. Offline / low connectivity
The application already has PWA installation support and a lightweight UI. Service-worker/cache expansion is the intended next layer for full offline operation; it should never invent stale weather as live.

## 15. Security
Environment variables are used for secrets. Optional provider keys must never be committed. Provider timeouts, fallback labels and provenance prevent failed services from becoming fabricated answers.

## 16. Free-source policy
Preferred order: public/no-key source; official free feed; free API-key tier when genuinely required; self-hosted open-source alternative; clearly labelled static/demo fallback. Paid APIs are not required for the core WeatherGPT experience.

## 17. UI/UX target
The high-level command center uses glass/telemetry surfaces, animated status indicators, 3D Earth, live radar/satellite evidence, responsive navigation, source/freshness chips, reduced-motion fallback, clear error/empty states and mobile/PWA support.

## 18. Judge-demo examples
- **Citizen:** rain tomorrow + warning correlation.
- **Farmer:** crop operation + rain/wind/humidity advisory.
- **Responder:** active hazards + map + severity/proximity.
- **Technical:** GFS/ECMWF/ICON comparison + disagreement explanation.
- **Earth observation:** live radar + NASA GIBS evidence.
- **Aviation:** airport METAR/TAF briefing.
- **Marine:** coastal weather briefing.

## 19. What remains conditional
WRF, WIS2.0/MQTT, PostgreSQL/PostGIS, Valkey and Ollama become LIVE only after their real runtime/feed is configured. This is intentional: the project never converts an adapter into a fake live service.