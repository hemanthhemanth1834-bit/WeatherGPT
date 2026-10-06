"""Free/alternative capability registry and optional integration status.

This module deliberately separates:
- LIVE public integrations already usable without paid credentials.
- OPTIONAL adapters that become live only when the user supplies a real feed/file.
No demo value is reported as live.
"""
import os
from datetime import datetime, timezone

FREE_SOURCES = [
    {"name":"Open-Meteo Forecast","kind":"weather","status":"LIVE","auth":"NO KEY","url":"https://open-meteo.com/"},
    {"name":"Open-Meteo GFS","kind":"nwp","status":"LIVE","auth":"NO KEY","url":"https://open-meteo.com/en/docs/gfs-api"},
    {"name":"Open-Meteo ECMWF IFS","kind":"nwp","status":"LIVE","auth":"NO KEY","url":"https://open-meteo.com/en/docs/ecmwf-api"},
    {"name":"Open-Meteo DWD ICON","kind":"nwp","status":"LIVE","auth":"NO KEY","url":"https://open-meteo.com/en/docs"},
    {"name":"RainViewer Radar","kind":"radar","status":"LIVE","auth":"PUBLIC","url":"https://www.rainviewer.com/api/weather-maps-api.html"},
    {"name":"NASA GIBS","kind":"satellite","status":"LIVE","auth":"PUBLIC","url":"https://earthdata.nasa.gov/gibs"},
    {"name":"USGS Earthquakes","kind":"disaster","status":"LIVE","auth":"PUBLIC","url":"https://earthquake.usgs.gov/fdsnws/event/1/"},
    {"name":"NASA EONET","kind":"disaster","status":"LIVE","auth":"PUBLIC","url":"https://eonet.gsfc.nasa.gov/docs/v3"},
    {"name":"GDACS","kind":"disaster","status":"LIVE","auth":"PUBLIC","url":"https://www.gdacs.org/"},
    {"name":"NOAA Aviation Weather","kind":"aviation","status":"LIVE","auth":"PUBLIC","url":"https://aviationweather.gov/data/api/"},
    {"name":"OpenStreetMap","kind":"gis","status":"LIVE","auth":"PUBLIC","url":"https://www.openstreetmap.org/"},
    {"name":"BigDataCloud GPS reverse geocode","kind":"location","status":"LIVE","auth":"NO KEY CLIENT","url":"https://www.bigdatacloud.com/free-api"},
    {"name":"IMD District Nowcast RSS","kind":"official_warning","status":"AVAILABLE WHEN UPSTREAM RESPONDS","auth":"RSS PUBLIC","url":"https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php"},
    {"name":"IMD protected API","kind":"official","status":"NOT CONFIGURED","auth":"API ACCOUNT REQUIRED","url":"https://api.imd.gov.in/public/"},
]

OPTIONAL_ADAPTERS = [
    {"name":"WRF local/GRIB2","status":"READY","requirement":"REAL WRF output or GRIB2/NetCDF feed","free_alternative":"NOAA NOMADS GFS when WRF is unavailable"},
    {"name":"WIS2.0 / MQTT","status":"READY","requirement":"MQTT broker + real WIS2 topic/feed","free_alternative":"Mosquitto self-hosted"},
    {"name":"PostgreSQL + PostGIS","status":"READY","requirement":"PostgreSQL/PostGIS runtime","free_alternative":"PostgreSQL + PostGIS open source"},
    {"name":"Redis cache","status":"READY","requirement":"Redis-compatible server","free_alternative":"Valkey self-hosted"},
    {"name":"Ollama local NLU","status":"READY","requirement":"Local Ollama model","free_alternative":"Qwen/Gemma/Phi-family local model"},
    {"name":"PWA offline cache","status":"READY","requirement":"Browser service worker","free_alternative":"Native browser APIs"},
]

def capability_matrix():
    wrf_path = os.getenv("WRF_DATA_PATH", "").strip()
    mqtt_url = os.getenv("MQTT_BROKER_URL", "").strip()
    db_url = os.getenv("DATABASE_URL", "").strip()
    redis_url = os.getenv("REDIS_URL", "").strip()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "").strip()
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": "free-first; no paid credential required for the core weather path",
        "free_sources": FREE_SOURCES,
        "optional_adapters": [
            {**x, "status": "LIVE" if (
                (x["name"].startswith("WRF") and wrf_path) or
                (x["name"].startswith("WIS2") and mqtt_url) or
                (x["name"].startswith("PostgreSQL") and db_url) or
                (x["name"].startswith("Redis") and redis_url) or
                (x["name"].startswith("Ollama") and ollama_url)
            ) else x["status"]} for x in OPTIONAL_ADAPTERS
        ],
        "design": {
            "ui": "high-level command center with provenance-first cards",
            "motion": "CSS/React motion-safe transitions plus existing Three.js Earth",
            "3d": "Three.js globe and live markers; reduced-motion fallback",
            "offline": "PWA/service-worker architecture",
        },
    }
