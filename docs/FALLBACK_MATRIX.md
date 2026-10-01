# FALLBACK MATRIX — WeatherGPT SIH 2026

Order everywhere: LIVE → FALLBACK → ESTIMATED/SIMULATED. Never stale-as-LIVE.

| Domain | Primary (LIVE) | Fallback | Last resort |
|---|---|---|---|
| Weather | Open-Meteo blend/GFS | — | SIMULATED local estimate |
| AQI | OM Air Quality (US AQI) | heuristic band | ESTIMATED label |
| Marine | OM Marine wave model | empirical wind model | FALLBACK label |
| Aviation | NOAA ADDS METAR/TAF | STATIC composed samples | STATIC chip |
| Climate history | OM Archive ERA5 | 502 honest error | STATIC reference |
| Geocoding | Gazetteer → OM live | built-in default city | — |
| Reverse GPS | BigDataCloud | coordinate label | FALLBACK |
| Alerts | telemetry scan + GDACS/USGS | illustrative synoptic note | COMPUTED label |
| Cyclone | DEMO geometry | — | DEMO label |
| Flood | rain + elevation proxy | — | COMPUTED + limits |
| Solar | UV + cloud proxy | — | ESTIMATED + formula |
| Places | Overpass OSM | empty + 112 message | — |
| Radar | RainViewer frames | latest frame / hidden | timestamp shown |
| Satellite | GIBS viewer links | — | API-DEPENDENT |
| Chat | deterministic tools | honest unavailable reply | never 500 |
| LLM explain | configured key | deterministic brief | RULE-BASED label |
| 3D coastlines | Natural Earth fetch | wireframe + note | text fallback |
| Notifications | Notification API | in-app banner | unsupported message |
