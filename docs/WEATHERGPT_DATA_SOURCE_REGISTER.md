# WeatherGPT Data Source Register

Per-source register for the audit/release. Complements the existing
`docs/DATA_SOURCES.md`, `docs/PROVENANCE.md` and
`docs/FREE_DATA_PROVIDER_MATRIX.md` — this document focuses on what the
audit verified per source, the honesty label the app must show, and the
caching/fallback behavior per path.

## External providers (free, no key)

| Source | Used for | Backend path | Cache | Verified freshness | Label shown |
|--------|----------|--------------|-------|--------------------|-------------|
| Open-Meteo Forecast API | Current + hourly + daily weather | `services/weather.py` | ~10 min in-process TTL | Current hour (matched UI) | `LIVE · Open-Meteo` + model name + `updated_at_ist` |
| Open-Meteo Air Quality API | US-EPA AQI + pollutants | `services/air_quality.py` | 30 min | observed_at within current half-hour (audit: 133 Pune, "Unhealthy for Sensitive Groups") | `LIVE` AQI, source string embedded | 
| Open-Meteo Geocoding | Place → coordinates | `services/geo.py` | per-query | Live per query | n/a (input resolution) |
| RainViewer Radar | Radar tiles (recent-past composite) | `services/radar.py` (frontend tiles) | manifest ~2 min | 12 frames, ~1.8 min age; 0 nowcast frames (honest: no fake nowcast) | `RECENT HISTORY` / `DELAYED` |
| NASA GIBS (VIIRS/MODIS) | Daily true-color satellite imagery | `services/gibs.py` | daily product | Previous day's product | `DELAYED · daily product` + date |
| USGS Earthquake API | Seismic events | `services/disasters.py` (feed) | ~10 min | Same-day events | `OFFICIAL · USGS` |
| NASA EONET | Wildfire/hotspot events | `services/disasters.py` | ~10 min | Current events | `OFFICIAL · EONET` |
| GDACS (UN JRC) | Global disaster context | `services/disasters.py` | ~10 min | Current events | `OFFICIAL · GDACS` (read-only context) |
| OpenStreetMap tiles | Base maps | frontend | browser | n/a | OSM attribution rendered |
| OSM Overpass | Nearby emergency facilities | `services/places.py` | 24 h | ~13 s live query | "OpenStreetMap" + honest empty state |
| Nominatim/OSM reverse geocode | Map click → place name | `services/geo.py` | per-query | Live | n/a |

## Derived / heuristic sources (must always be labelled)

| Value | Method | Label | Fallback behavior |
|-------|--------|-------|-------------------|
| AQI (only when live feed down) | `estimate_aqi(state)` heuristic | "State-level heuristic estimate (not a measurement)" | Live open-meteo AQI is preferred and merged on top of the cached weather payload (never baked into the weather cache — see `_apply_live_aqi`) |
| UV index (when model omits it) | Default 6.0 | "Estimated fallback (UV omitted by selected model)" | Marked in `uv_index_source` |
| Visibility (when model omits it) | Default 8.0 km | "Estimated fallback (visibility omitted by selected model)" | Marked in `visibility_source` |
| Solar azimuth/altitude | Date + latitude declination, sunrise/sunset arc | "Estimated … geometry proxy" | Explicitly not an ephemeris |
| Risk/flood/sector indicators | Thresholds over live values | COMPUTED | Feet thresholds documented inline in `moduleMetrics` |
| Alert validity windows | Computed from live telemetry | COMPUTED ("not official IMD bulletins") | Official pointer to IMD appended in chat |
| Place resolution provenance | Gazetteer → Open-Meteo geocoding → declared default, reported by `geo.resolve()` | n/a (drives wording) | When a named place cannot be resolved at all, the chat reply states it and names the fallback city; `location_resolved=false` is returned to the client. Never substitutes a *different* real place for an unknown one. |
| Cyclone track geometry | Static demonstration data | DEMO | Never presented as live positions |

## Static / curated content

- IMD/NDMA/emergency helplines and preparedness guidance: static curated text,
  labelled STATIC GUIDANCE.
- Provider registry (MOSDAC/WRF status): static registry that reports
  "NOT CONFIGURED" until real feeds are provisioned — no fabricated status.

## Rules enforced in this audit

1. Every displayed value must trace to one of the rows above, with a visible
   source/label where it is derived.
2. Cached responses may never be labeled LIVE when the cache age exceeds the
   provider's update cadence (radar/satellite show DELAYED/RECENT HISTORY).
3. On provider failure: show explicit "unavailable" copy — never a fabricated
   value, never a permanent loading state.
4. Official warning authority is always IMD/NDMA; third-party feeds are
   marked as context only.
