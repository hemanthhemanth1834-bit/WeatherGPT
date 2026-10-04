# PROBLEM-STATEMENT MAPPING — SIH 26068 (MoES/IMD)

Only working features claimed; statuses verified in production.

| Requirement | Implementation | Status |
|---|---|---|
| Conversational AI | intent router + 19 tools + templates | LIVE |
| Weather forecasting | Open-Meteo current/hourly/daily + GFS select | LIVE |
| Real-time weather | live values + IST timestamps | LIVE |
| Extreme weather alerts | 10-station computed scan + GDACS + IMD district-nowcast RSS | COMPUTED + OFFICIAL* |
| Disaster intelligence | risk engine + travel + readiness + 112/1078 | ESTIMATED + STATIC |
| GIS | Leaflet + OSM + alert zones + DEMO track | LIVE + DEMO |
| Satellite | GIBS viewer links + verified tile pattern | API-DEPENDENT |
| NWP/GFS | Open-Meteo blend + `?model=gfs` | LIVE |
| Agriculture | 6-crop rule advisories (informational) | COMPUTED |
| Aviation | NOAA ADDS METAR/TAF + STATIC fallback | LIVE + STATIC |
| Marine | wave-model height/dir/period/SST + fallback | LIVE + FALLBACK |
| Climate analytics | ERA5 yearly/monthly OBSERVED + STATIC reference | LIVE + STATIC |
| Indian multilingual | 11 languages, script detection, templates | LIVE |
| Voice | Web Speech STT/TTS + fallbacks | LIVE (browser) |
| GPS/location | Geolocation + reverse-geocode + saved places | LIVE |

\* GDACS official = global third-party context; Indian official warnings: none
(follows only from IMD/NDMA feeds, which are NOT CONFIGURED).
