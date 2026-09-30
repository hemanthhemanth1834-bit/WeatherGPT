"""Location resolution for WeatherGPT SIH 2026. Original implementation.

Two-stage strategy:
  1. A curated built-in gazetteer of major Indian cities/districts
     (coordinates are geographic facts) for instant offline resolution.
  2. Live Open-Meteo geocoding fallback so any other place on Earth
     (including small talukas and villages) still resolves.

Saved "preferred locations" live only in the visitor's browser
(localStorage) and are never sent anywhere except as search queries.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

import requests

# Gazetteer: name -> (latitude, longitude, state, area label).
# Coordinates are public geographic facts; selection and labels are our own.
GAZETTEER: Dict[str, Tuple[float, float, str, str]] = {
    "delhi": (28.6139, 77.2090, "Delhi", "National Capital"),
    "new delhi": (28.6139, 77.2090, "Delhi", "National Capital"),
    "mumbai": (19.0760, 72.8777, "Maharashtra", "Konkan / Mumbai City"),
    "thane": (19.2183, 72.9781, "Maharashtra", "Mumbai Metro"),
    "navi mumbai": (19.0330, 73.0297, "Maharashtra", "Mumbai Metro"),
    "pune": (18.5204, 73.8567, "Maharashtra", "Western Maharashtra"),
    "nagpur": (21.1458, 79.0882, "Maharashtra", "Vidarbha"),
    "nashik": (19.9975, 73.7898, "Maharashtra", "North Maharashtra"),
    "aurangabad": (19.8762, 75.3433, "Maharashtra", "Marathwada"),
    "chhatrapati sambhajinagar": (19.8762, 75.3433, "Maharashtra", "Marathwada"),
    "solapur": (17.6599, 75.9064, "Maharashtra", "South Maharashtra"),
    "kolhapur": (16.7050, 74.2433, "Maharashtra", "South Maharashtra"),
    "amravati": (20.9374, 77.7796, "Maharashtra", "Vidarbha"),
    "bengaluru": (12.9716, 77.5946, "Karnataka", "South Karnataka"),
    "bangalore": (12.9716, 77.5946, "Karnataka", "South Karnataka"),
    "mysuru": (12.2958, 76.6394, "Karnataka", "South Karnataka"),
    "mysore": (12.2958, 76.6394, "Karnataka", "South Karnataka"),
    "mangaluru": (12.9141, 74.8560, "Karnataka", "Coastal Karnataka"),
    "mangalore": (12.9141, 74.8560, "Karnataka", "Coastal Karnataka"),
    "hubballi": (15.3647, 75.1240, "Karnataka", "North Karnataka"),
    "hubli": (15.3647, 75.1240, "Karnataka", "North Karnataka"),
    "belagavi": (15.8497, 74.4977, "Karnataka", "North Karnataka"),
    "kalaburagi": (17.3297, 76.8343, "Karnataka", "North Karnataka"),
    "hyderabad": (17.3850, 78.4867, "Telangana", "Deccan"),
    "warangal": (17.9689, 79.5941, "Telangana", "North Telangana"),
    "nizamabad": (18.6725, 78.0941, "Telangana", "North Telangana"),
    "karimnagar": (18.4386, 79.1288, "Telangana", "North Telangana"),
    "chennai": (13.0827, 80.2707, "Tamil Nadu", "Coromandel Coast"),
    "coimbatore": (11.0168, 76.9558, "Tamil Nadu", "Kongu Belt"),
    "madurai": (9.9252, 78.1198, "Tamil Nadu", "South Tamil Nadu"),
    "trichy": (10.7905, 78.7047, "Tamil Nadu", "Central Tamil Nadu"),
    "tiruchirappalli": (10.7905, 78.7047, "Tamil Nadu", "Central Tamil Nadu"),
    "salem": (11.6643, 78.1460, "Tamil Nadu", "North Tamil Nadu"),
    "kolkata": (22.5726, 88.3639, "West Bengal", "Gangetic Bengal"),
    "howrah": (22.5958, 88.2636, "West Bengal", "Kolkata Metro"),
    "siliguri": (26.7271, 88.3953, "West Bengal", "North Bengal"),
    "darjeeling": (27.0410, 88.2663, "West Bengal", "Himalayan Foothills"),
    "durgapur": (23.5204, 87.3119, "West Bengal", "South Bengal"),
    "ahmedabad": (23.0225, 72.5714, "Gujarat", "Central Gujarat"),
    "surat": (21.1702, 72.8311, "Gujarat", "South Gujarat"),
    "vadodara": (22.3072, 73.1812, "Gujarat", "Central Gujarat"),
    "rajkot": (22.3039, 70.8022, "Gujarat", "Saurashtra"),
    "bhuj": (23.2420, 69.6669, "Gujarat", "Kutch"),
    "jaipur": (26.9124, 75.7873, "Rajasthan", "Eastern Rajasthan"),
    "jodhpur": (27.0238, 74.2179, "Rajasthan", "Western Rajasthan"),
    "udaipur": (24.5854, 73.7125, "Rajasthan", "Southern Rajasthan"),
    "jaisalmer": (26.9157, 70.9083, "Rajasthan", "Thar Desert"),
    "lucknow": (26.8467, 80.9462, "Uttar Pradesh", "Awadh"),
    "kanpur": (26.4499, 80.3319, "Uttar Pradesh", "Central UP"),
    "varanasi": (25.3176, 82.9739, "Uttar Pradesh", "Eastern UP"),
    "agra": (27.1767, 78.0081, "Uttar Pradesh", "Western UP"),
    "prayagraj": (25.4358, 81.8463, "Uttar Pradesh", "Eastern UP"),
    "noida": (28.5355, 77.3910, "Uttar Pradesh", "NCR West"),
    "gorakhpur": (26.7606, 83.3732, "Uttar Pradesh", "Eastern UP"),
    "gurugram": (28.4595, 77.0266, "Haryana", "NCR South"),
    "gurgaon": (28.4595, 77.0266, "Haryana", "NCR South"),
    "faridabad": (28.4089, 77.3178, "Haryana", "NCR South"),
    "chandigarh": (30.7333, 76.7794, "Chandigarh", "Union Territory"),
    "amritsar": (31.6340, 74.8723, "Punjab", "Majha"),
    "ludhiana": (30.9010, 75.8573, "Punjab", "Malwa"),
    "jalandhar": (31.3260, 75.5762, "Punjab", "Doaba"),
    "bhopal": (23.2599, 77.4126, "Madhya Pradesh", "Central MP"),
    "indore": (22.7196, 75.8577, "Madhya Pradesh", "Malwa"),
    "gwalior": (26.2183, 78.1828, "Madhya Pradesh", "North MP"),
    "jabalpur": (23.1815, 79.9864, "Madhya Pradesh", "Mahakoshal"),
    "ujjain": (23.1765, 75.7885, "Madhya Pradesh", "Malwa"),
    "patna": (25.5941, 85.1376, "Bihar", "Gangetic Bihar"),
    "gaya": (24.7914, 85.0002, "Bihar", "South Bihar"),
    "ranchi": (23.3441, 85.3096, "Jharkhand", "Chota Nagpur"),
    "jamshedpur": (22.8046, 86.2029, "Jharkhand", "South Jharkhand"),
    "raipur": (21.2514, 81.6296, "Chhattisgarh", "Central Chhattisgarh"),
    "bilaspur": (22.0796, 82.1409, "Chhattisgarh", "North Chhattisgarh"),
    "bhubaneswar": (20.2961, 85.8245, "Odisha", "Coastal Odisha"),
    "cuttack": (20.4625, 85.8828, "Odisha", "Coastal Odisha"),
    "puri": (19.8135, 85.8312, "Odisha", "Coastal Odisha"),
    "rourkela": (22.2604, 84.8536, "Odisha", "Western Odisha"),
    "sambalpur": (21.4667, 83.9667, "Odisha", "Western Odisha"),
    "guwahati": (26.1445, 91.7362, "Assam", "Lower Assam"),
    "dibrugarh": (27.4728, 94.9120, "Assam", "Upper Assam"),
    "shillong": (25.5788, 91.8933, "Meghalaya", "Khasi Hills"),
    "imphal": (24.8170, 93.9368, "Manipur", "Imphal Valley"),
    "kochi": (9.9312, 76.2673, "Kerala", "Central Kerala Coast"),
    "cochin": (9.9312, 76.2673, "Kerala", "Central Kerala Coast"),
    "thiruvananthapuram": (8.5241, 76.9366, "Kerala", "South Kerala"),
    "kozhikode": (11.2588, 75.7804, "Kerala", "Malabar Coast"),
    "calicut": (11.2588, 75.7804, "Kerala", "Malabar Coast"),
    "thrissur": (10.5276, 76.2144, "Kerala", "Central Kerala"),
    "visakhapatnam": (17.6868, 83.2185, "Andhra Pradesh", "North Andhra Coast"),
    "vizag": (17.6868, 83.2185, "Andhra Pradesh", "North Andhra Coast"),
    "vijayawada": (16.5062, 80.6480, "Andhra Pradesh", "Krishna Delta"),
    "tirupati": (13.6288, 79.4192, "Andhra Pradesh", "Rayalaseema"),
    "guntur": (16.3067, 80.4365, "Andhra Pradesh", "South Coastal AP"),
    "panaji": (15.4909, 73.8278, "Goa", "North Goa"),
    "srinagar": (34.0837, 74.7973, "Jammu and Kashmir", "Kashmir Valley"),
    "jammu": (32.7266, 74.8570, "Jammu and Kashmir", "Jammu Plains"),
    "leh": (34.1526, 77.5771, "Ladakh", "Trans-Himalaya"),
    "shimla": (31.1048, 77.1734, "Himachal Pradesh", "Mid Hills"),
    "manali": (32.2396, 77.1887, "Himachal Pradesh", "Beas Valley"),
    "dehradun": (30.3165, 78.0322, "Uttarakhand", "Doon Valley"),
    "nainital": (29.3919, 79.4542, "Uttarakhand", "Kumaon Hills"),
    "port blair": (11.6234, 92.7265, "Andaman & Nicobar", "South Andaman"),
    "sri vijaya puram": (11.6234, 92.7265, "Andaman & Nicobar", "South Andaman"),
    "kavaratti": (10.5626, 72.6359, "Lakshadweep", "Arabian Sea Islands"),
    "puducherry": (11.9416, 79.8083, "Puducherry", "Coromandel Coast"),
    "pondicherry": (11.9416, 79.8083, "Puducherry", "Coromandel Coast"),
    "gangtok": (27.3389, 88.6065, "Sikkim", "Eastern Himalaya"),
    "itanagar": (27.0844, 93.6053, "Arunachal Pradesh", "Eastern Himalaya"),
    "kohima": (25.6747, 94.1100, "Nagaland", "Naga Hills"),
    "aizawl": (23.7271, 92.7176, "Mizoram", "Mizo Hills"),
    "agartala": (23.8315, 91.2868, "Tripura", "Tripura Plains"),
}

DEFAULT_LOCATION = ("Pune", 18.5204, 73.8567, "Maharashtra")

# Small metro-neighbourhood explorer (our own selection).
METRO_AREAS = {
    "pune": ["Hinjawadi", "Kothrud", "Hadapsar", "Baner", "Wagholi", "Baramati"],
    "mumbai": ["Andheri", "Bandra", "Thane", "Navi Mumbai", "Panvel"],
    "bengaluru": ["Whitefield", "Electronic City", "Koramangala", "Yelahanka"],
    "hyderabad": ["Gachibowli", "Madhapur", "Secunderabad"],
    "delhi": ["Noida", "Gurugram", "Faridabad"],
}


def _clean(text: str) -> str:
    text = re.sub(r"[,.\-/_]", " ", (text or "").lower())
    return " ".join(text.split())


def geocode(place: str) -> Tuple[float, float, str, str]:
    """Resolve a place name to (lat, lon, display name, state).

    Gazetteer first; live Open-Meteo geocoding second; built-in
    default last. Never raises for ordinary input.
    """
    query = _clean(place)
    if not query:
        name, lat, lon, state = DEFAULT_LOCATION
        return lat, lon, name, state

    if query in GAZETTEER:
        lat, lon, state, _area = GAZETTEER[query]
        return lat, lon, query.title(), state

    # Longest Gazetteer keys first so "new delhi" beats "delhi".
    for key in sorted(GAZETTEER, key=len, reverse=True):
        if key in query:
            lat, lon, state, _area = GAZETTEER[key]
            return lat, lon, key.title(), state

    live = _geocode_live(query)
    if live is not None:
        return live

    name, lat, lon, state = DEFAULT_LOCATION
    return lat, lon, name, state


def _geocode_live(query: str) -> Optional[Tuple[float, float, str, str]]:
    """Ask Open-Meteo geocoding; prefer Indian results, accept global ones."""
    try:
        url = (
            "https://geocoding-api.open-meteo.com/v1/search"
            f"?name={requests.utils.quote(query)}&count=5&language=en&format=json"
        )
        response = requests.get(url, timeout=4)
        if response.status_code != 200:
            return None
        results = response.json().get("results") or []
        if not results:
            return None
        indian = [r for r in results if (r.get("country_code") or "").upper() == "IN"]
        pick = indian[0] if indian else results[0]
        name = str(pick.get("name") or query.title())
        state = str(pick.get("admin1") or pick.get("country") or "India")
        return float(pick.get("latitude", 18.5204)), float(pick.get("longitude", 73.8567)), name, state
    except Exception:
        return None


def autocomplete(query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Suggest places from the gazetteer, topped up with live results."""
    text = _clean(query)
    suggestions: List[Dict[str, Any]] = []
    seen = set()

    def push(name: str, lat: float, lon: float, state: str, area: str) -> None:
        title = name.title()
        if title.lower() in seen:
            return
        seen.add(title.lower())
        suggestions.append(
            {
                "name": title,
                "display_name": f"{title}, {area}, {state}",
                "lat": lat,
                "lon": lon,
                "state": state,
                "region": area,
            }
        )

    if len(text) >= 2:
        for key, (lat, lon, state, area) in GAZETTEER.items():
            if text in key or key.startswith(text):
                push(key, lat, lon, state, area)
                if len(suggestions) >= limit:
                    return suggestions
    else:
        for key in ("pune", "mumbai", "delhi", "bengaluru", "vijayawada", "kolkata"):
            lat, lon, state, area = GAZETTEER[key]
            push(key, lat, lon, state, area)
        return suggestions[:limit]

    if len(suggestions) < limit and len(text) >= 2:
        try:
            url = (
                "https://geocoding-api.open-meteo.com/v1/search"
                f"?name={requests.utils.quote(text)}&count=6&language=en&format=json"
            )
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                for item in response.json().get("results", []):
                    country = (item.get("country_code") or "").upper()
                    if country != "IN" and (item.get("country") or "").lower() != "india":
                        continue
                    push(
                        str(item.get("name", "")),
                        float(item.get("latitude", 0.0)),
                        float(item.get("longitude", 0.0)),
                        str(item.get("admin1", "India")),
                        str(item.get("admin2", "India")),
                    )
                    if len(suggestions) >= limit:
                        break
        except Exception:
            pass
    return suggestions[:limit]


def metro_areas(region: str) -> List[Dict[str, str]]:
    """Neighbourhood names for a metro, used by the explorer UI."""
    key = _clean(region)
    for metro, areas in METRO_AREAS.items():
        if metro in key or key in metro:
            return [{"name": a, "desc": f"{metro.title()} area"} for a in areas]
    return [{"name": a, "desc": "Pune area"} for a in METRO_AREAS["pune"]]
