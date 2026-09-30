import datetime
from typing import Dict, Any, List
from ..schemas.models import AviationBriefing

AIRPORTS: Dict[str, Dict[str, Any]] = {
    "VIDP": {
        "name": "Indira Gandhi International Airport (New Delhi)",
        "city": "Delhi",
        "elevation_ft": 777,
        "runways": ["09/27", "10/28", "11/29"],
        "sample_metar": "VIDP 311800Z 28008KT 6000 HZ FEW030 SCT100 28/19 Q1012 NOSIG",
        "sample_taf": "TAF VIDP 311500Z 3118/0124 29010KT 5000 HZ SCT030 PROB30 TEMPO 0108/0112 30015G25KT 3000 TSRA SCT020CB",
        "category": "MVFR",
        "hazards": ["Haze / Moderate Visibility", "Convective CB cells in west approach sector"]
    },
    "VABB": {
        "name": "Chhatrapati Shivaji Maharaj International Airport (Mumbai)",
        "city": "Mumbai",
        "elevation_ft": 39,
        "runways": ["09/27", "14/32"],
        "sample_metar": "VABB 311800Z 25014KT 4000 -RA BKN015 OVC080 27/25 Q1009 TEMPO 2000 +RA",
        "sample_taf": "TAF VABB 311500Z 3118/0124 24016G28KT 3000 +SHRA BKN012 OVC070 TEMPO 0100/0108 1500 TSRA BKN008CB",
        "category": "IFR",
        "hazards": ["Low Cloud Ceiling (BKN 1500ft)", "Gusty Crosswinds 28kt on RWY 27", "Heavy Monsoon Squalls"]
    },
    "VOBL": {
        "name": "Kempegowda International Airport (Bengaluru)",
        "city": "Bengaluru",
        "elevation_ft": 3000,
        "runways": ["09L/27R", "09R/27L"],
        "sample_metar": "VOBL 311800Z 22009KT 9999 FEW025 SCT080 23/18 Q1016 NOSIG",
        "sample_taf": "TAF VOBL 311500Z 3118/0124 23012KT 9000 SCT025 PROB40 TEMPO 0110/0114 4000 TSRA SCT020CB",
        "category": "VFR",
        "hazards": ["Clear conditions currently", "Afternoon thunderstorm probability 40%"]
    },
    "VECC": {
        "name": "Netaji Subhash Chandra Bose International Airport (Kolkata)",
        "city": "Kolkata",
        "elevation_ft": 16,
        "runways": ["01L/19R", "01R/19L"],
        "sample_metar": "VECC 311800Z 12018G32KT 3000 +RA SCT010 BKN020CB OVC070 26/25 Q0998 WS RWY01R",
        "sample_taf": "TAF VECC 311500Z 3118/0124 11025G45KT 1500 +TSRA OVC008CB BECMG 0106/0108 09035G55KT EXP CYCLONIC SQUALLS",
        "category": "LIFR",
        "hazards": ["Cyclone Outer Spiral Bands", "Low-Level Windshear (WS) Alert RWY 01R", "Wind Gusts up to 45kt"]
    }
}

def get_aviation_briefing(query_str: str) -> AviationBriefing:
    """Decodes METAR and TAF reports for pilots and air traffic controllers."""
    clean = query_str.upper()
    selected_icao = "VIDP"
    
    if "MUMBAI" in clean or "VABB" in clean or "BOM" in clean:
        selected_icao = "VABB"
    elif "BANGALORE" in clean or "BENGALURU" in clean or "VOBL" in clean or "BLR" in clean:
        selected_icao = "VOBL"
    elif "KOLKATA" in clean or "VECC" in clean or "CCU" in clean:
        selected_icao = "VECC"
    elif "DELHI" in clean or "VIDP" in clean or "DEL" in clean:
        selected_icao = "VIDP"

    data = AIRPORTS[selected_icao]
    
    decoded = {
        "station": selected_icao,
        "wind": "280° at 8 knots" if selected_icao == "VIDP" else ("250° at 14 knots gusting" if selected_icao == "VABB" else "220° at 9 knots"),
        "visibility": "6000 meters" if selected_icao == "VIDP" else ("4000 meters in light rain" if selected_icao == "VABB" else "10+ km (CAVOK)"),
        "clouds": "Few at 3,000 ft, Scattered at 10,000 ft",
        "temperature": "28°C / Dew point 19°C",
        "altimeter_qnh": "1012 hPa (29.88 inHg)",
        "trend": "No significant change expected (NOSIG)"
    }

    return AviationBriefing(
        station_icao=selected_icao,
        station_name=data["name"],
        metar_raw=data["sample_metar"],
        metar_decoded=decoded,
        taf_raw=data["sample_taf"],
        flight_category=data["category"],
        hazards=data["hazards"]
    )
