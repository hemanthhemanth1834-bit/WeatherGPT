"""Conversational weather engine. Original implementation for SIH 2026.

Pipeline: detect language -> extract place -> classify intent ->
call a deterministic data tool -> render a templated reply.
Numerical weather facts ALWAYS come from the data tools; this module
only chooses words around them, so it cannot hallucinate readings.
"""
import re
from typing import Dict, List, Optional, Tuple

from ..models import (ChatResponse, CityComparisonData, HealthPersonas,
                      WeatherData, WeatherQueryRequest)
from . import geo
from .advisories import aviation_briefing, climate_reference, crop_advisory
from .advisories import marine_advisory
from .alerts import active_alerts
from .langid import detect_language
from .risk_engine import assess_risk
from .weather import WMO_LABELS, get_weather

# ---------------------------------------------------------------------------
# Native-script place names (our own compact map; language detection lives
# in langid.py so native + romanized queries share one analyzer).
# ---------------------------------------------------------------------------

# Major places written in native scripts (our own compact map).
NATIVE_PLACES = {
    "पुणे": "Pune", "मुंबई": "Mumbai", "नागपूर": "Nagpur", "नाशिक": "Nashik",
    "दिल्ली": "Delhi", "चेन्नई": "Chennai", "कोलकाता": "Kolkata",
    "बेंगळुरू": "Bengaluru", "हैदराबाद": "Hyderabad", "जयपूर": "Jaipur",
    "लखनऊ": "Lucknow", "पटना": "Patna", "भोपाळ": "Bhopal",
    "अहमदाबाद": "Ahmedabad", "सूरत": "Surat", "कोची": "Kochi",
    "विजयवाडा": "Vijayawada", "भुवनेश्वर": "Bhubaneswar", "वाराणसी": "Varanasi",
    "சென்னை": "Chennai", "மதுரை": "Madurai", "கோயம்புத்தூர்": "Coimbatore",
    "హైదరాబాద్": "Hyderabad", "విజయవాడ": "Vijayawada", "విశాఖపట్నం": "Visakhapatnam",
    "কলকাতা": "Kolkata", "হাওড়া": "Howrah",
    "અમદાવાદ": "Ahmedabad", "સુરત": "Surat",
    "ਅੰਮ੍ਰਿਤਸਰ": "Amritsar", "ਲੁਧਿਆਣਾ": "Ludhiana",
    "ಬೆಂಗಳೂರು": "Bengaluru", "ಮೈಸೂರು": "Mysuru",
    "കൊച്ചി": "Kochi", "തിരുവനന്തപുരം": "Thiruvananthapuram",
    "ଭୁବନେଶ୍ୱର": "Bhubaneswar", "କଟକ": "Cuttack", "ପୁରୀ": "Puri",
}


# ---------------------------------------------------------------------------
# Place extraction
# ---------------------------------------------------------------------------
FILLER_WORDS = {
    "what", "weather", "today", "tomorrow", "rain", "temperature", "tell",
    "about", "forecast", "will", "there", "heavy", "current", "tomorrows",
    "मौसम", "हवामान", "माहिती", "நாளை", "వర్షం", "ବର୍ଷା", "മഴ",
}


def extract_place(text: str, fallback: Optional[str] = None) -> str:
    """Find the most likely place name inside a free-text query."""
    lowered = text.lower()
    for key in sorted(geo.GAZETTEER, key=len, reverse=True):
        if re.search(r"\b" + re.escape(key) + r"\b", lowered):
            return key.title()
    for native, english in sorted(NATIVE_PLACES.items(),
                                   key=lambda item: len(item[0]), reverse=True):
        if native in text:
            return english
    match = re.search(r"\b(?:in|at|near|for|around|of)\s+([A-Za-z][A-Za-z .'-]{2,})",
                      text, re.IGNORECASE)
    if match:
        candidate = match.group(1).strip().split()[0].strip(".,?'")
        if candidate.lower() not in FILLER_WORDS and len(candidate) >= 3:
            return candidate.title()
    if fallback and fallback.strip().lower() not in ("", "your location", "auto"):
        return fallback.strip().title()
    return "New Delhi"


