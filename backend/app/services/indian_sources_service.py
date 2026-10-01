"""Indian authoritative weather data sources registry.

Every entry reflects probed reality (portal reachability checked Sep–Oct 2026;
guessed API paths returned 404, so no open API is claimed). No scraping,
no fabricated government warnings.
"""
from typing import Any, Dict


def get_indian_sources_status() -> Dict[str, Any]:
    return {
        "sources": [
            {
                "name": "IMD (India Meteorological Department)",
                "type": "NOT CONFIGURED",
                "portal": "https://mausam.imd.gov.in/",
                "integration": "Portal reachable, but no documented public data API "
                               "was found (probed paths returned 404). Computed alerts "
                               "in this app use live telemetry against IMD-style "
                               "thresholds and are NOT official IMD bulletins.",
            },
            {
                "name": "MOSDAC / ISRO",
                "type": "NOT CONFIGURED",
                "portal": "https://www.mosdac.gov.in/",
                "integration": "Portal reachable, but data access requires "
                               "credentials. Satellite needs are covered by NASA "
                               "GIBS links instead.",
            },
            {
                "name": "INCOIS (Ocean State Forecasts)",
                "type": "NOT CONFIGURED",
                "portal": "https://incois.gov.in/",
                "integration": "Portal reachable, but no open feed found. Marine "
                               "state comes from the live Open-Meteo wave model "
                               "(labelled LIVE/MODEL), not INCOIS bulletins.",
            },
            {
                "name": "NDMA / CWC / GSI / Bhuvan",
                "type": "NOT CONFIGURED",
                "portal": "https://ndma.gov.in/",
                "integration": "Portals only; no documented keyless API evaluated. "
                               "Emergency numbers 112/1078/1070 are published "
                               "STATIC public information in the app.",
            },
            {
                "name": "Open-Meteo (global NWP + geocoding, no key required)",
                "type": "LIVE",
                "portal": "https://open-meteo.com/",
                "integration": "Active: current/hourly/daily forecast + geocoding. "
                               "Free for non-commercial use with attribution.",
            },
        ],
        "policy": "Always display source. Never fabricate government warnings. "
                  "Never scrape in violation of terms. Never guess endpoints.",
    }
