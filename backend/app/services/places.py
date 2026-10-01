"""Nearby emergency facilities via OpenStreetMap Overpass API.

Free, no key (fair-use: single bounded query per call, cached 24 h).
Returns hospitals, police, fire stations, assembly points with distances.
Never invents facilities; empty areas honestly return [].
"""
from typing import Any, Dict, List

from .cache import cached

OVERPASS = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "WeatherGPT-SIH2026/2.0 (education project)"}
TTL = 86400

KINDS = (
    ("hospital", 'node["amenity"="hospital"]'),
    ("police", 'node["amenity"="police"]'),
    ("fire_station", 'node["amenity"="fire_station"]'),
    ("assembly_point", 'node["emergency"="assembly_point"]'),
)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    radius = 6371.0
    first = math.radians(lat1)
    second = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    hav = (math.sin(delta_lat / 2) ** 2
           + math.cos(first) * math.cos(second) * math.sin(delta_lon / 2) ** 2)
    return round(2 * radius * math.asin(math.sqrt(hav)), 1)


def _download(lat: float, lon: float) -> List[Dict[str, Any]]:
    from .http import http_post
    clauses = "".join(f'{sel}(around:20000,{lat},{lon});' for _, sel in KINDS)
    query = f"[out:json][timeout:20];({clauses});out body 40;"
    response = http_post(OVERPASS, data={"data": query}, headers=HEADERS, timeout=25)
    if response.status_code != 200:
        raise RuntimeError(f"Overpass HTTP {response.status_code}")
    return response.json().get("elements", [])


def emergency_places(lat: float, lon: float) -> Dict[str, Any]:
    """Facilities within ~20 km, nearest first, grouped by kind."""
    elements = cached(TTL, f"osm:{round(lat, 2)}:{round(lon, 2)}",
                      lambda: _download(lat, lon))
    grouped: Dict[str, List[Dict[str, Any]]] = {kind: [] for kind, _ in KINDS}
    for element in elements:
        tags = element.get("tags", {}) or {}
        kind = ("hospital" if tags.get("amenity") == "hospital"
                else "police" if tags.get("amenity") == "police"
                else "fire_station" if tags.get("amenity") == "fire_station"
                else "assembly_point")
        flat, flon = element.get("lat"), element.get("lon")
        if flat is None or flon is None:
            continue
        grouped[kind].append({
            "name": tags.get("name", f"Unnamed {kind.replace('_', ' ')}"),
            "kind": kind,
            "lat": flat,
            "lon": flon,
            "distance_km": _haversine_km(lat, lon, flat, flon),
        })
    for kind in grouped:
        grouped[kind].sort(key=lambda place: place["distance_km"])
        grouped[kind] = grouped[kind][:8]
    total = sum(len(items) for items in grouped.values())
    return {
        "lat": lat, "lon": lon, "facilities": grouped, "count": total,
        "radius_km": 20,
        "data_type": "OpenStreetMap points of interest (community mapped)",
        "status": "LIVE",
        "source": "Overpass API (OpenStreetMap contributors, ODbL)",
        "note": "Completeness varies by area; verify critical needs by phone (112).",
    }