def extract_pair(text: str) -> Tuple[str, str]:
    """Find two city names for comparison prompts."""
    patterns = [
        r"([A-Za-z]+)\s+(?:vs|versus|and|or|with|to)\s+([A-Za-z]+)",
        r"(?:compare|between)\s+([A-Za-z]+)\s+\w*\s*([A-Za-z]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            first, second = match.group(1).title(), match.group(2).title()
            if first.lower() not in FILLER_WORDS and second.lower() not in FILLER_WORDS:
                return first, second
    return "Mumbai", "Delhi"


# ---------------------------------------------------------------------------
# Response templates (our own wording in each language)
# ---------------------------------------------------------------------------
def _condition_names(condition: str, lang: str) -> str:
    table = {
        "hi": {"Clear Sky": "साफ आसमान", "Partly Cloudy": "हल्के बादल",
               "Heavy Rain": "भारी बारिश", "Thunderstorm": "गरज के साथ बारिश"},
        "mr": {"Clear Sky": "निरभ्र आकाश", "Partly Cloudy": "अंशतः ढगाळ",
               "Heavy Rain": "मुसळधार पाऊस", "Thunderstorm": "मेघगर्जनेसह पाऊस"},
        "ta": {"Clear Sky": "தெளிவான வானம்", "Partly Cloudy": "பகுதி மேகமூட்டம்",
               "Heavy Rain": "கனமழை", "Thunderstorm": "இடியுடன் மழை"},
        "te": {"Clear Sky": "నిర్మలమైన ఆకాశం", "Partly Cloudy": "పాక్షిక మేఘాలు",
               "Heavy Rain": "భారీ వర్షం", "Thunderstorm": "ఉరుములతో వర్షం"},
    }
    return table.get(lang, {}).get(condition, condition)


TEMPLATES = {
    "en": {
        "speech": "In {place}, it is {temp} degrees with {cond}. Rain chance {rain} percent.",
        "title": "Weather for {place}, {state}",
        "body": ("Currently **{cond}** at **{temp}°C** (feels like **{feels}°C**).\n\n"
                 "- High **{tmax}°C** / Low **{tmin}°C**\n"
                 "- Rain chance **{rain}%** ({precip} mm recorded)\n"
                 "- Wind **{wind} km/h {wdir}**, humidity **{hum}%**, pressure **{pres} hPa**\n"
                 "- AQI **{aqi}** ({aqi_status}) · UV **{uv}** · Sunrise **{rise}** · Sunset **{set}**"),
        "suggest": ["Will it rain tomorrow in {place}?", "Risks in {place} this week?",
                    "7-day outlook for {place}"],
    },
    "hi": {
        "speech": "{place} में तापमान {temp} डिग्री और मौसम {cond} है। बारिश की संभावना {rain}% है।",
        "title": "{place}, {state} का मौसम",
        "body": ("फिलहाल **{cond}** और तापमान **{temp}°C** (महसूस **{feels}°C**)।\n\n"
                 "- अधिकतम **{tmax}°C** / न्यूनतम **{tmin}°C**\n"
                 "- बारिश की संभावना **{rain}%** ({precip} मिमी दर्ज)\n"
                 "- हवा **{wind} किमी/घंटा {wdir}**, आर्द्रता **{hum}%**\n"
                 "- AQI **{aqi}** ({aqi_status}) · UV **{uv}**"),
        "suggest": ["कल {place} में बारिश होगी?", "{place} में जोखिम बताएं"],
    },
    "mr": {
        "speech": "{place} मध्ये तापमान {temp} अंश असून हवामान {cond} आहे. पावसाची शक्यता {rain}% आहे.",
        "title": "{place}, {state} हवामान",
        "body": ("सध्या **{cond}** वातावरण, तापमान **{temp}°C** (जाणवते **{feels}°C**)।\n\n"
                 "- कमाल **{tmax}°C** / किमान **{tmin}°C**\n"
                 "- पावसाची शक्यता **{rain}%** ({precip} मिमी नोंद)\n"
                 "- वारा **{wind} किमी/तास {wdir}**, आर्द्रता **{hum}%**\n"
                 "- AQI **{aqi}** ({aqi_status}) · UV **{uv}**"),
        "suggest": ["उद्या {place} मध्ये पाऊस पडेल का?", "{place} मधील धोके सांगा"],
    },
    "ta": {
        "speech": "{place} இல் வெப்பநிலை {temp} டிகிரி, வானிலை {cond}. மழை வாய்ப்பு {rain} சதவீதம்.",
        "title": "{place}, {state} வானிலை",
        "body": ("தற்போது **{cond}**, வெப்பநிலை **{temp}°C**.\n\n"
                 "- அதிகம் **{tmax}°C** / குறைவு **{tmin}°C**\n"
                 "- மழை வாய்ப்பு **{rain}%** ({precip} மிமீ)\n"
                 "- காற்று **{wind} கிமீ/மணி**, ஈரப்பதம் **{hum}%**\n"
                 "- AQI **{aqi}** ({aqi_status})"),
        "suggest": ["நாளை {place} மழை பெய்யுமா?"],
    },
    "te": {
        "speech": "{place} లో ఉష్ణోగ్రత {temp} డిగ్రీలు, వాతావరణం {cond}. వర్ష అవకాశం {rain} శాతం.",
        "title": "{place}, {state} వాతావరణం",
        "body": ("ప్రస్తుతం **{cond}**, ఉష్ణోగ్రత **{temp}°C**.\n\n"
                 "- గరిష్ఠ **{tmax}°C** / కనిష్ఠ **{tmin}°C**\n"
                 "- వర్ష అవకాశం **{rain}%** ({precip} మిమీ)\n"
                 "- గాలి **{wind} కిమీ/గం**, తేమ **{hum}%**\n"
                 "- AQI **{aqi}** ({aqi_status})"),
        "suggest": ["రేపు {place} లో వర్షం పడుతుందా?"],
    },
    "bn": {
        "speech": "{place} এ তাপমাত্রা {temp} ডিগ্রি, আবহাওয়া {cond}। বৃষ্টির সম্ভাবনা {rain}%।",
        "title": "{place}, {state} আবহাওয়া",
        "body": ("বর্তমানে **{cond}**, তাপমাত্রা **{temp}°C**.\n\n"
                 "- সর্বোচ্চ **{tmax}°C** / সর্বনিম্ন **{tmin}°C**\n"
                 "- বৃষ্টির সম্ভাবনা **{rain}%** ({precip} মিমি)\n"
                 "- বাতাস **{wind} কিমি/ঘণ্টা**, আর্দ্রতা **{hum}%**"),
        "suggest": ["কাল {place} এ বৃষ্টি হবে?"],
    },
    "gu": {
        "speech": "{place} માં તાપમાન {temp} ડિગ્રી, હવામાન {cond}. વરસાદની શક્યતા {rain}% છે.",
        "title": "{place}, {state} હવામાન",
        "body": ("હાલમાં **{cond}**, તાપમાન **{temp}°C**.\n\n"
                 "- મહત્તમ **{tmax}°C** / લઘુત્તમ **{tmin}°C**\n"
                 "- વરસાદની શક્યતા **{rain}%** ({precip} મિમી)"),
        "suggest": ["કાલે {place} માં વરસાદ પડશે?"],
    },
    "pa": {
        "speech": "{place} ਵਿੱਚ ਤਾਪਮਾਨ {temp} ਡਿਗਰੀ, ਮੌਸਮ {cond}। ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ {rain}% ਹੈ।",
        "title": "{place}, {state} ਮੌਸਮ",
        "body": ("ਇਸ ਵੇਲੇ **{cond}**, ਤਾਪਮਾਨ **{temp}°C**.\n\n"
                 "- ਵੱਧ **{tmax}°C** / ਘੱਟ **{tmin}°C**\n"
                 "- ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ **{rain}%** ({precip} ਮਿਮੀ)"),
        "suggest": ["ਕੱਲ੍ਹ {place} ਵਿੱਚ ਮੀਂਹ ਪਵੇਗਾ?"],
    },
    "kn": {
        "speech": "{place} ನಲ್ಲಿ ತಾಪಮಾನ {temp} ಡಿಗ್ರಿ, ಹವಾಮಾನ {cond}. ಮಳೆ ಸಾಧ್ಯತೆ {rain}%.",
        "title": "{place}, {state} ಹವಾಮಾನ",
        "body": ("ಪ್ರಸ್ತುತ **{cond}**, ತಾಪಮಾನ **{temp}°C**.\n\n"
                 "- ಗರಿಷ್ಠ **{tmax}°C** / ಕನಿಷ್ಠ **{tmin}°C**\n"
                 "- ಮಳೆ ಸಾಧ್ಯತೆ **{rain}%** ({precip} ಮಿಮೀ)"),
        "suggest": ["ನಾಳೆ {place} ನಲ್ಲಿ ಮಳೆ ಬರುತ್ತದೆಯೇ?"],
    },
    "ml": {
        "speech": "{place} ൽ താപനില {temp} ഡിഗ്രി, കാലാവസ്ഥ {cond}. മഴ സാധ്യത {rain}% ആണ്.",
        "title": "{place}, {state} കാലാവസ്ഥ",
        "body": ("നിലവിൽ **{cond}**, താപനില **{temp}°C**.\n\n"
                 "- കൂടിയ **{tmax}°C** / കുറഞ്ഞ **{tmin}°C**\n"
                 "- മഴ സാധ്യത **{rain}%** ({precip} മിമീ)"),
        "suggest": ["നാളെ {place} ൽ മഴ പെയ്യുമോ?"],
    },
    "or": {
        "speech": "{place} ରେ ତାପମାତ୍ରା {temp} ଡିଗ୍ରୀ, ପାଣିପାଗ {cond}। ବର୍ଷା ସମ୍ଭାବନା {rain}%।",
        "title": "{place}, {state} ପାଣିପାଗ",
        "body": ("ବର୍ତ୍ତମାନ **{cond}**, ତାପମାତ୍ରା **{temp}°C**.\n\n"
                 "- ସର୍ବାଧିକ **{tmax}°C** / ସର୍ବନିମ୍ନ **{tmin}°C**\n"
                 "- ବର୍ଷା ସମ୍ଭାବନା **{rain}%** ({precip} ମିମି)"),
        "suggest": ["କାଲି {place} ରେ ବର୍ଷା ହେବ କି?"],
    },
}

ACTIONS = [
    {"label": "Open forecast", "action": "open_dashboard"},
    {"label": "View map", "action": "open_map"},
    {"label": "Check alerts", "action": "open_alerts"},
]


def _render_weather(place: str, state: str, data: WeatherData,
                    lang: str) -> Tuple[str, str]:
    """Fill the language template with tool-provided numbers."""
    template = TEMPLATES.get(lang, TEMPLATES["en"])
    rain = data.hourly[0].rain_prob if data.hourly else 0
    today = data.daily[0] if data.daily else None
    cond = _condition_names(data.condition, lang)
    values = {
        "place": place, "state": state, "cond": cond,
        "temp": data.current_temp, "feels": data.feels_like,
        "tmax": today.temp_max if today else data.current_temp,
        "tmin": today.temp_min if today else data.current_temp,
        "rain": rain, "precip": data.precipitation,
        "wind": data.wind_speed, "wdir": data.wind_direction,
        "hum": data.humidity, "pres": data.pressure,
        "aqi": data.aqi, "aqi_status": data.aqi_status, "uv": data.uv_index,
        "rise": data.sunrise, "set": data.sunset,
    }
    speech = template["speech"].format(**values)
    markdown = f"### {template['title'].format(**values)}\n\n" + template["body"].format(**values)
    markdown += (f"\n\n_Source: {data.data_source} · {data.status} · "
                 f"Updated {data.updated_at_ist or 'just now'}_")
    return speech, markdown


def _compare(first: str, second: str) -> CityComparisonData:
    """Side-by-side weather for two places, all figures from live tools."""
    lat1, lon1, name1, state1 = geo.geocode(first)
    lat2, lon2, name2, state2 = geo.geocode(second)
    one = get_weather(lat1, lon1, name1, state1)
    two = get_weather(lat2, lon2, name2, state2)
    gap = round(one.current_temp - two.current_temp, 1)
    warmer = name1 if gap > 0 else (name2 if gap < 0 else "Equal")
    rain1 = one.hourly[0].rain_prob if one.hourly else 0
    rain2 = two.hourly[0].rain_prob if two.hourly else 0
    rainy = name1 if rain1 > rain2 else (name2 if rain2 > rain1 else "Equal")
    score = 95
    for sample in (one, two):
        if sample.precipitation > 5:
            score -= 20
        if sample.wind_speed > 25:
            score -= 15
        if sample.aqi > 200:
            score -= 10
    score = max(30, min(100, score))
    cleaner = name1 if one.aqi <= two.aqi else name2
    return CityComparisonData(
        city1=one, city2=two, temp_diff=gap, temp_warmer_city=warmer,
        humidity_diff=one.humidity - two.humidity, aqi_better_city=cleaner,
        rain_risk_city=rainy, travel_safety_score=score,
        travel_advisory=(f"Travel between {name1} and {name2}: safety {score}/100. "
                         "Allow extra time if rain or haze appears on the route."),
        health_advisory=HealthPersonas(
            athletes=f"Cleaner air in {cleaner}; train early morning.",
            asthma_patients=f"Carry medication where AQI is higher ({max(one.aqi, two.aqi)}).",
            children_schools=f"Prefer outdoor play in {cleaner}.",
            elderly=f"Avoid midday heat in {warmer if warmer != 'Equal' else name1}.",
        ),
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def answer(request: WeatherQueryRequest) -> ChatResponse:
    """Route one user query to the right tool and render the reply."""
    text = (request.query or "").strip()
    if request.language and request.language.strip().lower() not in ("", "auto"):
        lang = request.language.strip().lower()
        if lang not in TEMPLATES:
            lang = "en"
    else:
        lang = detect_language(text)
    persona = request.persona or "general"
    lowered = text.lower()

    compare_words = ("compare", " vs ", "versus", "hotter than", "colder than",
                     "warmer than", "better than")
    if any(w in lowered for w in compare_words):
        first, second = extract_pair(text)
        result = _compare(first, second)
        speech = (f"Comparing {result.city1.location} and {result.city2.location}. "
                  f"{result.temp_warmer_city} is warmer by {abs(result.temp_diff)} degrees. "
                  f"Travel safety {result.travel_safety_score} out of 100.")
        markdown = (
            f"### Comparing {result.city1.location} vs {result.city2.location}\n\n"
            f"| | {result.city1.location} | {result.city2.location} |\n"
            f"|---|---|---|\n"
            f"| Temp | **{result.city1.current_temp}°C** | **{result.city2.current_temp}°C** |\n"
            f"| Humidity | {result.city1.humidity}% | {result.city2.humidity}% |\n"
            f"| AQI | {result.city1.aqi} | {result.city2.aqi} |\n"
            f"| Rain chance | {result.city1.hourly[0].rain_prob if result.city1.hourly else 0}%"
            f" | {result.city2.hourly[0].rain_prob if result.city2.hourly else 0}% |\n\n"
            f"Warmer: **{result.temp_warmer_city}** "
            f"(+{abs(result.temp_diff)}°C) · Cleaner air: **{result.aqi_better_city}** · "
            f"Travel safety: **{result.travel_safety_score}/100**\n\n{result.travel_advisory}"
        )
        return ChatResponse(
            query=text, detected_language=lang, persona=persona,
            speech_text=speech, markdown_response=markdown,
            structured_weather=result.city1, comparison_data=result,
            quick_suggestions=[f"7-day outlook for {result.city1.location}",
                               f"Risks in {result.city2.location}"],
            suggested_actions=ACTIONS,
        )

    place = extract_place(text, request.location_name)
    lat, lon, proper, state = geo.geocode(place)
    data = get_weather(lat, lon, proper, state)

    wants_agri = persona == "farmer" or any(
        w in lowered for w in ("crop", "farmer", "paddy", "cotton", "wheat",
                               "sugarcane", "soybean", "mustard", "irrigation",
                               "harvest", "फसल", "शेतकरी"))
    wants_air = persona == "aviation" or any(
        w in lowered for w in ("flight", "airport", "metar", "taf", "pilot", "runway"))
    wants_sea = persona == "marine" or any(
        w in lowered for w in ("sea", "marine", "ocean", "wave", "tide",
                               "fisherman", "fishing", "समुद्र"))
    wants_alert = any(w in lowered for w in ("cyclone", "alert", "warning", "flood",
                                             "disaster", "storm", "अलर्ट", "वादळ"))
    wants_climate = any(w in lowered for w in ("climate", "monsoon", "history", "historical",
                                               "trend", "warming", "el nino", "la nina", "last year"))
    wants_travel = any(w in lowered for w in ("travel", "trip", "journey", "safe to",
                                              "is it safe", "commute", "drive"))
    wants_aqi = any(w in lowered for w in ("aqi", "air quality", "pollution", "smog",
                                           "pm2", "pm10", "haze"))
    wants_quake = any(w in lowered for w in ("earthquake", "tremor", "seismic", "quake"))
    wants_fire = any(w in lowered for w in ("wildfire", "forest fire", "fire hotspot", "burning forest"))
    wants_flood = any(w in lowered for w in ("flood", "inundation", "waterlogging", "flooded"))
    wants_shelter = any(w in lowered for w in ("shelter", "hospital nearby", "evacuat", "safe place", "assembly point"))
    wants_solar = any(w in lowered for w in ("solar", "rooftop", "photovoltaic", "pv output", "sunshine hours"))

    advisory = None
    briefing = None
    sea = None
    alerts = None
    extra = ""

    if wants_agri:
        crop = next((c for c in ("cotton", "wheat", "sugarcane", "soybean", "mustard", "paddy")
                     if c in lowered), "paddy")
        rain = data.hourly[0].rain_prob if data.hourly else 20
        advisory = crop_advisory(crop, proper, state, data.current_temp, rain, data.humidity)
        extra += (f"\n\n**Farm note ({advisory.crop}):** {advisory.irrigation_advice} "
                  f"{advisory.pesticide_advice}")
    if wants_air:
        briefing = None
        origin = "STATIC sample"
        try:
            from .aviation_live import live_briefing
            city_to_icao = {"MUMBAI": "VABB", "DELHI": "VIDP", "NEW DELHI": "VIDP",
                            "BENGALURU": "VOBL", "BANGALORE": "VOBL",
                            "KOLKATA": "VECC", "CHENNAI": "VOMM", "HYDERABAD": "VOHS"}
            code = city_to_icao.get(proper.upper(), "VIDP")
            live = live_briefing(code)
            if live is not None:
                origin = "LIVE (NOAA ADDS)"
                briefing = aviation_briefing(code)
                briefing.station_icao = live["station_icao"]
                briefing.metar_raw = live["metar_raw"]
                briefing.taf_raw = live["taf_raw"] or briefing.taf_raw
                briefing.flight_category = live["flight_category"]
                briefing.hazards = live["hazards"]
                briefing.metar_decoded = {**briefing.metar_decoded,
                                          "provenance": "LIVE (NOAA ADDS)"}
        except Exception:
            briefing = None
        if briefing is None:
            briefing = aviation_briefing(proper)
        extra += (f"\n\n**Aviation ({briefing.station_icao}, {origin}):** "
                  f"{briefing.flight_category} — {briefing.metar_raw}")
    if wants_sea:
        sea = marine_advisory(proper)
        extra += (f"\n\n**Marine (estimate):** {sea.wave_height_m} m waves, "
                  f"{sea.sea_condition}. {sea.warning_message}")
    if wants_alert or data.precipitation > 25 or data.current_temp > 42 or persona == "disaster_manager":
        alerts = active_alerts(state=state, district=proper)
        if not alerts:
            alerts = active_alerts()
        lines = "\n".join(f"- **[{a.severity}]** {a.headline}" for a in alerts[:4])
        extra += f"\n\n**Alerts (computed, not official):**\n{lines}"
    if wants_climate:
        ref = climate_reference(f"{proper} ({state})")
        extra += (f"\n\n**Climate reference (STATIC):** {ref['summary']} "
                  f"Baseline {ref['baseline_period']}; monsoon LPA {ref['lpa_monsoon_rainfall_mm']} mm.")
    if wants_travel:
        risk = assess_risk(data)
        top = risk["advisories"][0] if risk["advisories"] else ""
        extra += (f"\n\n**Travel read (ESTIMATED risk {risk['overall']}):** {top} "
                  f"Wind {data.wind_speed} km/h, visibility {data.visibility} km, "
                  f"rain chance {(data.hourly[0].rain_prob if data.hourly else 0)}%.")
    if wants_aqi:
        try:
            from .air_quality import get_air_quality
            live_aqi = get_air_quality(lat, lon)
            extra += (f"\n\n**Air quality (LIVE, {live_aqi['standard']}):** "
                      f"US AQI **{live_aqi['us_aqi']}** ({live_aqi['band']}), "
                      f"PM2.5 {live_aqi['pm2_5']}, PM10 {live_aqi['pm10']}. "
                      f"Dominant pollutant: {live_aqi['dominant_pollutant']}.")
        except RuntimeError:
            extra += (f"\n\n**Air quality (ESTIMATED fallback):** AQI **{data.aqi}** "
                      f"({data.aqi_status}). Live feed unavailable right now.")
    if wants_quake:
        try:
            from .disasters import earthquakes
            quakes = earthquakes(4.5, 7).get("events", [])[:3]
            if quakes:
                lines = "\n".join(f"- **M{q['magnitude']}** {q['place']}" for q in quakes)
                extra += (f"\n\n**Recent earthquakes (USGS, OFFICIAL third-party):**\n{lines}\n"
                          f"Geological events — not Indian government alerts.")
            else:
                extra += "\n\n**Earthquakes (USGS):** feed reachable, no M4.5+ events in the window."
        except RuntimeError:
            extra += "\n\n**Earthquakes:** USGS feed unreachable right now — showing nothing rather than guessing."
    if wants_fire:
        try:
            from .disasters import wildfires
            fires = wildfires(12).get("events", [])[:3]
            if fires:
                lines = "\n".join(f"- **{f['title']}**" for f in fires)
                extra += (f"\n\n**Open wildfires (NASA EONET, OFFICIAL third-party):**\n{lines}")
            else:
                extra += "\n\n**Wildfires (EONET):** feed reachable, no open fires listed."
        except RuntimeError:
            extra += "\n\n**Wildfires:** EONET feed unreachable right now — showing nothing rather than guessing."
    if wants_flood:
        try:
            from .flood import flood_risk
            flood = flood_risk(lat, lon, proper, state)
            extra += (f"\n\n**Flood proxy ({flood['risk']}, COMPUTED — unofficial):** "
                      f"score {flood['score']}/100. "
                      + ("; ".join(flood["drivers"])) + f" {flood['limits']}")
        except Exception:
            extra += "\n\n**Flood proxy:** unavailable right now — showing nothing rather than guessing."
    if wants_shelter:
        try:
            from .places import emergency_places
            found = emergency_places(lat, lon)
            hospitals = found["facilities"].get("hospital", [])[:3]
            if hospitals:
                lines = "\n".join(f"- **{h['name']}** ({h['distance_km']} km)" for h in hospitals)
                extra += (f"\n\n**Nearest hospitals (OpenStreetMap, LIVE lookup):**\n{lines}\n"
                          f"{found['note']}")
            else:
                extra += "\n\n**Nearby facilities (OpenStreetMap):** none mapped within 20 km. Call 112 for help."
        except Exception:
            extra += "\n\n**Nearby facilities:** lookup unavailable — call 112 for help."
    if wants_solar:
        try:
            from .solar import solar_estimate
            solar = solar_estimate(data.uv_index, data.cloud_cover, data.sunrise, data.sunset)
            extra += (f"\n\n**Rooftop solar (ESTIMATED):** ~{solar['daily_kwh_per_kw']} kWh/day per kW "
                      f"({solar['peak_sun_hours']} peak sun hours). {solar['formula']}")
        except Exception:
            extra += "\n\n**Solar estimate:** unavailable right now."

    speech, markdown = _render_weather(proper, state, data, lang)
    markdown += extra
    template = TEMPLATES.get(lang, TEMPLATES["en"])
    suggestions = [s.format(place=proper, state=state) for s in template["suggest"]]
    return ChatResponse(
        query=text, detected_language=lang, persona=persona,
        speech_text=speech, markdown_response=markdown,
        structured_weather=data, alerts=alerts, agri_advisory=advisory,
        aviation_briefing=briefing, marine_advisory=sea,
        quick_suggestions=suggestions, suggested_actions=ACTIONS,
    )
