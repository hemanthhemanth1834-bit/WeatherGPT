"""Satellite weather information module (SIH 2026 addition).

No static image is ever presented as real-time imagery. All imagery links are
live tile services with acquisition time shown by the provider.
"""
from typing import Dict, Any


def get_satellite_info(lat: float = 20.0, lon: float = 78.0) -> Dict[str, Any]:
    return {
        "status": "API-DEPENDENT",
        "sources": [
            {
                "name": "NASA GIBS (Global Imagery Browse Services)",
                "type": "LIVE tile service",
                "imagery": "Terra/MODIS true-color, VIIRS daily",
                "viewer_url": "https://worldview.earthdata.nasa.gov/",
                "tile_template": "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
                "notes": "Open with NASA Worldview for acquisition timestamps. This app does not proxy imagery.",
            },
            {
                "name": "MOSDAC / ISRO (meteorological & oceanographic satellite data)",
                "type": "NOT CONFIGURED (credentials/access required)",
                "portal": "https://www.mosdac.gov.in/",
                "notes": "Interface ready. INSAT-3D/3DR products require MOSDAC data access; never scrape in violation of terms.",
            },
            {
                "name": "RainViewer radar composite (used on GIS map)",
                "type": "LIVE",
                "api": "https://api.rainviewer.com/public/weather-maps.json",
                "notes": "Live precipitation radar tiles; timestamp shown on the map control.",
            },
        ],
        "focus": {"lat": lat, "lon": lon},
        "data_type": "STATIC metadata + LIVE external services",
        "disclaimer": "Satellite imagery is served by external providers with their own update times. Verify acquisition time in the provider viewer.",
    }
