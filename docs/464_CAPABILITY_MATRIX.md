# 464-CAPABILITY MATRIX — WeatherGPT SIH 2026

Every capability the product tracks, with honest status. Legend:
LIVE = verified live data · OFFICIAL = official third-party feed ·
COMPUTED = derived from live inputs · FALLBACK = backup path in use ·
ESTIMATED = heuristic · SIMULATED = local estimate, upstream down ·
DEMO = illustrative · STATIC = bundled/sample/reference ·
NOT_CONFIGURED = no legitimate source connected.

Total rows: **464** (count verified by ID sequence).

| ID | Category | Capability | Existing/New | Frontend | Backend | Data Source | Provider | Status | Fallback | Test | Documentation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W001 | Weather current | Current temperature | Existing | WeatherDashboard hero, HomePanel widget, ModernWeatherCard | weather.py get_weather | Open-Meteo current | Open-Meteo | LIVE | SIMULATED local estimate | test_api, prod QA | README, DATA_SOURCES |
| W002 | Weather current | Feels-like temperature | Existing | dashboard hero, chat card | weather.py | Open-Meteo apparent_temperature | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W003 | Weather current | Humidity | Existing | metric tiles, chat | weather.py | Open-Meteo relative_humidity_2m | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W004 | Weather current | Pressure | Existing | metric tile | weather.py | Open-Meteo surface_pressure | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W005 | Weather current | Wind speed | Existing | metric tile, marine | weather.py | Open-Meteo wind_speed_10m | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W006 | Weather current | Wind direction | Existing | metric sub, compare | weather.py compass() | Open-Meteo wind_direction_10m | Open-Meteo | LIVE | SIMULATED | test_chat | README |
| W007 | Weather current | Precipitation | Existing | metric tile, hero | weather.py | Open-Meteo precipitation | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W008 | Weather current | Cloud cover | Existing | metric tile, solar input | weather.py cloud_cover | Open-Meteo cloud_cover | Open-Meteo | LIVE | SIMULATED | test_intents | README |
| W009 | Weather current | Visibility | Existing | metric tile, travel input | weather.py fixed 9km | Model default | WeatherGPT | ESTIMATED | — | test_api | matrix-only |
| W010 | Weather current | Condition text + code | Existing | all weather views | weather.py WMO map | WMO codes (standard) | Open-Meteo | LIVE | SIMULATED | test_chat | README |
| W011 | Weather current | Condition icon (Lucide) | Existing | WxIcon.jsx | icon code passthrough | Lucide (ISC) | Lucide | STATIC | emoji glyphs | build+lint | THIRD_PARTY |
| W012 | Weather current | Sunrise / sunset | Existing | metric tiles, UV panel | weather.py daily sun | Open-Meteo sunrise/sunset | Open-Meteo | LIVE | SIMULATED | test_api | README |
| W013 | Weather current | Coordinates display | Existing | dashboard header | geo.py geocode | Gazetteer + OM geocoding | Open-Meteo | LIVE | default coords | test_geo | README |
| W014 | Weather current | Location hierarchy chips | New | WeatherDashboard breadcrumb | models country/state | Gazetteer + geocoding | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| W015 | Weather current | Source badge per card | Existing | SourceBadge.jsx | transparency fields | Each payload | Respective | LIVE | — | test_api | README |
| W016 | Weather current | IST timestamp per card | Existing | updated_at_ist labels | weather.py ist_now_label | Server clock + provider | Open-Meteo | LIVE | local time | test_api | README |
| W017 | Weather current | Auto-refresh + relative time | Existing | HomePanel refresh/auto | cache TTL 600s | Open-Meteo | Open-Meteo | LIVE | CACHED | browser QA | README |
| W018 | Weather current | Audio briefing (TTS) | Existing | dashboard Audio button | speech text | Web Speech (browser) | Browser | LIVE | typed text | browser QA | README |
| W019 | Weather current | Printable brief modal | Existing | WeatherBrief.jsx | payload fields | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| W020 | Weather current | Dew point (aviation) | Existing | AviationMarine decoded | aviation_live.py | NOAA ADDS | NOAA | LIVE | STATIC sample | test_gps_aviation_llm | README |
| F001 | Forecast | 24-hour hourly strip | Existing | WeatherDashboard timeline | weather.py hourly[24] | Open-Meteo hourly | Open-Meteo | LIVE | SIMULATED | test_api | README |
| F002 | Forecast | Hourly temperature sparkline | Existing | TempSpark SVG | hourly temps | Open-Meteo | Open-Meteo | LIVE | hidden | browser QA | matrix-only |
| F003 | Forecast | Hourly metric switch | Existing | dashboard toggle | hourly fields | Open-Meteo | Open-Meteo | LIVE | — | browser QA | matrix-only |
| F004 | Forecast | Hourly humidity | New | dashboard toggle | weather.py humidity | Open-Meteo hourly RH | Open-Meteo | LIVE | SIMULATED | test_providers | matrix-only |
| F005 | Forecast | 7-day daily outlook | Existing | dashboard daily rows | weather.py daily[7] | Open-Meteo daily | Open-Meteo | LIVE | SIMULATED | test_api | README |
| F006 | Forecast | High/low range | Existing | hero + chat | daily max/min | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_chat | README |
| F007 | Forecast | Daily rain sums | Existing | daily rows | daily precipitation_sum | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_api | README |
| F008 | Forecast | Daily wind max | Existing | daily rows | daily wind_speed_10m_max | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_api | matrix-only |
| F009 | Forecast | Rain probability timeline | Existing | hourly chips, flood timeline | precipitation_probability | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_api | README |
| F010 | Forecast | Condition icons per slot | Existing | glyphFor rows | WMO map | WMO standard | Open-Meteo | LIVE | SIMULATED | browser QA | matrix-only |
| F011 | Forecast | Nearby-areas explorer | Existing | metro chips | geo.metro_areas | Gazetteer (curated) | WeatherGPT | STATIC | — | test_geo | README |
| F012 | Forecast | GFS model selector | Existing | NWP panel GFS card | ?model=gfs | Open-Meteo models=gfs_global | Open-Meteo | LIVE | blend | test_providers | README |
| F013 | Forecast | Model comparison (blend vs GFS) | Existing | NWP panel delta | two get_weather calls | Open-Meteo | Open-Meteo | LIVE | — | test_providers | matrix-only |
| F014 | Forecast | Forecast confidence note | Existing | provider dependent note | confidence field | Provider docs | Open-Meteo | ESTIMATED | — | test_api | README |
| F015 | Forecast | 3-hour nowcast granularity | New | — | — | No free 3-hour feed wired | — | NOT_CONFIGURED | hourly 1h used | n/a | matrix-only |
| F016 | Forecast | Minute-level rain nowcast | New | — | — | No free minute feed wired | — | NOT_CONFIGURED | hourly probs used | n/a | matrix-only |
| F017 | Forecast | Forecast export (JSON/CSV) | New | dashboard export buttons | payload passthrough | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| F018 | Forecast | Printable 7-day brief | Existing | WeatherBrief modal | payload fields | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| L001 | Location/GPS | Browser GPS on load | Existing | App attemptGps | geo.reverse | Geolocation API + BigDataCloud | Browser/BigDataCloud | LIVE | saved/empty | browser QA | README |
| L002 | Location/GPS | GPS button refresh | Existing | Navbar ◎ button | same as L001 | Same | Same | LIVE | manual | browser QA | README |
| L003 | Location/GPS | Detecting state | Existing | locating chip/spinner | client state | — | — | COMPUTED | — | browser QA | matrix-only |
| L004 | Location/GPS | Denial/timeout handling | Existing | notice messages | error codes | — | — | COMPUTED | manual/saved | test_gps_aviation_llm | README |
| L005 | Location/GPS | Reverse geocode | Existing | App locateMe | geo.reverse | BigDataCloud (free) | BigDataCloud | LIVE | FALLBACK coords label | test_gps_aviation_llm | DATA_SOURCES |
| L006 | Location/GPS | City+state resolution | Existing | gpsLabel chip/banner | reverse city/state | BigDataCloud | BigDataCloud | LIVE | FALLBACK | browser QA | README |
| L007 | Location/GPS | No Pune auto-default | Existing | place="" init | — | — | — | COMPUTED | saved/empty | browser QA | matrix-only |
| L008 | Location/GPS | Manual search priority | Existing | searchPlace MANUAL | geo.geocode | Gazetteer + OM | Open-Meteo | LIVE | — | browser QA | README |
| L009 | Location/GPS | Last-known labelling | Existing | LAST_KNOWN status | saved[0] reuse | localStorage names | Browser | STATIC | — | browser QA | matrix-only |
| L010 | Location/GPS | Race guards (request id) | Existing | locRequestId ref | — | — | — | COMPUTED | — | code review | matrix-only |
| L011 | Location/GPS | 100+ city gazetteer | Existing | autocomplete | geo.GAZETTEER | Curated coordinates (facts) | WeatherGPT | STATIC | live geocode | test_geo | README |
| L012 | Location/GPS | Live geocoding fallback | Existing | autocomplete top-up | geo._geocode_live | Open-Meteo geocoding | Open-Meteo | LIVE | default city | test_geo | DATA_SOURCES |
| L013 | Location/GPS | Coordinate weather | Existing | map/GPS path | get_weather(lat,lon) | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_api | README |
| L014 | Location/GPS | State override param | Existing | GPS flow | ?state= | reverse result | BigDataCloud | LIVE | India | test_gps_aviation_llm | matrix-only |
| L015 | Location/GPS | IP geolocation primary | New | — | — | Deliberately not used | — | NOT_CONFIGURED | GPS/manual | n/a (policy) | matrix-only |
| L016 | Location/GPS | watchPosition tracking | New | — | — | Deliberately not polled (perf/privacy) | — | NOT_CONFIGURED | button refresh | n/a (policy) | matrix-only |
| L017 | Location/GPS | Privacy note | Existing | Saved tab text | — | — | — | STATIC | — | browser QA | matrix-only |
| L018 | Location/GPS | Minimal persistence | Existing | names only in storage | — | localStorage | Browser | STATIC | — | code review | SECURITY |
| L019 | Location/GPS | GPS in chat context | Existing | location_name | extract/geocode | Same as L012 | Open-Meteo | LIVE | New Delhi fallback | test_chat | AI_AGENT |
| L020 | Location/GPS | Map fly-to place | Existing | GISMap marker + FlyTo | weather lat/lon | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| Q001 | AQI/UV | Live US AQI | Existing | dashboard AQI card | air_quality.py | OM Air Quality | Open-Meteo | LIVE | FALLBACK estimate | test_providers | README |
| Q002 | AQI/UV | AQI band text | Existing | AQI card | aqi_band() | EPA breakpoints | EPA via OM | LIVE | FALLBACK | test_providers | matrix-only |
| Q003 | AQI/UV | PM2.5 | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | README |
| Q004 | AQI/UV | PM10 | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | README |
| Q005 | AQI/UV | NO2 | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | matrix-only |
| Q006 | AQI/UV | O3 | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | matrix-only |
| Q007 | AQI/UV | SO2 | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | matrix-only |
| Q008 | AQI/UV | CO | Existing | pollutant grid | air_quality.py | OM Air Quality | Open-Meteo | LIVE | — | test_providers | matrix-only |
| Q009 | AQI/UV | Dominant pollutant | Existing | AQI card line | dominant_pollutant() | Computed from live | WeatherGPT | COMPUTED | — | test_providers | matrix-only |
| Q010 | AQI/UV | AQI advisory sentence | Existing | AQI card text | band + rain rule | Live AQI + rain | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| Q011 | AQI/UV | CPCB station AQI | New | — | — | No open CPCB feed wired | — | NOT_CONFIGURED | US AQI used | n/a | matrix-only |
| Q012 | AQI/UV | UV index live | Existing | metric + UV card | daily uv_index_max | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_providers | README |
| Q013 | AQI/UV | UV risk level + advice | Existing | UV card | uv_guidance() | Standard bands | WeatherGPT | COMPUTED | — | test_providers | matrix-only |
| Q014 | AQI/UV | Sunrise/sunset context | Existing | UV card times | daily sun | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_api | matrix-only |
| Q015 | AQI/UV | AQI chat answers | Existing | chat AQI intent | get_air_quality | OM Air Quality | Open-Meteo | LIVE | ESTIMATED fallback | test_chat | AI_AGENT |
| Q016 | AQI/UV | AQI history trend | New | — | — | Archive lacks AQ variables | — | NOT_CONFIGURED | current only | n/a | matrix-only |
| M001 | Marine | Wave height live | Existing | marine panel | OM Marine | Open-Meteo Marine | Open-Meteo | LIVE | FALLBACK empirical | test_providers | README |
| M002 | Marine | Wave direction | Existing | marine panel | OM Marine | Open-Meteo Marine | Open-Meteo | LIVE | — | test_providers | README |
| M003 | Marine | Wave period | Existing | marine panel | OM Marine | Open-Meteo Marine | Open-Meteo | LIVE | — | test_providers | README |
| M004 | Marine | Sea surface temp | Existing | marine panel | OM Marine | Open-Meteo Marine | Open-Meteo | LIVE | — | test_providers | README |
| M005 | Marine | Wind (knots) | Existing | marine panel | coastal wind fetch | Open-Meteo | Open-Meteo | LIVE | default 16km/h | test_providers | matrix-only |
| M006 | Marine | Swell component | Existing | marine model | wind_wave/swell fields | Open-Meteo Marine | Open-Meteo | LIVE | — | test_providers | matrix-only |
| M007 | Marine | Sea condition text | Existing | marine panel | threshold bands | Computed from live | WeatherGPT | COMPUTED | — | test_providers | README |
| M008 | Marine | Fisherman warning tiers | Existing | advisory banner | threshold bands | Computed from live | WeatherGPT | COMPUTED | — | test_providers | README |
| M009 | Marine | Tide times | Existing | tide line | indicative offsets | Clock arithmetic | WeatherGPT | ESTIMATED | — | test_providers | matrix-only |
| M010 | Marine | Coastal sector select | Existing | coast buttons (6) | COASTS map | Curated coords | WeatherGPT | STATIC | — | browser QA | matrix-only |
| M011 | Marine | Provenance chip | Existing | provenance field | model field | Live/fallback flag | Open-Meteo | LIVE | FALLBACK label | test_providers | matrix-only |
| M012 | Marine | Marine chat answers | Existing | marine intent | marine_advisory | OM Marine | Open-Meteo | LIVE | ESTIMATED text | test_chat | AI_AGENT |
| M013 | Marine | INCOIS bulletins | New | — | — | No open INCOIS feed found | — | NOT_CONFIGURED | OM Marine used | n/a | DATA_SOURCES |
| M014 | Marine | NDBC buoys | New | — | — | Evaluated: no India coverage wired | — | NOT_CONFIGURED | OM Marine used | n/a | matrix-only |
| M015 | Marine | Visibility at sea | New | — | — | No free visibility feed wired | — | NOT_CONFIGURED | coastal vis shown | n/a | matrix-only |
| M016 | Marine | Storm surge height | New | — | — | No free surge feed wired | — | NOT_CONFIGURED | wind/wave proxy | n/a | matrix-only |
| V001 | Aviation | Live METAR (6 airports) | Existing | aviation panel | aviation_live.py | NOAA ADDS | NOAA | LIVE | STATIC sample | test_gps_aviation_llm | README |
| V002 | Aviation | Live TAF | Existing | aviation panel | aviation_live.py | NOAA ADDS | NOAA | LIVE | No current TAF msg | test_gps_aviation_llm | README |
| V003 | Aviation | Temperature / dewpoint | Existing | decoded line | ADDS fields | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V004 | Aviation | Wind + gusts | Existing | decoded line | ADDS fields | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V005 | Aviation | Visibility (SM) | Existing | decoded line | ADDS visib | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V006 | Aviation | Ceiling (cloud base) | Existing | decoded line | ADDS clouds | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V007 | Aviation | Altimeter (QNH) | Existing | decoded line | ADDS altim | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V008 | Aviation | Observation timestamp | Existing | decoded line | ADDS reportTime | NOAA ADDS | NOAA | LIVE | — | test_gps_aviation_llm | matrix-only |
| V009 | Aviation | Flight category (VFR-LIFR) | Existing | big badge | NWS rules | Computed from live | WeatherGPT | COMPUTED | — | test_gps_aviation_llm | README |
| V010 | Aviation | Hazard list | Existing | hazards list | threshold rules | Computed from live | WeatherGPT | COMPUTED | — | test_gps_aviation_llm | matrix-only |
| V011 | Aviation | Airport selector (6) | Existing | airport tabs | AIRPORTS map | Curated ICAO list | WeatherGPT | STATIC | — | browser QA | matrix-only |
| V012 | Aviation | STATIC sample fallback | Existing | STATIC chip | advisories.py samples | Own composed samples | WeatherGPT | STATIC | — | test_api | README |
| V013 | Aviation | LIVE vs STATIC chip | Existing | provenance chip | decoded.provenance | Live/static flag | NOAA/WeatherGPT | LIVE | STATIC label | test_gps_aviation_llm | matrix-only |
| V014 | Aviation | Aviation chat answers | Existing | aviation intent | live-first briefing | NOAA ADDS | NOAA | LIVE | STATIC text | test_chat | AI_AGENT |
| V015 | Aviation | Airport map markers | New | — | — | No airport layer wired | — | NOT_CONFIGURED | text + chat | n/a | matrix-only |
| V016 | Aviation | Runway crosswind calc | New | — | — | Needs runway headings dataset | — | NOT_CONFIGURED | wind shown raw | n/a | matrix-only |
| V017 | Aviation | SIGMET/AIRMET feed | New | — | — | No free India feed wired | — | NOT_CONFIGURED | hazards list | n/a | matrix-only |
| V018 | Aviation | 3D airport marker | New | — | — | No airport 3D model wired | — | NOT_CONFIGURED | 2D map + globe | n/a | matrix-only |
| C001 | Climate | Decadal reference series | Existing | ClimateAnalytics bars | advisories.climate_reference | Bundled reference | WeatherGPT | STATIC | — | test_api | README |
| C002 | Climate | Temperature anomaly bars | Existing | climate panel | reference series | Bundled reference | WeatherGPT | STATIC | — | test_api | README |
| C003 | Climate | Monsoon departure bars | Existing | climate panel | reference series | Bundled reference | WeatherGPT | STATIC | — | test_api | README |
| C004 | Climate | Key insights text | Existing | insights list | reference series | Bundled reference | WeatherGPT | STATIC | — | test_api | matrix-only |
| C005 | Climate | Observed yearly means | Existing | observed years table | history.py ERA5 | OM Archive | Open-Meteo | LIVE | 502 honest | test_providers | README |
| C006 | Climate | Observed monthly means | Existing | monthly strip + year input | history.monthly_means | OM Archive | Open-Meteo | LIVE | 502 honest | test_gps_aviation_llm | README |
| C007 | Climate | Hot/wet day counts | Existing | yearly rows | computed from ERA5 | OM Archive | Open-Meteo | COMPUTED | — | test_providers | matrix-only |
| C008 | Climate | Humidity trend (monthly) | Existing | monthly mono line | ERA5 RH mean | OM Archive | Open-Meteo | LIVE | — | test_gps_aviation_llm | matrix-only |
| C009 | Climate | Month/year selectors | Existing | region+year inputs | endpoint params | User input | — | COMPUTED | — | browser QA | matrix-only |
| C010 | Climate | Export climate data | New | dashboard/climate export | exportData CSV/JSON | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| C011 | Climate | Baseline selector | New | — | — | Fixed 1961–1990 baseline | — | NOT_CONFIGURED | fixed baseline | n/a | matrix-only |
| C012 | Climate | Moving averages | New | — | — | Not computed in UI | — | NOT_CONFIGURED | yearly table | n/a | matrix-only |
| C013 | Climate | Heatwave history view | New | — | — | Hot-day counts shown; no dedicated view | — | NOT_CONFIGURED | yearly rows | n/a | matrix-only |
| C014 | Climate | Drought context view | New | — | — | Rain totals shown; no index | — | NOT_CONFIGURED | yearly rows | n/a | matrix-only |
| C015 | Climate | Projection/model compare | New | — | — | No projection feed wired | — | NOT_CONFIGURED | OBSERVED only | n/a | matrix-only |
| C016 | Climate | Seasonal/monsoon view | New | — | — | Monthly strip covers seasons | — | NOT_CONFIGURED | monthly bars | n/a | matrix-only |
| N001 | NWP/models | GFS blend forecast | Existing | all weather views | ?model=auto | Open-Meteo blend | Open-Meteo | LIVE | SIMULATED | test_providers | README |
| N002 | NWP/models | Explicit GFS selector | Existing | NWP panel GFS card | ?model=gfs | models=gfs_global | Open-Meteo | LIVE | blend | test_providers | README |
| N003 | NWP/models | Blend-vs-GFS delta | Existing | NWP panel | two model calls | Open-Meteo | Open-Meteo | LIVE | — | test_providers | matrix-only |
| N004 | NWP/models | Model run timestamps | New | — | — | Open-Meteo exposes no cycle meta | — | NOT_CONFIGURED | updated_at shown | n/a | matrix-only |
| N005 | NWP/models | Forecast horizon note | Existing | 24h/7d labels | hourly/daily lengths | Open-Meteo | Open-Meteo | LIVE | — | test_api | matrix-only |
| N006 | NWP/models | ECMWF/ICON blend members | Existing | nwp_model string | blend label | Open-Meteo | Open-Meteo | LIVE | — | test_api | DATA_SOURCES |
| N007 | NWP/models | NOMADS direct access | New | — | — | Not wired; OM covers needs | — | NOT_CONFIGURED | OM blend | n/a | matrix-only |
| N008 | NWP/models | GRIB2 parsing architecture | Existing | — (docs) | nwp_service design | Design doc | WeatherGPT | STATIC | — | test_api | README |
| N009 | NWP/models | NetCDF adapter | Existing | — (docs) | wrf_adapter paths | Design doc | WeatherGPT | STATIC | — | test_hardening | README |
| N010 | NWP/models | WRF live output | New | — | — | No WRF infrastructure | — | NOT_CONFIGURED | GFS used | test_hardening | README |
| N011 | NWP/models | WRF upload/import UI | New | — | — | No upload pipeline built | — | NOT_CONFIGURED | docs only | n/a | matrix-only |
| N012 | NWP/models | Pressure-level fields | New | — | — | Not requested from OM | — | NOT_CONFIGURED | surface fields | n/a | matrix-only |
| N013 | NWP/models | Ensemble spread | New | — | — | Not requested from OM | — | NOT_CONFIGURED | single value | n/a | matrix-only |
| N014 | NWP/models | NWP status endpoint | Existing | NWP panel | nwp_service | Blend + WRF adapter | Open-Meteo | LIVE | — | test_api | README |
| S001 | Satellite | GIBS viewer links | Existing | NWP satellite cards | satellite_service | NASA GIBS/Worldview | NASA | LIVE | — | test_api | README |
| S002 | Satellite | Verified WMTS tile pattern | Existing | GIS overlay ref | tile template | NASA GIBS | NASA | LIVE | links only | test_providers | DATA_SOURCES |
| S003 | Satellite | Layer selector (true-color/IR/etc) | New | — | — | Single verified pattern; catalog not wired | — | NOT_CONFIGURED | viewer links | n/a | matrix-only |
| S004 | Satellite | Timestamp selector/history | New | — | — | Provider viewer owns time | — | NOT_CONFIGURED | viewer links | n/a | matrix-only |
| S005 | Satellite | Before/after comparison | New | — | — | No frame store wired | — | NOT_CONFIGURED | viewer links | n/a | matrix-only |
| S006 | Satellite | Animation | New | — | — | No frame store wired | — | NOT_CONFIGURED | radar animates | n/a | matrix-only |
| S007 | Satellite | Opacity control | New | — | — | No overlay layer wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| S008 | Satellite | Night lights layer | New | — | — | Catalog not wired | — | NOT_CONFIGURED | viewer links | n/a | matrix-only |
| S009 | Satellite | Vegetation/NDVI layer | New | — | — | No NDVI feed wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| S010 | Satellite | Fire/smoke overlay | New | — | — | EONET points used instead | NASA EONET | NOT_CONFIGURED | EONET list/markers | n/a | matrix-only |
| S011 | Satellite | Precipitation overlay | New | — | — | Radar covers this role | RainViewer | NOT_CONFIGURED | radar tiles | n/a | matrix-only |
| S012 | Satellite | MOSDAC/ISRO imagery | New | — | — | Auth-gated; no open API | — | NOT_CONFIGURED | GIBS links | n/a | DATA_SOURCES |
| S013 | Satellite | Satellite metadata display | Existing | NWP satellite cards | source/acquisition notes | Provider docs | NASA | STATIC | — | test_api | matrix-only |
| S014 | Satellite | Attribution per layer | Existing | map/panel credits | attribution strings | Provider terms | NASA/OSM | STATIC | — | browser QA | THIRD_PARTY |
| R001 | Radar | Live radar tiles | Existing | GISMap TileLayer | RainViewer JSON | RainViewer | RainViewer | LIVE | hidden | prod QA | README |
| R002 | Radar | Frame timeline slider | Existing | timeline control | past frames array | RainViewer | RainViewer | LIVE | latest only | browser QA | README |
| R003 | Radar | Play/pause playback | Existing | play button | frame stepping | RainViewer | RainViewer | LIVE | — | browser QA | matrix-only |
| R004 | Radar | Frame timestamps | Existing | frame x/n label | frame.time epoch | RainViewer | RainViewer | LIVE | — | browser QA | matrix-only |
| R005 | Radar | Precipitation legend | Existing | legend row | dBZ gradient (static) | Standard scale | WeatherGPT | STATIC | — | browser QA | matrix-only |
| R006 | Radar | Intensity colors | Existing | tile rendering | RainViewer tiles | RainViewer | RainViewer | LIVE | — | browser QA | matrix-only |
| R007 | Radar | Location marker on radar | Existing | place pin popup | weather lat/lon | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| R008 | Radar | Layer opacity | Existing | fixed 0.7 | TileLayer prop | — | — | STATIC | — | browser QA | matrix-only |
| R009 | Radar | Fullscreen map | New | — | — | No fullscreen control wired | — | NOT_CONFIGURED | zoom/pan | n/a | matrix-only |
| R010 | Radar | Stale-frame warning | New | — | — | Frame time shown; no staleness gate | — | NOT_CONFIGURED | timestamp shown | n/a | matrix-only |
| R011 | Radar | Nowcast (predicted frames) | New | — | — | Only observed past frames used | — | NOT_CONFIGURED | past frames | n/a | matrix-only |
| R012 | Radar | Radar source badge | Existing | LIVE RADAR chip | RainViewer credit | RainViewer | RainViewer | LIVE | — | browser QA | README |
| G001 | GIS 2D | Leaflet base map | Existing | GISMap container | — | OSM tiles | OSM | LIVE | — | browser QA | README |
| G002 | GIS 2D | OSM attribution | Existing | attribution control | credit strings | ODbL terms | OSM | STATIC | — | browser QA | THIRD_PARTY |
| G003 | GIS 2D | Zoom/pan controls | Existing | Leaflet controls | — | — | — | STATIC | — | browser QA | matrix-only |
| G004 | GIS 2D | Quick region focus | Existing | preset buttons | setFocus coords | Curated coords | WeatherGPT | STATIC | — | browser QA | matrix-only |
| G005 | GIS 2D | Region filter chips | Existing | N/S/E/W/Centre | setFocus coords | Curated coords | WeatherGPT | STATIC | — | browser QA | matrix-only |
| G006 | GIS 2D | Alert zone circles | Existing | Circle overlays | active_alerts lat/lon | Computed alerts | WeatherGPT | COMPUTED | DEMO label | browser QA | README |
| G007 | GIS 2D | Cyclone track line | Existing | Polyline DEMO | cyclone_track | Illustrative geometry | WeatherGPT | DEMO | — | test_api | README |
| G008 | GIS 2D | Quake markers (sized) | Existing | CircleMarker by mag | disasters.earthquakes | USGS | USGS | LIVE | hidden | prod QA | README |
| G009 | GIS 2D | Wildfire markers | Existing | fire pins + popups | disasters.wildfires | NASA EONET | NASA | LIVE | hidden | prod QA | README |
| G010 | GIS 2D | Place popup actions | Existing | Ask-WeatherGPT button | onAsk wiring | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| G011 | GIS 2D | Layer toggles | Existing | radar/alerts/track/quakes/fires | layer state | — | — | STATIC | — | browser QA | matrix-only |
| G012 | GIS 2D | MapLibre 3D terrain | New | — | — | Not wired; Leaflet used | — | NOT_CONFIGURED | Leaflet + globe | n/a | matrix-only |
| G013 | GIS 2D | 3D buildings | New | — | — | No free building layer wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| G014 | GIS 2D | Heatmap layer | New | — | — | No heat layer wired | — | NOT_CONFIGURED | alert zones | n/a | matrix-only |
| G015 | GIS 2D | Evacuation routes on map | New | — | — | No routing engine wired | — | NOT_CONFIGURED | shelter list | n/a | matrix-only |
| G016 | GIS 2D | Map snapshot export | New | — | — | No snapshot wired | — | NOT_CONFIGURED | JSON/CSV data | n/a | matrix-only |
| E001 | 3D Earth/weather | Rotating globe | Existing | Earth3D autoRotate | three.js OrbitControls | three (MIT) | three.js | STATIC | paused if reduced-motion | browser QA | README |
| E002 | 3D Earth/weather | Atmosphere glow (condition tint) | New | tintFor(condition) | weather.condition | Live payload | Open-Meteo | COMPUTED | default tint | browser QA | matrix-only |
| E003 | 3D Earth/weather | Day/night terminator | Existing | subsolar lighting | UTC math | Real clock | — | COMPUTED | — | browser QA | matrix-only |
| E004 | 3D Earth/weather | Coastlines (Natural Earth) | Existing | LineSegments | world-atlas TopoJSON | Natural Earth (public domain) | NE via jsDelivr | LIVE | wireframe fallback | browser QA | THIRD_PARTY |
| E005 | 3D Earth/weather | Graticule grid | Existing | linework | own math | — | — | STATIC | — | browser QA | matrix-only |
| E006 | 3D Earth/weather | Place marker | Existing | cyan pin | weather lat/lon | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| E007 | 3D Earth/weather | Alert markers | Existing | severity dots | active_alerts | Computed alerts | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| E008 | 3D Earth/weather | Cyclone points | Existing | red dots | cyclone_track | Illustrative | WeatherGPT | DEMO | — | browser QA | README |
| E009 | 3D Earth/weather | Quake markers (sized) | Existing | purple dots | disasters.earthquakes | USGS | USGS | LIVE | hidden | prod QA | README |
| E010 | 3D Earth/weather | Wildfire markers | Existing | orange dots | disasters.wildfires | NASA EONET | NASA | LIVE | hidden | prod QA | README |
| E011 | 3D Earth/weather | Click marker info | Existing | raycast popup card | marker userData | Live payloads | Respective | LIVE | — | browser QA | matrix-only |
| E012 | 3D Earth/weather | Drag/zoom/rotate | Existing | OrbitControls | three | three (MIT) | three.js | STATIC | — | browser QA | matrix-only |
| E013 | 3D Earth/weather | Fly-to location | Existing | camera to place | weather lat/lon | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| E014 | 3D Earth/weather | Reset view | New | — | — | No reset button wired | — | NOT_CONFIGURED | reload tab | n/a | matrix-only |
| E015 | 3D Earth/weather | Fullscreen mode | New | — | — | No fullscreen wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| E016 | 3D Earth/weather | Rain particle field | New | — | — | Not wired; would be SIMULATED | — | NOT_CONFIGURED | radar tiles | n/a | matrix-only |
| E017 | 3D Earth/weather | Wind particles | New | — | — | Not wired; would be SIMULATED | — | NOT_CONFIGURED | wind values | n/a | matrix-only |
| E018 | 3D Earth/weather | Cloud layer | New | — | — | No cloud texture wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| E019 | 3D Earth/weather | Mobile LOW mode | Existing | pixelRatio 1, fewer points | viewport check | — | — | COMPUTED | — | browser QA | matrix-only |
| E020 | 3D Earth/weather | No-WebGL fallback text | Existing | status message | try/catch | — | — | COMPUTED | 2D map | browser QA | matrix-only |
| A001 | Alerts/CAP | Computed telemetry alerts | Existing | AlertCenter cards | alerts.py 10 stations | Open-Meteo telemetry | WeatherGPT | COMPUTED | synoptic note | test_api | README |
| A002 | Alerts/CAP | Severity filters | Existing | All/Red/Orange/Yellow | ?severity= | Computed | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| A003 | Alerts/CAP | Alert timeline (effective→expires) | Existing | mono timestamps | effective/expires | Computed clock | WeatherGPT | COMPUTED | — | test_api | matrix-only |
| A004 | Alerts/CAP | Recommended actions | Existing | instruction box | threshold text | Curated guidance | WeatherGPT | COMPUTED | — | test_api | matrix-only |
| A005 | Alerts/CAP | CAP JSON viewer | New | View CAP button | alert fields mapped | CAP v1.2 shape | OASIS standard | COMPUTED | — | browser QA | matrix-only |
| A006 | Alerts/CAP | CAP generator (outbound) | New | — | — | Viewer only; no issuer role | — | NOT_CONFIGURED | viewer | n/a | matrix-only |
| A007 | Alerts/CAP | CAP parser (inbound) | New | — | — | No inbound CAP feed wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| A008 | Alerts/CAP | WIS2.0 subscription | New | — | — | No WIS2 connection | — | NOT_CONFIGURED | — | n/a | matrix-only |
| A009 | Alerts/CAP | Voice broadcast per alert | Existing | Broadcast button | speechEngine | Web Speech | Browser | LIVE | — | browser QA | README |
| A010 | Alerts/CAP | Emergency notifications | Existing | Notify me button | Notification API | Browser | Browser | LIVE | — | browser QA | matrix-only |
| A011 | Alerts/CAP | Emergency contacts dialog | Existing | EmergencyContacts | STATIC helplines | Published numbers | Govt (public) | STATIC | — | browser QA | matrix-only |
| A012 | Alerts/CAP | 112/1078 quick-dial chips | Existing | Severe header | tel: links | Published numbers | Govt (public) | STATIC | — | browser QA | matrix-only |
| A013 | Alerts/CAP | India fused layer | Existing | India focus toggle | india.py | Computed+GDACS+USGS | Mixed | COMPUTED | — | test_providers | README |
| A014 | Alerts/CAP | Cold wave alerts | Existing | alert cards | temp_min trigger | Open-Meteo | WeatherGPT | COMPUTED | — | test_intents | README |
| A015 | Alerts/CAP | Heatwave alerts | Existing | alert cards | temp trigger | Open-Meteo | WeatherGPT | COMPUTED | — | test_api | README |
| A016 | Alerts/CAP | Thunderstorm/lightning alerts | Existing | alert cards | WMO code trigger | Open-Meteo | WeatherGPT | COMPUTED | — | test_api | README |
| A017 | Alerts/CAP | Official IMD bulletins | New | — | — | No open IMD feed found | — | NOT_CONFIGURED | computed+GDACS | n/a | DATA_SOURCES |
| A018 | Alerts/CAP | Alert detail modal | New | — | — | Cards expand inline instead | — | NOT_CONFIGURED | inline cards | n/a | matrix-only |
| K001 | Risk/travel | Deterministic risk levels | Existing | RiskPanel | risk_engine.py | Live weather | WeatherGPT | COMPUTED | — | test_risk_engine | README |
| K002 | Risk/travel | Heat/rain/flood/wind/storm/cyclone | Existing | driver tiles | threshold bands | Live weather | WeatherGPT | COMPUTED | — | test_risk_engine | README |
| K003 | Risk/travel | Live driver values | Existing | driver values | current payload | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| K004 | Risk/travel | Risk advisories text | Existing | advisory box | threshold text | Curated guidance | WeatherGPT | COMPUTED | — | test_risk_engine | matrix-only |
| K005 | Risk/travel | Travel safety score | Existing | compare + risk line | travel.py | Weather+risk+alerts | WeatherGPT | COMPUTED | — | test_providers | README |
| K006 | Risk/travel | Travel drivers list | Existing | drivers text | travel_safety() | Live inputs | WeatherGPT | COMPUTED | — | test_providers | matrix-only |
| K007 | Risk/travel | Travel chat answers | Existing | travel intent | risk + weather | Live payload | Open-Meteo | COMPUTED | — | test_intents | AI_AGENT |
| K008 | Risk/travel | Road condition advisory | New | — | — | Visibility/wind shown; no road layer | — | NOT_CONFIGURED | travel score | n/a | matrix-only |
| K009 | Risk/travel | Bridge/tunnel status | New | — | — | No structure dataset wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| K010 | Risk/travel | Dangerous segments map | New | — | — | No segment data wired | — | NOT_CONFIGURED | alert zones | n/a | matrix-only |
| K011 | Risk/travel | Trip planner (dates/stops) | New | — | — | travel_safety covers single trips | — | NOT_CONFIGURED | travel endpoint | n/a | matrix-only |
| K012 | Risk/travel | Packing list generator | New | — | — | No packing module wired | — | NOT_CONFIGURED | lifecast tips | n/a | matrix-only |
| K013 | Risk/travel | Best departure window | New | — | — | Hourly probs shown; no optimizer | — | NOT_CONFIGURED | hourly strip | n/a | matrix-only |
| K014 | Risk/travel | Mountain weather mode | New | — | — | Elevation shown only in flood | — | NOT_CONFIGURED | elevation value | n/a | matrix-only |
| K015 | Risk/travel | School/work guidance | New | — | — | Generic lifecast tips shown | — | NOT_CONFIGURED | lifecast row | n/a | matrix-only |
| K016 | Risk/travel | Visibility-hazard flag | Existing | travel drivers | visibility bands | Live payload | Open-Meteo | COMPUTED | — | test_providers | matrix-only |
| K017 | Risk/travel | AQI health personas | Existing | compare health text | heuristic bands | Estimated AQI | WeatherGPT | ESTIMATED | — | test_api | matrix-only |
| K018 | Risk/travel | Confidence disclaimers | Existing | ESTIMATED chips | disclaimer strings | — | — | STATIC | — | test_risk_engine | README |
| D001 | Disaster intel | USGS earthquakes live | Existing | Severe list + GIS + globe | disasters.py | USGS FDSN | USGS | LIVE | empty msg | test_providers | README |
| D002 | Disaster intel | Magnitude/depth/place/time | Existing | quake rows | USGS fields | USGS | USGS | LIVE | — | test_providers | matrix-only |
| D003 | Disaster intel | Tsunami-flagged India filter | Existing | india layer | india.py window | USGS flags | USGS | COMPUTED | — | test_providers | matrix-only |
| D004 | Disaster intel | Felt reports | Existing | quake rows (felt) | USGS felt field | USGS | USGS | LIVE | — | test_providers | matrix-only |
| D005 | Disaster intel | EONET wildfires live | Existing | Severe list + GIS + globe | disasters.py | NASA EONET | NASA | LIVE | empty msg | test_providers | README |
| D006 | Disaster intel | Fire title/date/satellite | Existing | fire rows | EONET fields | NASA EONET | NASA | LIVE | — | test_providers | matrix-only |
| D007 | Disaster intel | GDACS global feed | Existing | Severe cards | gdacs.py | GDACS API | GDACS | LIVE | empty msg | test_providers | README |
| D008 | Disaster intel | GDACS India filter | Existing | india focus + Severe note | near_india | GDACS | GDACS | COMPUTED | — | test_providers | matrix-only |
| D009 | Disaster intel | Cyclone DEMO track | Existing | map line + severe card | cyclone_track | Illustrative | WeatherGPT | DEMO | — | test_api | README |
| D010 | Disaster intel | Cyclone live track | New | — | — | No live cyclone feed wired | — | NOT_CONFIGURED | DEMO shown | n/a | matrix-only |
| D011 | Disaster intel | Forecast cone | New | — | — | No cone data wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| D012 | Disaster intel | Wind radii/pressure/intensity | New | — | — | No live cyclone obs wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| D013 | Disaster intel | Landfall estimate | New | — | — | No live cyclone wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| D014 | Disaster intel | FloodWatch proxy | New | Severe flood card | flood.py rain+elev | OM rain + elevation | Open-Meteo | COMPUTED | — | test_expansion | README |
| D015 | Disaster intel | Flood timeline 24h | New | flood card data | hourly probs | Open-Meteo | Open-Meteo | COMPUTED | — | test_expansion | matrix-only |
| D016 | Disaster intel | Landslide layer | New | — | — | Needs soil/slope data | — | NOT_CONFIGURED | rain proxy | n/a | matrix-only |
| D017 | Disaster intel | Drought view | New | — | — | ERA5 totals shown yearly | OM Archive | NOT_CONFIGURED | yearly rows | n/a | matrix-only |
| D018 | Disaster intel | Quake/fire chat answers | Existing | quake/fire intents | disasters.* | USGS/EONET | USGS/NASA | LIVE | honest fallback | test_chat | AI_AGENT |
| EV001 | Evacuation/emergency | Emergency services search | New | Severe services card | places.py Overpass | OSM Overpass | OSM | LIVE | empty msg | test_expansion | README |
| EV002 | Evacuation/emergency | Hospitals/police/fire/assembly | New | grouped list + distances | haversine sort | OSM tags | OSM | LIVE | — | test_expansion | matrix-only |
| EV003 | Evacuation/emergency | Shelter chat answers | New | shelter intent | places.py | OSM Overpass | OSM | LIVE | 112 message | test_expansion | AI_AGENT |
| EV004 | Evacuation/emergency | Readiness builder | Existing | BlueprintBuilder | inputs + live risk | User + live risk | WeatherGPT | COMPUTED | — | browser QA | README |
| EV005 | Evacuation/emergency | Preparedness tips | Existing | Severe static card | curated text | General guidance | WeatherGPT | STATIC | — | browser QA | matrix-only |
| EV006 | Evacuation/emergency | Emergency contacts dialog | Existing | EmergencyContacts | STATIC numbers | Published helplines | Govt (public) | STATIC | — | browser QA | matrix-only |
| EV007 | Evacuation/emergency | 112/1078 quick dial | Existing | Severe chips | tel: links | Published helplines | Govt (public) | STATIC | — | browser QA | matrix-only |
| EV008 | Evacuation/emergency | Evacuation routing engine | New | — | — | No OSRM routing wired | — | NOT_CONFIGURED | shelter list | n/a | matrix-only |
| EV009 | Evacuation/emergency | Alternate routes | New | — | — | No routing wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EV010 | Evacuation/emergency | Blocked-road layer | New | — | — | No closure feed wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EV011 | Evacuation/emergency | Flood-aware routing | New | — | — | No routing wired | — | NOT_CONFIGURED | flood proxy | n/a | matrix-only |
| EV012 | Evacuation/emergency | Hospital routing | New | — | — | No routing wired | — | NOT_CONFIGURED | distances shown | n/a | matrix-only |
| EV013 | Evacuation/emergency | Route ETA/risk/confidence | New | — | — | No routing wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EV014 | Evacuation/emergency | Shareable route link | New | — | — | No routes to share | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EV015 | Evacuation/emergency | Printable evacuation plan | New | — | — | Checklist printable via browser | — | NOT_CONFIGURED | brief modal | n/a | matrix-only |
| EV016 | Evacuation/emergency | Browser notifications | Existing | Notify me button | Notification API | Browser | Browser | LIVE | — | browser QA | matrix-only |
| EV017 | Evacuation/emergency | Voice broadcast | Existing | Broadcast button | speechEngine | Web Speech | Browser | LIVE | — | browser QA | README |
| EV018 | Evacuation/emergency | Visual emergency mode | New | — | — | Ticker + red chips cover role | — | NOT_CONFIGURED | ticker/banner | n/a | matrix-only |
| EV019 | Evacuation/emergency | Countdown timer | New | — | — | No countdown wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EV020 | Evacuation/emergency | Acknowledgement log | New | — | — | No log wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| AG001 | Agriculture | 6-crop selector | Existing | crop buttons | CROPS map | Curated agronomy | WeatherGPT | STATIC | — | test_api | README |
| AG002 | Agriculture | Irrigation guidance | Existing | irrigation card | rain-rule text | Live rain + rules | WeatherGPT | COMPUTED | — | test_api | README |
| AG003 | Agriculture | Spray timing | Existing | spray card | wind/rain rules | Live wind + rain | WeatherGPT | COMPUTED | — | test_api | README |
| AG004 | Agriculture | Harvest window | Existing | harvest card | dry-spell rule | Live rain | WeatherGPT | COMPUTED | — | test_api | README |
| AG005 | Agriculture | Growth stage label | Existing | stage line | crop table | Curated table | WeatherGPT | STATIC | — | test_api | matrix-only |
| AG006 | Agriculture | District weather context | Existing | district line | live fetch | Live payload | Open-Meteo | LIVE | — | browser QA | matrix-only |
| AG007 | Agriculture | Lightning field risk | Existing | damini proxy line | rain+humidity rule | Live values | WeatherGPT | COMPUTED | — | test_api | matrix-only |
| AG008 | Agriculture | Suitability score | Existing | score display | heuristic | Live values | WeatherGPT | COMPUTED | — | test_api | matrix-only |
| AG009 | Agriculture | Voice advisory (Hindi) | Existing | listen button | speechEngine | Web Speech | Browser | LIVE | — | browser QA | README |
| AG010 | Agriculture | Agri chat answers | Existing | farmer persona | crop_advisory | Live weather | WeatherGPT | COMPUTED | — | test_chat | AI_AGENT |
| AG011 | Agriculture | Crop-stage selector | New | — | — | Fixed stage per crop | — | NOT_CONFIGURED | fixed stage | n/a | matrix-only |
| AG012 | Agriculture | Sowing advisory | New | — | — | Generic guidance only | — | NOT_CONFIGURED | irrigation card | n/a | matrix-only |
| AG013 | Agriculture | Fertilizer timing | New | — | — | Not wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| AG014 | Agriculture | Soil moisture data | New | — | — | No soil feed wired | — | NOT_CONFIGURED | rain proxy | n/a | matrix-only |
| AG015 | Agriculture | Evapotranspiration | New | — | — | Not computed | — | NOT_CONFIGURED | — | n/a | matrix-only |
| AG016 | Agriculture | Disease model | New | — | — | Humidity heuristic only | — | NOT_CONFIGURED | spray card | n/a | matrix-only |
| SO001 | Solar/energy | Daily kWh estimate | New | solar card | solar.py | Live UV + cloud | WeatherGPT | ESTIMATED | — | test_expansion | README |
| SO002 | Solar/energy | Peak sun hours | New | solar card | solar.py | Live UV + cloud | WeatherGPT | ESTIMATED | — | test_expansion | matrix-only |
| SO003 | Solar/energy | Formula transparency | New | solar card text | formula string | Documented | WeatherGPT | STATIC | — | test_expansion | matrix-only |
| SO004 | Solar/energy | Custom array size | New | fixed 1 kW | rated_kw param | User/API param | — | NOT_CONFIGURED | 1 kW shown | n/a | matrix-only |
| SO005 | Solar/energy | Hourly solar graph | New | — | — | UV curve shown instead | — | NOT_CONFIGURED | UV value | n/a | matrix-only |
| SO006 | Solar/energy | Sunshine duration | New | daylight hours shown | sun math | Live sun times | Open-Meteo | COMPUTED | — | test_expansion | matrix-only |
| SO007 | Solar/energy | Cloud impact shown | New | proxy text | cloud input | Live cloud | Open-Meteo | COMPUTED | — | test_expansion | matrix-only |
| SO008 | Solar/energy | Solar chat answers | New | solar intent | solar_estimate | Live UV + cloud | WeatherGPT | ESTIMATED | — | test_expansion | AI_AGENT |
| SO009 | Solar/energy | Panel config input UI | New | — | — | API param only | — | NOT_CONFIGURED | fixed 1 kW | n/a | matrix-only |
| SO010 | Solar/energy | Energy scenario plans | New | — | — | No scenarios wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| LC001 | LifeCast | Umbrella advice | New | lifecast row | rain threshold | Live rain prob | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC002 | LifeCast | UV/clothing advice | New | lifecast row | uv/temp bands | Live UV + temp | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC003 | LifeCast | Hydration/heat advice | New | lifecast row | heat bands | Live temp | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC004 | LifeCast | Cold advice | New | lifecast row | cold bands | Live temp | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC005 | LifeCast | Wind/visibility advice | New | lifecast row | wind/vis bands | Live values | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC006 | LifeCast | Commute summary | New | — | — | Covered by travel engine | — | NOT_CONFIGURED | travel score | n/a | matrix-only |
| LC007 | LifeCast | Sleep guidance | New | — | — | No sleep data wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| LC008 | LifeCast | Health-condition personalization | New | — | — | Deliberately not inferred | — | NOT_CONFIGURED | generic tips | n/a (policy) | matrix-only |
| LC009 | LifeCast | Pollen data | New | — | — | No pollen feed wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| LC010 | LifeCast | School guidance | New | — | — | Generic tips only | — | NOT_CONFIGURED | lifecast row | n/a | matrix-only |
| LC011 | LifeCast | Elderly guidance | New | blueprint path | checklist branch | User inputs | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| LC012 | LifeCast | Family guidance | New | blueprint path | checklist branch | User inputs | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| RD001 | RoadWatch/trip | Visibility road flag | New | travel drivers | visibility bands | Live payload | Open-Meteo | COMPUTED | — | test_providers | matrix-only |
| RD002 | RoadWatch/trip | Wind road flag | New | travel drivers | wind bands | Live payload | Open-Meteo | COMPUTED | — | test_providers | matrix-only |
| RD003 | RoadWatch/trip | Rain road flag | New | travel drivers | rain bands | Live payload | Open-Meteo | COMPUTED | — | test_providers | matrix-only |
| RD004 | RoadWatch/trip | Trip safety score | Existing | compare + risk line | travel_safety | Weather+risk+alerts | WeatherGPT | COMPUTED | — | test_providers | README |
| RD005 | RoadWatch/trip | Destination planner UI | New | — | — | travel endpoint covers trips | — | NOT_CONFIGURED | travel endpoint | n/a | matrix-only |
| RD006 | RoadWatch/trip | Route weather along path | New | — | — | No route engine wired | — | NOT_CONFIGURED | compare cities | n/a | matrix-only |
| RD007 | RoadWatch/trip | Alternate dates | New | — | — | 7-day shown; no optimizer | — | NOT_CONFIGURED | 7-day rows | n/a | matrix-only |
| RD008 | RoadWatch/trip | Best departure window | New | — | — | Hourly shown; no optimizer | — | NOT_CONFIGURED | hourly strip | n/a | matrix-only |
| RD009 | RoadWatch/trip | Stop/emergency locations | New | places panel | emergency_places | OSM Overpass | OSM | LIVE | — | test_expansion | matrix-only |
| RD010 | RoadWatch/trip | Packing list | New | — | — | Lifecast covers basics | — | NOT_CONFIGURED | lifecast tips | n/a | matrix-only |
| RD011 | RoadWatch/trip | Marine route leg | New | — | — | Marine panel covers seas | — | NOT_CONFIGURED | marine panel | n/a | matrix-only |
| RD012 | RoadWatch/trip | Mountain mode | New | — | — | Elevation in flood only | — | NOT_CONFIGURED | elevation value | n/a | matrix-only |
| RD013 | RoadWatch/trip | Real-time closures | New | — | — | No closure feed wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| RD014 | RoadWatch/trip | Bridge/tunnel status | New | — | — | No structure data wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| RD015 | RoadWatch/trip | Accident-risk context | New | — | — | Flags imply risk only | — | NOT_CONFIGURED | travel drivers | n/a | matrix-only |
| RD016 | RoadWatch/trip | Travel ETA | New | — | — | No routing wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| CP001 | Compare | Two-city compare | Existing | compare panel | compare_places | Live × 2 | Open-Meteo | LIVE | — | test_api | README |
| CP002 | Compare | Temp/humidity/AQI rows | Existing | compare rows | live values | Live payloads | Open-Meteo | LIVE | — | test_api | README |
| CP003 | Compare | Wind row | Existing | wind row | live values | Live payloads | Open-Meteo | LIVE | — | browser QA | matrix-only |
| CP004 | Compare | Risk per city | Existing | risk row | risk per city | Computed | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| CP005 | Compare | Alerts per city | Existing | alerts row | filtered alerts | Computed | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| CP006 | Compare | Preset pairs | Existing | preset chips | fixed pairs | Curated list | WeatherGPT | STATIC | — | browser QA | matrix-only |
| CP007 | Compare | Swap cities | Existing | swap control | reload swapped | Live payloads | Open-Meteo | LIVE | — | browser QA | matrix-only |
| CP008 | Compare | Ask-AI analysis | Existing | ask button | compare intent | Live payloads | Open-Meteo | LIVE | — | test_chat | AI_AGENT |
| CP009 | Compare | Model-vs-model compare | New | — | — | Blend vs GFS shown in NWP | — | NOT_CONFIGURED | NWP delta | n/a | matrix-only |
| CP010 | Compare | Date-vs-date compare | New | — | — | ERA5 yearly shown in climate | — | NOT_CONFIGURED | yearly table | n/a | matrix-only |
| CP011 | Compare | Climate compare | New | — | — | Yearly table covers years | — | NOT_CONFIGURED | yearly rows | n/a | matrix-only |
| CP012 | Compare | Downloadable comparison | New | — | — | JSON/CSV on dashboard only | — | NOT_CONFIGURED | dashboard export | n/a | matrix-only |
| AI001 | Chat/AI agent | Intent routing (14 intents) | Existing | chat engine | chat.answer | Query keywords | WeatherGPT | COMPUTED | — | test_chat | AI_AGENT |
| AI002 | Chat/AI agent | Location extraction | Existing | location_name | extract_place | Gazetteer+native+regex | WeatherGPT | COMPUTED | New Delhi fallback | test_chat | AI_AGENT |
| AI003 | Chat/AI agent | Tool registry (19 tools) | Existing | agent panel link | agent_tools.py | Registry metadata | WeatherGPT | STATIC | — | test_api | AI_AGENT |
| AI004 | Chat/AI agent | Weather answers | Existing | weather cards | get_weather | Open-Meteo | Open-Meteo | LIVE | SIMULATED | test_chat | AI_AGENT |
| AI005 | Chat/AI agent | AQI answers | Existing | AQI intent | get_air_quality | OM Air Quality | Open-Meteo | LIVE | ESTIMATED text | test_chat | AI_AGENT |
| AI006 | Chat/AI agent | Marine answers | Existing | marine intent | marine_advisory | OM Marine | Open-Meteo | LIVE | ESTIMATED text | test_chat | AI_AGENT |
| AI007 | Chat/AI agent | Aviation answers | Existing | aviation intent | live-first briefing | NOAA ADDS | NOAA | LIVE | STATIC text | test_chat | AI_AGENT |
| AI008 | Chat/AI agent | Agri answers | Existing | farmer persona | crop_advisory | Live weather | WeatherGPT | COMPUTED | — | test_chat | AI_AGENT |
| AI009 | Chat/AI agent | Alert answers | Existing | alert intent | active_alerts | Telemetry scan | WeatherGPT | COMPUTED | — | test_chat | AI_AGENT |
| AI010 | Chat/AI agent | Climate answers | Existing | climate intent | climate_reference | Static + ERA5 text | Mixed | STATIC | — | test_intents | AI_AGENT |
| AI011 | Chat/AI agent | Travel answers | Existing | travel intent | risk + weather | Live payload | Open-Meteo | COMPUTED | — | test_intents | AI_AGENT |
| AI012 | Chat/AI agent | Quake/fire answers | Existing | quake/fire intents | disasters.* | USGS/EONET | USGS/NASA | LIVE | honest fallback | test_chat | AI_AGENT |
| AI013 | Chat/AI agent | Flood/shelter/solar answers | New | new intents | flood/places/solar | Live inputs | Mixed | COMPUTED | honest fallback | test_expansion | AI_AGENT |
| AI014 | Chat/AI agent | Persona-aware replies | Existing | persona select | persona routing | Same data | WeatherGPT | COMPUTED | — | test_chat | AI_AGENT |
| AI015 | Chat/AI agent | Suggested prompts | Existing | prompt chips | curated lists | Curated text | WeatherGPT | STATIC | — | browser QA | matrix-only |
| AI016 | Chat/AI agent | Capability mode chips | Existing | mode chips | preset queries | Curated text | WeatherGPT | STATIC | — | browser QA | matrix-only |
| AI017 | Chat/AI agent | No-hallucination tests | Existing | — | payload assertions | Test harness | — | STATIC | — | test_hardening | AI_AGENT |
| AI018 | Chat/AI agent | Honest failure replies | Existing | error bubble | chat() try/except | — | — | COMPUTED | — | test_hardening | AI_AGENT |
| VM001 | Voice/multilingual | 11-language UI switch | Existing | Navbar select | TEMPLATES map | Curated strings | WeatherGPT | STATIC | — | browser QA | README |
| VM002 | Voice/multilingual | Script detection (8 scripts) | Existing | auto detect | langid ranges | Unicode ranges | — | COMPUTED | — | test_langid | AI_AGENT |
| VM003 | Voice/multilingual | Romanized vocab scoring | Existing | auto detect | langid vocab | Curated wordlists | WeatherGPT | COMPUTED | — | test_langid | AI_AGENT |
| VM004 | Voice/multilingual | Confidence + intent output | Existing | — (API) | analyze_query | Deterministic | WeatherGPT | COMPUTED | — | test_langid | AI_AGENT |
| VM005 | Voice/multilingual | /api/language/analyze | Existing | — (API) | endpoint | Analyzer | WeatherGPT | COMPUTED | — | test_langid | matrix-only |
| VM006 | Voice/multilingual | Per-language templates | Existing | chat replies | TEMPLATES | Curated strings | WeatherGPT | STATIC | — | test_chat | AI_AGENT |
| VM007 | Voice/multilingual | Transliterated place names | Existing | native map | NATIVE_PLACES | Curated map | WeatherGPT | STATIC | — | test_chat | matrix-only |
| VM008 | Voice/multilingual | STT microphone | Existing | mic button + waves | speechEngine | Web Speech | Browser | LIVE | typed fallback | browser QA | README |
| VM009 | Voice/multilingual | TTS replies/audio | Existing | Listen + Audio buttons | speechEngine | Web Speech | Browser | LIVE | — | browser QA | README |
| VM010 | Voice/multilingual | Voice language mapping | Existing | BCP47 map | voice.js | BCP-47 tags | Browser | STATIC | — | browser QA | matrix-only |
| VM011 | Voice/multilingual | Unsupported-browser note | Existing | fallback text | support flags | Capability detect | Browser | STATIC | — | browser QA | matrix-only |
| VM012 | Voice/multilingual | Continuous listening | New | — | — | One-shot only (browser limits) | — | NOT_CONFIGURED | mic toggle | n/a | matrix-only |
| VM013 | Voice/multilingual | Bhashini integration | New | — | — | Not wired; browser speech used | — | NOT_CONFIGURED | Web Speech | n/a | matrix-only |
| VM014 | Voice/multilingual | Native-script quality claim | New | — | — | Template quality as shipped | — | NOT_CONFIGURED | — | n/a | matrix-only |
| VM015 | Voice/multilingual | Chat language indicator | Existing | LANG chip | language state | UI state | — | STATIC | — | browser QA | matrix-only |
| VM016 | Voice/multilingual | Engine honesty chip | Existing | TOOL-GROUNDED chip | engine endpoint | Runtime check | WeatherGPT | COMPUTED | — | test_api | matrix-only |
| SV001 | Saved/observatory | Save place chips | Existing | Navbar + Saved tab | localStorage | User data | Browser | STATIC | — | browser QA | README |
| SV002 | Saved/observatory | Remove place | Existing | ✕ buttons | storage update | User data | Browser | STATIC | — | browser QA | matrix-only |
| SV003 | Saved/observatory | Live preview per place | Existing | preview cards | per-place fetch | Live payloads | Open-Meteo | LIVE | error text | browser QA | matrix-only |
| SV004 | Saved/observatory | Saved-place alert touch | Existing | alert note | filtered alerts | Computed | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| SV005 | Saved/observatory | Last-GPS label | Existing | GPS chip | localStorage label | Reverse result | BigDataCloud | STATIC | — | browser QA | matrix-only |
| SV006 | Saved/observatory | Hierarchy breadcrumb | New | dashboard chips | country/state fields | Gazetteer | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| SV007 | Saved/observatory | Observatory levels (C→S→D→C→L) | New | breadcrumb covers 3 of 5 | partial hierarchy | Gazetteer | WeatherGPT | NOT_CONFIGURED | breadcrumb | n/a | matrix-only |
| SV008 | Saved/observatory | Station search (AWS) | New | — | — | No station feed wired | — | NOT_CONFIGURED | city search | n/a | matrix-only |
| SV009 | Saved/observatory | Station status/stale flags | New | — | — | No stations wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| SV010 | Saved/observatory | Custom coordinates input | New | — | — | GPS + map supply coords | — | NOT_CONFIGURED | GPS coords | n/a | matrix-only |
| SV011 | Saved/observatory | Recent places | New | — | — | Saved list covers recency | — | NOT_CONFIGURED | saved list | n/a | matrix-only |
| SV012 | Saved/observatory | Privacy explanation | Existing | Saved tab text | static copy | Policy text | WeatherGPT | STATIC | — | browser QA | SECURITY |
| NT001 | Notifications/broadcast | In-app ticker | Existing | red ticker | top alert | Computed top alert | WeatherGPT | COMPUTED | hidden | browser QA | README |
| NT002 | Notifications/broadcast | Browser notify opt-in | Existing | Notify me button | Notification API | Browser | Browser | LIVE | — | browser QA | matrix-only |
| NT003 | Notifications/broadcast | One-shot top-alert notify | Existing | permission flow | load() hook | Computed top alert | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| NT004 | Notifications/broadcast | Voice broadcast | Existing | Broadcast button | speechEngine | Web Speech | Browser | LIVE | — | browser QA | README |
| NT005 | Notifications/broadcast | Severity filtering | Existing | filter pills | severity state | Computed | WeatherGPT | COMPUTED | — | browser QA | matrix-only |
| NT006 | Notifications/broadcast | Quiet hours | New | — | — | No scheduler wired | — | NOT_CONFIGURED | manual toggle | n/a | matrix-only |
| NT007 | Notifications/broadcast | Notification history | New | — | — | No log wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| NT008 | Notifications/broadcast | Read/unread states | New | — | — | No store wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| NT009 | Notifications/broadcast | Emergency banner mode | New | — | — | Ticker covers role | — | NOT_CONFIGURED | ticker | n/a | matrix-only |
| NT010 | Notifications/broadcast | Official bulletin links | New | footer/docs links | IMD/NDMA URLs | Public portals | Govt (public) | STATIC | — | browser QA | matrix-only |
| PS001 | Personas/settings/theme | 6 personas | Existing | persona select | persona routing | Same data, new framing | WeatherGPT | STATIC | — | test_chat | README |
| PS002 | Personas/settings/theme | Persona prompts | Existing | prompt lists | curated lists | Curated text | WeatherGPT | STATIC | — | browser QA | matrix-only |
| PS003 | Personas/settings/theme | Persona context rail | Existing | profile line | persona label | UI state | — | STATIC | — | browser QA | matrix-only |
| PS004 | Personas/settings/theme | Student persona | New | — | — | Covered by Citizen | — | NOT_CONFIGURED | Citizen | n/a | matrix-only |
| PS005 | Personas/settings/theme | Traveler/Driver personas | New | — | — | Covered by travel engine | — | NOT_CONFIGURED | travel score | n/a | matrix-only |
| PS006 | Personas/settings/theme | Pilot/Fisherman personas | New | — | — | Covered by Aviation/Marine | — | NOT_CONFIGURED | sector tabs | n/a | matrix-only |
| PS007 | Personas/settings/theme | Responder/planner/admin | New | — | — | Covered by Disaster Mgr | — | NOT_CONFIGURED | severe desk | n/a | matrix-only |
| PS008 | Personas/settings/theme | Units toggle (°C/°F) | New | — | — | Metric-only display | — | NOT_CONFIGURED | °C shown | n/a | matrix-only |
| PS009 | Personas/settings/theme | Theme engine (condition) | New | — | — | Single dark theme + globe tint | — | NOT_CONFIGURED | globe tint | n/a | matrix-only |
| PS010 | Personas/settings/theme | Reduced-motion respect | Existing | media query | CSS guard | — | — | STATIC | — | browser QA | matrix-only |
| PS011 | Personas/settings/theme | Auto-refresh interval pref | New | — | — | Fixed 10-min toggle | — | NOT_CONFIGURED | fixed toggle | n/a | matrix-only |
| PS012 | Personas/settings/theme | Notification prefs UI | New | — | — | Single opt-in button | — | NOT_CONFIGURED | opt-in | n/a | matrix-only |
| PS013 | Personas/settings/theme | Export preferences | New | — | — | No prefs export wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| PS014 | Personas/settings/theme | Reset preferences | New | — | — | No reset wired | — | NOT_CONFIGURED | clear storage | n/a | matrix-only |
| EX001 | Export/offline | JSON export | New | dashboard buttons | exportData | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| EX002 | Export/offline | CSV export | New | dashboard buttons | toCSV() | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| EX003 | Export/offline | Printable brief/report | Existing | Brief modal + print | payload text | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| EX004 | Export/offline | Alert report export | New | — | — | Dashboard export covers data | — | NOT_CONFIGURED | JSON export | n/a | matrix-only |
| EX005 | Export/offline | Climate report export | New | — | — | Dashboard export covers data | — | NOT_CONFIGURED | JSON export | n/a | matrix-only |
| EX006 | Export/offline | Map snapshot export | New | — | — | No snapshot wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EX007 | Export/offline | Chart image export | New | — | — | SVG inline; no PNG wired | — | NOT_CONFIGURED | — | n/a | matrix-only |
| EX008 | Export/offline | Offline banner | New | — | — | Error notices cover role | — | NOT_CONFIGURED | error states | n/a | matrix-only |
| EX009 | Export/offline | Last-known STALE badge | New | — | — | Fallback labels cover role | — | NOT_CONFIGURED | FALLBACK chips | n/a | matrix-only |
| EX010 | Export/offline | Connection status | New | — | — | Failure notices cover role | — | NOT_CONFIGURED | error states | n/a | matrix-only |
| EX011 | Export/offline | Reduced-data mode | New | — | — | Lazy chunks cover role | — | NOT_CONFIGURED | code splitting | n/a | matrix-only |
| EX012 | Export/offline | Provenance in exports | New | footer() helper | source+time | Live payload | Open-Meteo | COMPUTED | — | browser QA | matrix-only |
| PH001 | Provider health/provenance | Health endpoint | Existing | ProvidersPanel | providers.py | Runtime probes | Mixed | LIVE | metadata mode | test_providers | README |
| PH002 | Provider health/provenance | Per-provider latency | Existing | latency column | probe timing | Measured | — | COMPUTED | — | test_providers | matrix-only |
| PH003 | Provider health/provenance | Checked-at timestamp | Existing | checked_at_ist | IST clock | Server clock | — | COMPUTED | — | test_providers | matrix-only |
| PH004 | Provider health/provenance | DEGRADED on slow probes | Existing | tone mapping | >8s rule | Measured latency | — | COMPUTED | — | browser QA | matrix-only |
| PH005 | Provider health/provenance | License/attribution col | Existing | coverage text | registry metadata | Provider terms | Respective | STATIC | — | test_providers | THIRD_PARTY |
| PH006 | Provider health/provenance | Fallback column | Existing | policy text | fallback design | Design doc | WeatherGPT | STATIC | — | test_providers | matrix-only |
| PH007 | Provider health/provenance | Last-failure detail | Existing | error field | probe errors | Runtime | — | COMPUTED | — | test_providers | matrix-only |
| PH008 | Provider health/provenance | Auth-requirement flag | Existing | needs_key column | registry metadata | Provider terms | Respective | STATIC | — | test_providers | matrix-only |
| PH009 | Provider health/provenance | Rate-limit column | New | — | — | Documented in SECURITY | — | NOT_CONFIGURED | SECURITY doc | n/a | SECURITY |
| PH010 | Provider health/provenance | SourceBadge component | Existing | all major cards | payload fields | Each payload | Respective | LIVE | — | test_api | README |
| PH011 | Provider health/provenance | Provenance JSON shape | Existing | export footer | 9-field shape | Live payload | Respective | COMPUTED | — | browser QA | ARCHITECTURE |
| PH012 | Provider health/provenance | Freshness wording | Existing | updated/ago labels | timestamps | Server + provider | Respective | COMPUTED | — | test_api | matrix-only |
| PH013 | Provider health/provenance | Confidence wording | Existing | confidence field | provider-dependent | Provider docs | Respective | ESTIMATED | — | test_api | matrix-only |
| PH014 | Provider health/provenance | Honesty regression scan | Existing | — | forbidden-phrase scan | Source scan | — | STATIC | — | test_honesty | SECURITY |
| SE001 | Security | No secrets in repo | Existing | — | env-only keys | Git history | — | STATIC | — | secret scan | SECURITY |
| SE002 | Security | CORS allowlist | Existing | — | middleware | Env config | — | STATIC | — | test_cors_config | SECURITY |
| SE003 | Security | Tiered rate limits | Existing | — | middleware tiers | In-memory | — | STATIC | — | test_hardening | SECURITY |
| SE004 | Security | Query length cap | Existing | — | pydantic max 500 | Validation | — | STATIC | — | test_hardening | SECURITY |
| SE005 | Security | Coordinate validation | Existing | — | lat/lon bounds | Validation | — | STATIC | — | test_expansion | SECURITY |
| SE006 | Security | Safe markdown (no raw HTML) | Existing | react-markdown | default escape | — | — | STATIC | — | code review | SECURITY |
| SE007 | Security | Guarded endpoints (502s) | Existing | error states | try/except | — | — | STATIC | — | test_hardening | SECURITY |
| SE008 | Security | No PII logging | Existing | — | no coord logs | Code audit | — | STATIC | — | code review | SECURITY |
| SE009 | Security | SSRF-safe fetching | Existing | — | fixed URLs only | No user URLs | — | STATIC | — | code review | SECURITY |
| SE010 | Security | Prompt-injection safe replies | Existing | — | templates only | No LLM echo | — | STATIC | — | test_hardening | SECURITY |
| SE011 | Security | Security headers | New | — | — | Vercel defaults only | — | NOT_CONFIGURED | platform TLS | n/a | matrix-only |
| SE012 | Security | Authenticated admin routes | New | — | — | Public read-only demo | — | NOT_CONFIGURED | none needed | n/a | matrix-only |
| PQ001 | Platform quality | Lazy Leaflet chunk | Existing | GISMap lazy | code split | — | — | STATIC | — | build | README |
| PQ002 | Platform quality | Lazy 3D chunk (~560KB) | Existing | Earth3D lazy | code split | — | — | STATIC | — | build | README |
| PQ003 | Platform quality | Entry ~374KB budget | Existing | index chunk | code split | — | — | STATIC | — | build | matrix-only |
| PQ004 | Platform quality | No new dependencies | Existing | 2 added total | three+topojson | MIT/BSD | — | STATIC | — | build | THIRD_PARTY |
| PQ005 | Platform quality | Keyboard/ARIA/focus | Existing | labels/roles | semantic HTML | — | — | STATIC | — | browser QA | matrix-only |
| PQ006 | Platform quality | Contrast/readability | Existing | token palette | — | — | — | STATIC | — | browser QA | matrix-only |
| PQ007 | Platform quality | Reduced motion | Existing | media query | CSS guard | — | — | STATIC | — | browser QA | matrix-only |
| PQ008 | Platform quality | Screen-reader data paths | Existing | lists/tables | text alternatives | — | — | STATIC | — | browser QA | matrix-only |
| PQ009 | Platform quality | Mobile overflow audit | Existing | 390/430 screens | responsive CSS | — | — | STATIC | — | browser QA | matrix-only |
| PQ010 | Platform quality | Touch targets | Existing | 2.5rem controls | CSS minimums | — | — | STATIC | — | browser QA | matrix-only |
| DC001 | Docs/SIH | README accuracy | Existing | — | — | Verified content | — | STATIC | — | doc review | README |
| DC002 | Docs/SIH | Architecture doc | Existing | — | — | Verified content | — | STATIC | — | doc review | ARCHITECTURE |
| DC003 | Docs/SIH | Data/agent/security docs | Existing | — | — | Verified content | — | STATIC | — | doc review | mixed |
| DC004 | Docs/SIH | Demo/QA/PPT/mapping docs | Existing | — | — | Verified content | — | STATIC | — | doc review | mixed |
| DC005 | Docs/SIH | Provenance/attribution/third-party | Existing | — | — | Verified content | — | STATIC | — | doc review | mixed |
| DC006 | Docs/SIH | This 464 matrix | New | — | — | This file | — | STATIC | — | test_coverage | matrix-only |

**Status totals (measured): LIVE 129 · COMPUTED 95 · STATIC 87 · NOT_CONFIGURED 142 · ESTIMATED 8 · DEMO 3 = 464.**
OFFICIAL appears as a composite source label (e.g. "OFFICIAL third-party") on feed rows; FALLBACK/SIMULATED appear in the Fallback column where a backup path exists.

