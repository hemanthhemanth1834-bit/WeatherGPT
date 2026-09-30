"""Indian authoritative weather data sources registry (SIH 2026 addition).

Design integrations are documented; no scraping, no fabricated government warnings.
"""
from typing import Dict, Any


def get_indian_sources_status() -> Dict[str, Any]:
    return {
        "sources": [
            {
                "name": "IMD (India Meteorological Department)",
                "type": "API-DEPENDENT",
                "portal": "https://mausam.imd.gov.in/ / https://www.imd.gov.in/",
                "integration": "Live public bulletins to be consumed via official feeds where licensed; current alerts in this app are computed from live telemetry against IMD-style thresholds and are NOT official IMD bulletins.",
            },
            {
                "name": "MOSDAC / ISRO",
                "type": "NOT CONFIGURED",
                "portal": "https://www.mosdac.gov.in/",
                "integration": "Interface ready; requires data access credentials. See satellite module.",
            },
            {
                "name": "INCOIS (Ocean State Forecasts)",
                "type": "MODEL-DEPENDENT estimate",
                "portal": "https://incois.gov.in/",
                "integration": "Marine advisories in this app use live coastal wind telemetry + empirical wave model; labelled as estimates, not official INCOIS bulletins.",
            },
            {
                "name": "Open-Meteo (global NWP + geocoding, no key required)",
                "type": "LIVE",
                "portal": "https://open-meteo.com/",
                "integration": "Active: current/hourly/daily forecast + geocoding. Free for non-commercial use with attribution.",
            },
        ],
        "policy": "Always display source. Never fabricate government warnings. Never scrape in violation of terms.",
    }
