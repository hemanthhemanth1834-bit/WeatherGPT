"""Conversational weather engine. Original implementation for SIH 2026.

Pipeline: detect language -> extract place -> classify intent ->
call a deterministic data tool -> render a templated reply.
Numerical weather facts ALWAYS come from the data tools; this module
only chooses words around them, so it cannot hallucinate readings.
"""

import re
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException

from ..models import (
    ChatResponse,
    CityComparisonData,
    HealthPersonas,
    WeatherData,
    WeatherQueryRequest,
)
from . import geo
from .advisories import aviation_briefing, climate_reference, crop_advisory
from .advisories import marine_advisory
from .alerts import active_alerts
from .imd_rss import filter_warnings, get_imd_rss_warnings
from .intents import classify_intent
from .langid import detect_language
from .chat_i18n import tomorrow_text
from .llm import provider_status
from .provenance import (
    build_weather_provenance,
    computed_provenance,
    official_provenance,
)
from .risk_engine import assess_risk
from .travel import assess_travel
from .weather import WMO_LABELS, get_weather

# ---------------------------------------------------------------------------
# Native-script place names (our own compact map; language detection lives
# in langid.py so native + romanized queries share one analyzer).
# ---------------------------------------------------------------------------

# Major places written in native scripts (our own compact map).
NATIVE_PLACES = {
    "पुणे": "Pune",
    "मुंबई": "Mumbai",
    "नागपूर": "Nagpur",
    "नाशिक": "Nashik",
    "दिल्ली": "Delhi",
    "चेन्नई": "Chennai",
    "कोलकाता": "Kolkata",
    "बेंगळुरू": "Bengaluru",
    "हैदराबाद": "Hyderabad",
    "जयपूर": "Jaipur",
    "लखनऊ": "Lucknow",
    "पटना": "Patna",
    "भोपाळ": "Bhopal",
    "अहमदाबाद": "Ahmedabad",
    "सूरत": "Surat",
    "कोची": "Kochi",
    "विजयवाडा": "Vijayawada",
    "भुवनेश्वर": "Bhubaneswar",
    "वाराणसी": "Varanasi",
    "சென்னை": "Chennai",
    "மதுரை": "Madurai",
    "கோயம்புத்தூர்": "Coimbatore",
    "హైదరాబాద్": "Hyderabad",
    "విజయవాడ": "Vijayawada",
    "విశాఖపట్నం": "Visakhapatnam",
    "কলকাতা": "Kolkata",
    "হাওড়া": "Howrah",
    "અમદાવાદ": "Ahmedabad",
    "સુરત": "Surat",
    "ਅੰਮ੍ਰਿਤਸਰ": "Amritsar",
    "ਲੁਧਿਆਣਾ": "Ludhiana",
    "ಬೆಂಗಳೂರು": "Bengaluru",
    "ಮೈಸೂರು": "Mysuru",
    "കൊച്ചി": "Kochi",
    "തിരുവനന്തപുരം": "Thiruvananthapuram",
    "ଭୁବନେଶ୍ୱର": "Bhubaneswar",
    "କଟକ": "Cuttack",
    "ପୁରୀ": "Puri",
}


# ---------------------------------------------------------------------------
# Place extraction
# ---------------------------------------------------------------------------
FILLER_WORDS = {
    "what",
    "weather",
    "today",
    "tomorrow",
    "rain",
    "temperature",
    "tell",
    "about",
    "forecast",
    "will",
    "there",
    "heavy",
    "current",
    "tomorrows",
    "मौसम",
    "हवामान",
    "माहिती",
    "நாளை",
    "వర్షం",
    "ବର୍ଷା",
    "മഴ",
    # Deictics/pronouns and question scaffolding that must never be treated
    # as place names (a live prod bug geocoded "of this" -> "This, France").
    "this",
    "that",
    "these",
    "those",
    "here",
    "there",
    "it",
    "my",
    "our",
    "your",
    "location",
    "selected",
    "current",
    "city",
    "place",
    "area",
    "data",
    "update",
    "updated",
    "source",
    "sources",
    "answer",
    "official",
    "warning",
    "warnings",
    "radar",
    "satellite",
    "showing",
    "available",
    "unavailable",
    "right",
    "now",
    "tonight",
    "evening",
    "morning",
    "afternoon",
    "week",
    "weekend",
    "crop",
    "crops",
    "farmer",
    "farmers",
    "spray",
    "spraying",
    "before",
    "consider",
    "should",
    "could",
    "would",
    "give",
    "show",
    "please",
    "report",
    "summary",
    "details",
    "info",
    "information",
    "status",
    "help",
    "using",
    "model",
    "models",
    "feed",
    "bulletin",
    "bulletin",
    "imd",
    "the",
    "and",
    "or",
    "is",
    "are",
    "was",
}

# Phrases that refer to the app's active/selected location rather than a
# place name typed in the question.
DEICTIC_PHRASES = (
    "my location",
    "my selected location",
    "selected location",
    "my city",
    "my area",
    "my place",
    "current location",
    "here",
    "my position",
    "this location",
    "this city",
)


def extract_place_meta(text: str, fallback: Optional[str] = None) -> Tuple[str, bool]:
    """Find the most likely place name. Returns (place, explicit).

    explicit is False when we fell back to the caller-provided location
    (the user's active location) or a default, so callers can avoid
    synchronising the app location to a guess.
    """
    lowered = text.lower()
    for phrase in DEICTIC_PHRASES:
        # Word-boundary matching is essential: a substring test made "here"
        # match inside "Nowhere" (and "where"), silently replacing an explicit
        # unknown place with the caller's active location.
        if re.search(r"\b" + re.escape(phrase) + r"\b", lowered):
            if fallback and fallback.strip().lower() not in (
                "",
                "your location",
                "auto",
            ):
                return fallback.strip().title(), False
            return "", False
    for key in sorted(geo.GAZETTEER, key=len, reverse=True):
        if re.search(r"\b" + re.escape(key) + r"\b", lowered):
            return key.title(), True
    for native, english in sorted(
        NATIVE_PLACES.items(), key=lambda item: len(item[0]), reverse=True
    ):
        if native in text:
            return english, True
    match = re.search(
        r"\b(?:in|at|near|for|around|of)\s+([A-Za-z0-9][A-Za-z0-9 .'-]{1,60})",
        text,
        re.IGNORECASE,
    )
    if match:
        candidate = match.group(1).strip().split()[0].strip(".,?'")
        # Keep hyphens and digits so an explicitly named but unknown place
        # (for example "Atlantis-Nowhere-12345") is sent to geocoding and
        # fails closed, instead of being discarded and replaced by the
        # caller's current location.
        if (
            candidate.lower() not in FILLER_WORDS
            and len(candidate) >= 3
            and re.fullmatch(r"[A-Za-z][A-Za-z0-9.'-]*", candidate)
        ):
            return candidate.title(), True
    if fallback and fallback.strip().lower() not in ("", "your location", "auto"):
        return fallback.strip().title(), False
    return "", False


def extract_place(text: str, fallback: Optional[str] = None) -> str:
    """Backwards-compatible wrapper (place name only)."""
    return extract_place_meta(text, fallback)[0]


_MONTH_NUM = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def unresolved_location_note(place: str, shown: str) -> str:
    """Honest note when the requested place could not be geocoded.

    Without this, an unknown place silently answered as the built-in default
    city (Pune), which reads as if that were the requested location.
    Returns '' when the place resolved normally.
    """
    return (
        f"\n\n*Note: I could not resolve “{place}” to a location, so the "
        f"figures above are for {shown}, not the place you named.*"
    )


def horizon_note(text: str) -> str:
    """Honest note when a question asks about a date beyond the forecast
    horizon (the data tool can only return ~7 days). Returns '' otherwise."""
    import datetime as _dt

    lowered = text.lower()
    ist = _dt.timezone(_dt.timedelta(hours=5, minutes=30))
    now = _dt.datetime.now(ist)
    hit = next(
        (name for name in _MONTH_NUM if re.search(r"\b" + name + r"\b", lowered)), None
    )
    if not hit:
        return ""
    # "may"/"march" are common English words; only treat them as months
    # when capitalised or followed by a day number ("15 may").
    if hit in ("may", "march"):
        capitalised = bool(re.search(r"\b" + hit.title() + r"\b", text))
        followed_by_day = bool(re.search(r"\b" + hit + r"\s+\d{1,2}\b", lowered))
        if not (capitalised or followed_by_day):
            return ""
    target_month = _MONTH_NUM[hit]
    if target_month == now.month:
        day_match = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\b", lowered)
        days_ahead = (
            int(day_match.group(1)) - now.day
            if day_match and 1 <= int(day_match.group(1)) <= 31
            else None
        )
    else:
        months_ahead = (target_month - now.month) % 12
        days_ahead = months_ahead * 30
    if days_ahead is not None and days_ahead > 7:
        return (
            f"\n\n*Note: my live forecast horizon is about 7 days, so the values "
            f"above are for today — they cannot answer a question about {hit.title()}. "
            f"For longer-range outlooks see Climate Trends or IMD seasonal guidance.*"
        )
    return ""


def _aqi_label(data: WeatherData) -> str:
    """AQI text that always names its provenance (live feed vs heuristic)."""
    source = (getattr(data, "aqi_source", "") or "").lower()
    if "open-meteo air quality" in source:
        return f"{data.aqi}"
    return f"{data.aqi} (heuristic estimate)"


def extract_pair(text: str) -> Optional[Tuple[str, str]]:
    """Find two place names for comparison prompts.

    Returning ``None`` is intentional: the assistant must ask for the missing
    pair rather than silently comparing Mumbai and Delhi.
    """
    patterns = [
        r"([A-Za-z][A-Za-z .'-]{0,40}?)\s+(?:vs\.?|versus|and|or|with|to)\s+([A-Za-z][A-Za-z .'-]{0,40})",
        r"(?:compare|between)\s+([A-Za-z][A-Za-z .'-]{0,40}?)\s+(?:and|with|vs\.?|versus|to)\s+([A-Za-z][A-Za-z .'-]{0,40})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        first = (
            re.sub(r"^(?:compare|between)\s+", "", match.group(1), flags=re.IGNORECASE)
            .strip(" .,'")
            .title()
        )
        second = match.group(2).strip(" .,'").title()
        if (
            len(first) >= 1
            and len(second) >= 1
            and first.lower() not in FILLER_WORDS
            and second.lower() not in FILLER_WORDS
        ):
            return first, second
    return None


# ---------------------------------------------------------------------------
# Response templates (our own wording in each language)
# ---------------------------------------------------------------------------
def _condition_names(condition: str, lang: str) -> str:
    table = {
        "hi": {
            "Clear Sky": "साफ आसमान",
            "Partly Cloudy": "हल्के बादल",
            "Heavy Rain": "भारी बारिश",
            "Thunderstorm": "गरज के साथ बारिश",
        },
        "mr": {
            "Clear Sky": "निरभ्र आकाश",
            "Partly Cloudy": "अंशतः ढगाळ",
            "Heavy Rain": "मुसळधार पाऊस",
            "Thunderstorm": "मेघगर्जनेसह पाऊस",
        },
        "ta": {
            "Clear Sky": "தெளிவான வானம்",
            "Partly Cloudy": "பகுதி மேகமூட்டம்",
            "Heavy Rain": "கனமழை",
            "Thunderstorm": "இடியுடன் மழை",
        },
        "te": {
            "Clear Sky": "నిర్మలమైన ఆకాశం",
            "Partly Cloudy": "పాక్షిక మేఘాలు",
            "Heavy Rain": "భారీ వర్షం",
            "Thunderstorm": "ఉరుములతో వర్షం",
        },
        "bn": {
            "Clear Sky": "পরিষ্কার আকাশ",
            "Partly Cloudy": "আংশিক মেঘলা",
            "Heavy Rain": "ভারী বৃষ্টি",
            "Thunderstorm": "বজ্রসহ বৃষ্টি",
        },
        "gu": {
            "Clear Sky": "સ્વચ્છ આકાશ",
            "Partly Cloudy": "આંશિક વાદળછાયું",
            "Heavy Rain": "ભારે વરસાદ",
            "Thunderstorm": "વીજળી સાથે વરસાદ",
        },
        "pa": {
            "Clear Sky": "ਸਾਫ਼ ਅਸਮਾਨ",
            "Partly Cloudy": "ਕੁਝ ਬੱਦਲ",
            "Heavy Rain": "ਭਾਰੀ ਮੀਂਹ",
            "Thunderstorm": "ਤੂਫ਼ਾਨੀ ਮੀਂਹ",
        },
        "kn": {
            "Clear Sky": "ಸ್ವಚ್ಛ ಆಕಾಶ",
            "Partly Cloudy": "ಭಾಗಶಃ ಮೋಡ",
            "Heavy Rain": "ಭಾರೀ ಮಳೆ",
            "Thunderstorm": "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
        },
        "ml": {
            "Clear Sky": "തെളിഞ്ഞ ആകാശം",
            "Partly Cloudy": "ഭാഗികമായി മേഘാവൃതം",
            "Heavy Rain": "കനത്ത മഴ",
            "Thunderstorm": "ഇടിമിന്നലോടെ മഴ",
        },
        "or": {
            "Clear Sky": "ସ୍ୱଚ୍ଛ ଆକାଶ",
            "Partly Cloudy": "ଆଂଶିକ ମେଘୁଆ",
            "Heavy Rain": "ଭାରୀ ବର୍ଷା",
            "Thunderstorm": "ବଜ୍ରପାତ ସହ ବର୍ଷା",
        },
    }
    return table.get(lang, {}).get(condition, condition)


TEMPLATES = {
    "en": {
        "speech": "In {place}, it is {temp} degrees with {cond}. Rain chance {rain} percent.",
        "title": "Weather for {place}, {state}",
        "body": (
            "Currently **{cond}** at **{temp}°C** (feels like **{feels}°C**).\n\n"
            "- High **{tmax}°C** / Low **{tmin}°C**\n"
            "- Rain chance **{rain}%** ({precip} mm recorded)\n"
            "- Wind **{wind} km/h {wdir}**, humidity **{hum}%**, pressure **{pres} hPa**\n"
            "- AQI **{aqi}** ({aqi_status}) · UV **{uv}** · Sunrise **{rise}** · Sunset **{set}**"
        ),
        "suggest": [
            "Will it rain tomorrow in {place}?",
            "Risks in {place} this week?",
            "7-day outlook for {place}",
        ],
    },
    "hi": {
        "speech": "{place} में तापमान {temp} डिग्री और मौसम {cond} है। बारिश की संभावना {rain}% है।",
        "title": "{place}, {state} का मौसम",
        "body": (
            "फिलहाल **{cond}** और तापमान **{temp}°C** (महसूस **{feels}°C**)।\n\n"
            "- अधिकतम **{tmax}°C** / न्यूनतम **{tmin}°C**\n"
            "- बारिश की संभावना **{rain}%** ({precip} मिमी दर्ज)\n"
            "- हवा **{wind} किमी/घंटा {wdir}**, आर्द्रता **{hum}%**\n"
            "- AQI **{aqi}** ({aqi_status}) · UV **{uv}**"
        ),
        "suggest": ["कल {place} में बारिश होगी?", "{place} में जोखिम बताएं"],
    },
    "mr": {
        "speech": "{place} मध्ये तापमान {temp} अंश असून हवामान {cond} आहे. पावसाची शक्यता {rain}% आहे.",
        "title": "{place}, {state} हवामान",
        "body": (
            "सध्या **{cond}** वातावरण, तापमान **{temp}°C** (जाणवते **{feels}°C**)।\n\n"
            "- कमाल **{tmax}°C** / किमान **{tmin}°C**\n"
            "- पावसाची शक्यता **{rain}%** ({precip} मिमी नोंद)\n"
            "- वारा **{wind} किमी/तास {wdir}**, आर्द्रता **{hum}%**\n"
            "- AQI **{aqi}** ({aqi_status}) · UV **{uv}**"
        ),
        "suggest": ["उद्या {place} मध्ये पाऊस पडेल का?", "{place} मधील धोके सांगा"],
    },
    "ta": {
        "speech": "{place} இல் வெப்பநிலை {temp} டிகிரி, வானிலை {cond}. மழை வாய்ப்பு {rain} சதவீதம்.",
        "title": "{place}, {state} வானிலை",
        "body": (
            "தற்போது **{cond}**, வெப்பநிலை **{temp}°C**.\n\n"
            "- அதிகம் **{tmax}°C** / குறைவு **{tmin}°C**\n"
            "- மழை வாய்ப்பு **{rain}%** ({precip} மிமீ)\n"
            "- காற்று **{wind} கிமீ/மணி**, ஈரப்பதம் **{hum}%**\n"
            "- AQI **{aqi}** ({aqi_status})"
        ),
        "suggest": ["நாளை {place} மழை பெய்யுமா?"],
    },
    "te": {
        "speech": "{place} లో ఉష్ణోగ్రత {temp} డిగ్రీలు, వాతావరణం {cond}. వర్ష అవకాశం {rain} శాతం.",
        "title": "{place}, {state} వాతావరణం",
        "body": (
            "ప్రస్తుతం **{cond}**, ఉష్ణోగ్రత **{temp}°C**.\n\n"
            "- గరిష్ఠ **{tmax}°C** / కనిష్ఠ **{tmin}°C**\n"
            "- వర్ష అవకాశం **{rain}%** ({precip} మిమీ)\n"
            "- గాలి **{wind} కిమీ/గం**, తేమ **{hum}%**\n"
            "- AQI **{aqi}** ({aqi_status})"
        ),
        "suggest": ["రేపు {place} లో వర్షం పడుతుందా?"],
    },
    "bn": {
        "speech": "{place} এ তাপমাত্রা {temp} ডিগ্রি, আবহাওয়া {cond}। বৃষ্টির সম্ভাবনা {rain}%।",
        "title": "{place}, {state} আবহাওয়া",
        "body": (
            "বর্তমানে **{cond}**, তাপমাত্রা **{temp}°C**.\n\n"
            "- সর্বোচ্চ **{tmax}°C** / সর্বনিম্ন **{tmin}°C**\n"
            "- বৃষ্টির সম্ভাবনা **{rain}%** ({precip} মিমি)\n"
            "- বাতাস **{wind} কিমি/ঘণ্টা**, আর্দ্রতা **{hum}%**"
        ),
        "suggest": ["কাল {place} এ বৃষ্টি হবে?"],
    },
    "gu": {
        "speech": "{place} માં તાપમાન {temp} ડિગ્રી, હવામાન {cond}. વરસાદની શક્યતા {rain}% છે.",
        "title": "{place}, {state} હવામાન",
        "body": (
            "હાલમાં **{cond}**, તાપમાન **{temp}°C**.\n\n"
            "- મહત્તમ **{tmax}°C** / લઘુત્તમ **{tmin}°C**\n"
            "- વરસાદની શક્યતા **{rain}%** ({precip} મિમી)"
        ),
        "suggest": ["કાલે {place} માં વરસાદ પડશે?"],
    },
    "pa": {
        "speech": "{place} ਵਿੱਚ ਤਾਪਮਾਨ {temp} ਡਿਗਰੀ, ਮੌਸਮ {cond}। ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ {rain}% ਹੈ।",
        "title": "{place}, {state} ਮੌਸਮ",
        "body": (
            "ਇਸ ਵੇਲੇ **{cond}**, ਤਾਪਮਾਨ **{temp}°C**.\n\n"
            "- ਵੱਧ **{tmax}°C** / ਘੱਟ **{tmin}°C**\n"
            "- ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ **{rain}%** ({precip} ਮਿਮੀ)"
        ),
        "suggest": ["ਕੱਲ੍ਹ {place} ਵਿੱਚ ਮੀਂਹ ਪਵੇਗਾ?"],
    },
    "kn": {
        "speech": "{place} ನಲ್ಲಿ ತಾಪಮಾನ {temp} ಡಿಗ್ರಿ, ಹವಾಮಾನ {cond}. ಮಳೆ ಸಾಧ್ಯತೆ {rain}%.",
        "title": "{place}, {state} ಹವಾಮಾನ",
        "body": (
            "ಪ್ರಸ್ತುತ **{cond}**, ತಾಪಮಾನ **{temp}°C**.\n\n"
            "- ಗರಿಷ್ಠ **{tmax}°C** / ಕನಿಷ್ಠ **{tmin}°C**\n"
            "- ಮಳೆ ಸಾಧ್ಯತೆ **{rain}%** ({precip} ಮಿಮೀ)"
        ),
        "suggest": ["ನಾಳೆ {place} ನಲ್ಲಿ ಮಳೆ ಬರುತ್ತದೆಯೇ?"],
    },
    "ml": {
        "speech": "{place} ൽ താപനില {temp} ഡിഗ്രി, കാലാവസ്ഥ {cond}. മഴ സാധ്യത {rain}% ആണ്.",
        "title": "{place}, {state} കാലാവസ്ഥ",
        "body": (
            "നിലവിൽ **{cond}**, താപനില **{temp}°C**.\n\n"
            "- കൂടിയ **{tmax}°C** / കുറഞ്ഞ **{tmin}°C**\n"
            "- മഴ സാധ്യത **{rain}%** ({precip} മിമീ)"
        ),
        "suggest": ["നാളെ {place} ൽ മഴ പെയ്യുമോ?"],
    },
    "or": {
        "speech": "{place} ରେ ତାପମାତ୍ରା {temp} ଡିଗ୍ରୀ, ପାଣିପାଗ {cond}। ବର୍ଷା ସମ୍ଭାବନା {rain}%।",
        "title": "{place}, {state} ପାଣିପାଗ",
        "body": (
            "ବର୍ତ୍ତମାନ **{cond}**, ତାପମାତ୍ରା **{temp}°C**.\n\n"
            "- ସର୍ବାଧିକ **{tmax}°C** / ସର୍ବନିମ୍ନ **{tmin}°C**\n"
            "- ବର୍ଷା ସମ୍ଭାବନା **{rain}%** ({precip} ମିମି)"
        ),
        "suggest": ["କାଲି {place} ରେ ବର୍ଷା ହେବ କି?"],
    },
}

ACTIONS = [
    {"label": "Open forecast", "action": "open_dashboard"},
    {"label": "View map", "action": "open_map"},
    {"label": "Check alerts", "action": "open_alerts"},
]


def _render_weather(
    place: str, state: str, data: WeatherData, lang: str
) -> Tuple[str, str]:
    """Fill the language template with tool-provided numbers."""
    template = TEMPLATES.get(lang, TEMPLATES["en"])
    rain = data.hourly[0].rain_prob if data.hourly else 0
    today = data.daily[0] if data.daily else None
    cond = _condition_names(data.condition, lang)
    values = {
        "place": place,
        "state": state,
        "cond": cond,
        "temp": data.current_temp,
        "feels": data.feels_like,
        "tmax": today.temp_max if today else data.current_temp,
        "tmin": today.temp_min if today else data.current_temp,
        "rain": rain,
        "precip": data.precipitation,
        "wind": data.wind_speed,
        "wdir": data.wind_direction,
        "hum": data.humidity,
        "pres": data.pressure,
        "aqi": _aqi_label(data),
        "aqi_status": data.aqi_status,
        "uv": f"{data.uv_index} (estimated)"
        if not data.uv_index_source.startswith("Open-Meteo")
        else data.uv_index,
        "rise": data.sunrise,
        "set": data.sunset,
    }
    speech = template["speech"].format(**values)
    markdown = f"### {template['title'].format(**values)}\n\n" + template[
        "body"
    ].format(**values)
    markdown += (
        f"\n\n_Source: {data.data_source} · {data.status} · "
        f"Updated {data.updated_at_ist or 'just now'}_"
    )
    if data.status == "LIVE" and data.data_type.lower() == "forecast":
        markdown += "\n\n_These are live-retrieved model forecast values, not direct station observations. AQI provenance is shown beside the value; when the live AQI feed is unavailable, the source is labelled as an estimate._"
        if data.uv_index_source.startswith(
            "Estimated"
        ) or data.visibility_source.startswith("Estimated"):
            markdown += "\n\n_The selected model omitted UV and/or visibility, so any displayed fallback value is explicitly estimated._"
    return speech, markdown


def _ask_location(
    text: str,
    lang: str,
    persona: str,
    message: str,
    candidates: Optional[List[Dict]] = None,
) -> ChatResponse:
    matches = candidates or []
    markdown = message
    if matches:
        lines = []
        for item in matches[:5]:
            label = ", ".join(
                part
                for part in (item.get("name"), item.get("state"), item.get("country"))
                if part
            )
            lines.append(f"- **{label}** ({item.get('confidence', 0):.2f})")
        markdown += "\n\n**Possible matches**\n" + "\n".join(lines)
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=message,
        markdown_response=markdown,
        quick_suggestions=["Search for a city", "Enable location access"],
        suggested_actions=ACTIONS,
        explicit_location=False,
        location_resolved=False,
        location_candidates=matches,
        needs_location_confirmation=bool(matches),
        data_type="NO_DATA",
        freshness="NOT_APPLICABLE",
    )


def _unresolved_response(
    text: str, lang: str, persona: str, place: str
) -> ChatResponse:
    message = (
        f"I could not resolve **{place}** to a verified location, so I am not "
        "showing weather for a guessed city. Please add the state or district, "
        "or choose a nearby city."
    )
    response = _ask_location(text, lang, persona, message)
    response.speech_text = f"I could not resolve {place} to a verified location. No default-city weather was substituted."
    return response


def _provider_unavailable(
    text: str, lang: str, persona: str, place: str, detail: str
) -> ChatResponse:
    message = (
        f"The weather provider is temporarily unavailable for **{place}**. "
        "No synthetic weather values were substituted. Please try again shortly."
    )
    if detail:
        message += f"\n\n_Provider detail: {detail}_"
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=f"Weather data for {place} is temporarily unavailable. No synthetic values were substituted.",
        markdown_response=message,
        data_type="UNAVAILABLE",
        freshness="UNAVAILABLE",
        limitations=[
            "Provider unavailable; no weather values are shown rather than guessed."
        ],
        tool_trace=[
            {
                "tool": "get_weather",
                "status": "UNAVAILABLE",
                "duration_ms": None,
                "source": None,
            }
        ],
        quick_suggestions=["Try again", "Choose another city"],
        suggested_actions=ACTIONS,
        explicit_location=True,
        location_resolved=True,
    )


def _greeting_reply(text: str, lang: str, persona: str) -> ChatResponse:
    message = (
        "Namaste! I am **WeatherGPT**. Ask me about current weather, tomorrow's "
        "forecast, rain outlook, official IMD warnings, travel weather risk, air "
        "quality, marine or aviation conditions, farm advice, or climate context. "
        "I only fetch weather when your question needs it."
    )
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text="Namaste! I am WeatherGPT. Ask me about weather, forecasts, warnings, travel risk or farm advice.",
        markdown_response=message,
        quick_suggestions=[
            "Weather in Vijayawada",
            "Will it rain tomorrow?",
            "Any official IMD warning?",
        ],
        suggested_actions=ACTIONS,
        data_type="NO_DATA",
        freshness="NOT_APPLICABLE",
    )


def _help_reply(text: str, lang: str, persona: str) -> ChatResponse:
    message = (
        "### What I can do\n\n"
        "- **Current conditions** — temperature, feels-like, humidity, wind, rain chance, AQI where available.\n"
        "- **Forecasts** — tomorrow, next 24–72 hours, and the 7-day outlook.\n"
        "- **Official warnings** — IMD district nowcast bulletins, reproduced with source and link; computed risk is shown separately.\n"
        "- **Comparison and models** — two places, or GFS / ECMWF / DWD ICON model spread.\n"
        "- **Specialist reads** — travel weather risk, flood proxy, air quality, marine, aviation, agriculture, climate history.\n"
        "- **Conversation controls** — Stop, Regenerate, Copy, New chat, Export and voice input where the browser supports it.\n\n"
        "I do not invent missing readings, warnings or citations."
    )
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text="I can answer weather, forecast, official warning, comparison, travel, air quality and farm questions.",
        markdown_response=message,
        quick_suggestions=[
            "Weather in Vijayawada",
            "Compare Vijayawada and Hyderabad",
            "Official warning for Vijayawada",
        ],
        suggested_actions=ACTIONS,
        data_type="NO_DATA",
        freshness="NOT_APPLICABLE",
    )


def _meta_reply(text: str, lang: str, persona: str) -> ChatResponse:
    status = provider_status(check_live=False)
    configured = ", ".join(status.get("configured_providers") or []) or "none"
    selected = status.get("selected_provider") or "none"
    model = status.get("selected_model") or "none"
    message = (
        "### How this answer is produced\n\n"
        "- **Configured provider:** " + configured + "\n"
        f"- **Selected provider / model:** {selected} / {model}\n"
        f"- **Active inference:** {status.get('active_inference', 'DETERMINISTIC')} — the weather answer is assembled by deterministic tools, not generated by an LLM.\n"
        f"- **Provider health:** {status.get('health', 'NOT_CHECKED')} (health is only checked when requested)\n"
        f"- **Deterministic fallback:** {status.get('fallback', 'always available')}\n\n"
        "Weather numbers come from the data tools below the answer. An optional LLM "
        "explanation layer, when configured, may rephrase those validated facts but "
        "cannot add or change weather values. No API keys or credentials are exposed."
    )
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text="Weather answers are produced by deterministic tools. The configured provider is separate from the active deterministic inference engine.",
        markdown_response=message,
        suggested_actions=ACTIONS,
        data_type="NO_DATA",
        freshness="NOT_APPLICABLE",
    )


def _official_warning_reply(
    text: str, lang: str, persona: str, place: str
) -> ChatResponse:
    candidates = geo.resolve_candidates(place, limit=5)
    if not candidates:
        return _unresolved_response(text, lang, persona, place)
    chosen = candidates[0]
    name = chosen.get("name") or place
    state = chosen.get("state") or ""

    hazard_words = [
        word
        for word in (
            "heavy rain",
            "rainfall",
            "cyclone",
            "heatwave",
            "heat wave",
            "thunderstorm",
            "lightning",
            "flood",
            "storm",
        )
        if word in text.lower()
    ]
    trace = [
        {
            "tool": "get_official_warnings",
            "status": "UNKNOWN",
            "duration_ms": None,
            "source": "India Meteorological Department",
        }
    ]
    try:
        feed = get_imd_rss_warnings(limit=25)
    except Exception:
        feed = {"status": "UNAVAILABLE", "items": [], "error": "feed request failed"}
    status = str(feed.get("status", "UNAVAILABLE")).upper()
    items = feed.get("items") or []

    if status != "LIVE":
        trace[0]["status"] = "UNAVAILABLE"
        message = (
            f"### Official IMD warnings — {name}, {state}\n\n"
            "The official India Meteorological Department district-nowcast feed is "
            "**unavailable right now**. I am not substituting a computed risk score "
            "or inventing a warning.\n\n"
            "Check the official source directly: https://mausam.imd.gov.in/\n\n"
            "_This is a retrieval failure, not a statement that no warning exists._"
        )
        return ChatResponse(
            query=text,
            detected_language=lang,
            persona=persona,
            speech_text="The official IMD warning feed is unavailable right now. No warning is substituted.",
            markdown_response=message,
            official_alert_status="UNAVAILABLE",
            provenance=official_provenance(),
            sources=official_provenance()["sources"],
            data_type="OFFICIAL_WARNING",
            freshness="UNAVAILABLE",
            limitations=[
                "Official feed unavailable; no computed warning was substituted."
            ],
            tool_trace=trace,
            suggested_actions=ACTIONS,
            explicit_location=True,
            location_resolved=True,
        )

    matches = filter_warnings(
        items, state=state, district=name, keywords=hazard_words or None
    )
    if not matches:
        matches = filter_warnings(items, state=state, keywords=hazard_words or None)
    if not matches and state:
        matches = filter_warnings(items, state=state)

    if not matches:
        trace[0]["status"] = "NO_MATCH"
        message = (
            f"### Official IMD warnings — {name}, {state}\n\n"
            "No matching item was found in the official IMD district-nowcast feed "
            "at retrieval time. **This does not prove there is no warning.**\n\n"
            f"Official source: {feed.get('source', 'https://mausam.imd.gov.in/')}\n\n"
            "_The app's computed risk score is separate and is not an official warning._"
        )
        return ChatResponse(
            query=text,
            detected_language=lang,
            persona=persona,
            speech_text=f"No matching official IMD warning was found for {name}. Check the official source.",
            markdown_response=message,
            official_alert_status="NO_MATCH",
            provenance=official_provenance(),
            sources=official_provenance()["sources"],
            data_type="OFFICIAL_WARNING",
            freshness="FRESH",
            limitations=[
                "No matching official item found; this is not proof that no warning exists."
            ],
            tool_trace=trace,
            suggested_actions=ACTIONS,
            explicit_location=True,
            location_resolved=True,
        )

    trace[0]["status"] = "OK"
    lines = []
    for item in matches[:5]:
        title = item.get("title") or "Official IMD item"
        published = item.get("published") or "time not supplied"
        link = item.get("link") or ""
        description = item.get("description") or ""
        line = f"- **{title}** — {published}"
        if description:
            line += f"\n  {description}"
        if link:
            line += f"\n  [Official source]({link})"
        lines.append(line)
    message = (
        f"### Official IMD warnings — {name}, {state}\n\n"
        "These items are reproduced from the official India Meteorological "
        "Department district-nowcast feed. WeatherGPT does not reinterpret or "
        "upgrade them.\n\n"
        + "\n".join(lines)
        + "\n\n_Official warning text takes precedence over any computed risk score._"
    )
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=f"{len(matches)} official IMD warning item(s) matched {name}. Read the official source for instructions.",
        markdown_response=message,
        official_alerts=matches,
        official_alert_status="MATCHED",
        provenance=official_provenance(),
        sources=official_provenance()["sources"],
        data_type="OFFICIAL_WARNING",
        freshness="FRESH",
        limitations=[
            "Official text is reproduced as published; check the link for the authoritative bulletin."
        ],
        tool_trace=trace,
        suggested_actions=ACTIONS,
        explicit_location=True,
        location_resolved=True,
    )


def _model_comparison_reply(
    text: str, lang: str, persona: str, place: str
) -> ChatResponse:
    candidates = geo.resolve_candidates(place, limit=5)
    if not candidates:
        return _unresolved_response(text, lang, persona, place)
    chosen = candidates[0]
    name = chosen.get("name") or place
    state = chosen.get("state") or ""
    raw_lat, raw_lon = chosen.get("lat"), chosen.get("lon")
    if raw_lat is None or raw_lon is None:
        return _unresolved_response(text, lang, persona, place)
    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except (TypeError, ValueError):
        return _unresolved_response(text, lang, persona, place)
    models = [("GFS", "gfs"), ("ECMWF", "ecmwf"), ("DWD ICON", "icon")]
    rows = []
    values = []
    errors = {}
    first_data = None
    trace = []
    for label, model in models:
        try:
            data = get_weather(lat, lon, name, state, model=model)
            rain = data.hourly[0].rain_prob if data.hourly else None
            rows.append((label, data.current_temp, rain, data.wind_speed, "OK"))
            values.append(data.current_temp)
            if first_data is None:
                first_data = data
            trace.append(
                {
                    "tool": f"get_weather:{model}",
                    "status": "OK",
                    "duration_ms": None,
                    "source": "Open-Meteo model endpoints",
                }
            )
        except Exception as exc:
            errors[label] = type(exc).__name__
            rows.append((label, None, None, None, "UNAVAILABLE"))
            trace.append(
                {
                    "tool": f"get_weather:{model}",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "Open-Meteo model endpoints",
                }
            )
    if first_data is None:
        return _provider_unavailable(
            text,
            lang,
            persona,
            name,
            "All three model endpoints failed. No values were substituted.",
        )
    spread = round(max(values) - min(values), 1) if len(values) > 1 else None
    table = "| Model | Temp | Rain chance | Wind | Status |\n|---|---|---|---|---|\n"
    for label, temp, rain, wind, status in rows:
        temp_text = f"{temp}°C" if temp is not None else "—"
        rain_text = f"{rain}%" if rain is not None else "—"
        wind_text = f"{wind} km/h" if wind is not None else "—"
        table += f"| {label} | {temp_text} | {rain_text} | {wind_text} | {status} |\n"
    missing = ", ".join(errors) if errors else "none"
    message = (
        f"### Forecast model comparison — {name}, {state}\n\n"
        + table
        + f"\n**Temperature spread:** {spread if spread is not None else 'not available'}°C\n"
        + f"**Unavailable models:** {missing}\n\n"
        "_Values are model-endpoint output via Open-Meteo, not observations. "
        "A spread is not an accuracy ranking, and disagreement does not identify "
        "which model is correct._"
    )
    provenance = build_weather_provenance(
        first_data, source="Open-Meteo model endpoints", model="GFS / ECMWF / DWD ICON"
    )
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=f"Comparing GFS, ECMWF and ICON for {name}. Temperature spread is {spread if spread is not None else 'not available'} degrees Celsius.",
        markdown_response=message,
        structured_weather=first_data,
        quick_suggestions=[
            f"7-day outlook for {name}",
            f"Why do models disagree in {name}?",
        ],
        suggested_actions=ACTIONS,
        provenance=provenance,
        sources=provenance["sources"],
        data_type=provenance["data_type"],
        freshness=provenance["freshness"],
        limitations=provenance["limitations"],
        tool_trace=trace,
        explicit_location=True,
        location_resolved=True,
    )


def _compare(first: str, second: str) -> CityComparisonData:
    """Side-by-side weather for two places, all figures from live tools."""
    from .risk_engine import methodology

    lat1, lon1, name1, state1 = geo.geocode(first)
    lat2, lon2, name2, state2 = geo.geocode(second)
    one = get_weather(lat1, lon1, name1, state1)
    two = get_weather(lat2, lon2, name2, state2)
    travel_one = assess_travel(one, alerts=[])
    travel_two = assess_travel(two, alerts=[])
    gap = round((one.current_temp or 0) - (two.current_temp or 0), 1)
    warmer = name1 if gap > 0 else (name2 if gap < 0 else "Equal")
    rain1 = float(one.hourly[0].rain_prob or 0) if one.hourly else 0.0
    rain2 = float(two.hourly[0].rain_prob or 0) if two.hourly else 0.0
    rainy = name1 if rain1 > rain2 else (name2 if rain2 > rain1 else "Equal")
    score = min(travel_one["score"], travel_two["score"])
    cleaner = name1 if (one.aqi or 0) <= (two.aqi or 0) else name2
    factors_one = (
        "; ".join(f"{f['name']} {f['deduction']}" for f in travel_one["factors"])
        or "no deductions"
    )
    factors_two = (
        "; ".join(f"{f['name']} {f['deduction']}" for f in travel_two["factors"])
        or "no deductions"
    )
    return CityComparisonData(
        city1=one,
        city2=two,
        temp_diff=gap,
        temp_warmer_city=warmer,
        humidity_diff=(one.humidity or 0) - (two.humidity or 0),
        aqi_better_city=cleaner,
        rain_risk_city=rainy,
        travel_safety_score=score,
        travel_advisory=(
            f"Weather-only travel risk: {name1} is {travel_one['safety']} "
            f"({travel_one['score']}/100; {factors_one}); {name2} is "
            f"{travel_two['safety']} ({travel_two['score']}/100; {factors_two}). "
            "This is not a road-safety guarantee."
        ),
        health_advisory=HealthPersonas(
            athletes=f"Cleaner air in {cleaner}; train early morning.",
            asthma_patients=f"Carry medication where AQI is higher ({max(one.aqi or 0, two.aqi or 0)}).",
            children_schools=f"Prefer outdoor play in {cleaner}.",
            elderly=f"Avoid midday heat in {warmer if warmer != 'Equal' else name1}.",
        ),
        risk_breakdown={
            "travel": {
                "city1": travel_one,
                "city2": travel_two,
                "route_score": score,
                "basis": "Minimum of the two city weather-risk scores; not a road-safety rating.",
            },
            "methodology": methodology(),
        },
    )


def _comparison_response(
    text: str, lang: str, persona: str, result: CityComparisonData
) -> ChatResponse:
    tomorrow = any(term in text.lower() for term in ("tomorrow", "next day"))
    c1, c2 = result.city1, result.city2
    breakdown = result.risk_breakdown or {}
    travel_block = breakdown.get("travel") or {}
    t1 = travel_block.get("city1") or assess_travel(c1, alerts=[])
    t2 = travel_block.get("city2") or assess_travel(c2, alerts=[])
    lines = []
    for label, travel in ((c1.location, t1), (c2.location, t2)):
        factor_text = (
            "\n".join(
                f"  - {f['name']}: {f['value']} · threshold {f['threshold']} · {f['deduction']}"
                for f in travel["factors"]
            )
            or "  - No configured weather threshold crossed."
        )
        lines.append(
            f"- **{label}:** {travel['score']}/100 ({travel['safety']})\n{factor_text}"
        )
    limitations = "\n".join(f"- {item}" for item in (t1.get("limitations") or []))
    if tomorrow and len(c1.daily) > 1 and len(c2.daily) > 1:
        d1, d2 = c1.daily[1], c2.daily[1]
        speech = (
            f"Comparing tomorrow for {c1.location} and {c2.location}. "
            f"{c1.location} high {d1.temp_max} degrees, {c2.location} high {d2.temp_max} degrees. "
            f"Weather-only travel risk is {result.travel_safety_score} out of 100."
        )
        markdown = (
            f"### Comparing {c1.location} vs {c2.location} — tomorrow ({d1.date})\n\n"
            f"| | {c1.location} | {c2.location} |\n|---|---|---|\n"
            f"| High / low | **{d1.temp_max}°C / {d1.temp_min}°C** | **{d2.temp_max}°C / {d2.temp_min}°C** |\n"
            f"| Condition | {d1.condition} | {d2.condition} |\n"
            f"| Expected rainfall | {d1.rain_sum} mm | {d2.rain_sum} mm |\n"
            f"| Max wind | {d1.wind_max} km/h | {d2.wind_max} km/h |\n\n"
            f"*Tomorrow values come from the {c1.data_source} daily forecast, not observations.*"
        )
    else:
        speech = (
            f"Comparing {c1.location} and {c2.location}. "
            f"{result.temp_warmer_city} is warmer by {abs(result.temp_diff)} degrees. "
            f"Travel risk is {result.travel_safety_score} out of 100, weather only."
        )
        markdown = (
            f"### Comparing {c1.location} vs {c2.location}\n\n"
            f"| | {c1.location} | {c2.location} |\n|---|---|---|\n"
            f"| Temp | **{c1.current_temp}°C** | **{c2.current_temp}°C** |\n"
            f"| Humidity | {c1.humidity}% | {c2.humidity}% |\n"
            f"| AQI | {_aqi_label(c1)} | {_aqi_label(c2)} |\n"
            f"| Rain chance | {c1.hourly[0].rain_prob if c1.hourly else 0}%"
            f" | {c2.hourly[0].rain_prob if c2.hourly else 0}% |\n\n"
            f"Warmer: **{result.temp_warmer_city}** (+{abs(result.temp_diff)}°C) · "
            f"Cleaner air: **{result.aqi_better_city}** · "
            f"Travel risk: **{result.travel_safety_score}/100** (weather-only, ESTIMATED)\n\n"
            f"{result.travel_advisory}"
        )
    markdown += (
        "\n\n**Why this travel score (ESTIMATED)**\n"
        + "\n".join(lines)
        + "\n\n_Limitations_\n"
        + limitations
        + "\n\n_This is weather risk only; it does not assess road condition, traffic, infrastructure or personal health._"
    )
    provenance = build_weather_provenance(c1)
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=speech,
        markdown_response=markdown,
        structured_weather=c1,
        comparison_data=result,
        quick_suggestions=[
            f"7-day outlook for {c1.location}",
            f"Risks in {c2.location}",
        ],
        suggested_actions=ACTIONS,
        explicit_location=True,
        location_resolved=True,
        provenance=provenance,
        sources=provenance["sources"],
        data_type=provenance["data_type"],
        freshness=provenance["freshness"],
        limitations=provenance["limitations"],
        tool_trace=[
            {
                "tool": "get_weather",
                "status": "OK",
                "duration_ms": None,
                "source": c1.data_source,
            },
            {
                "tool": "get_weather",
                "status": "OK",
                "duration_ms": None,
                "source": c2.data_source,
            },
            {
                "tool": "assess_travel",
                "status": "OK",
                "duration_ms": None,
                "source": "WeatherGPT travel engine",
            },
        ],
        risk_breakdown=result.risk_breakdown,
    )


def _build_extras(
    data: WeatherData,
    text: str,
    lowered: str,
    persona: str,
    proper: str,
    state: str,
    lat: float,
    lon: float,
):
    advisory = None
    briefing = None
    sea = None
    alerts = None
    extra = ""
    risk_breakdown = None
    trace = []
    wants_agri = persona == "farmer" or any(
        w in lowered
        for w in (
            "crop",
            "farmer",
            "paddy",
            "cotton",
            "wheat",
            "sugarcane",
            "soybean",
            "mustard",
            "irrigation",
            "harvest",
            "फसल",
            "शेतकरी",
        )
    )
    wants_air = persona == "aviation" or any(
        w in lowered for w in ("flight", "airport", "metar", "taf", "pilot", "runway")
    )
    wants_sea = persona == "marine" or any(
        w in lowered
        for w in (
            "sea",
            "marine",
            "ocean",
            "wave",
            "tide",
            "fisherman",
            "fishing",
            "समुद्र",
        )
    )
    wants_alert = any(
        w in lowered
        for w in (
            "cyclone",
            "alert",
            "warning",
            "flood",
            "disaster",
            "storm",
            "अलर्ट",
            "वादळ",
        )
    )
    wants_climate = any(
        w in lowered
        for w in (
            "climate",
            "monsoon",
            "history",
            "historical",
            "trend",
            "warming",
            "el nino",
            "la nina",
            "last year",
        )
    )
    wants_travel = any(
        w in lowered
        for w in (
            "travel",
            "trip",
            "journey",
            "safe to",
            "is it safe",
            "commute",
            "drive",
        )
    )
    wants_aqi = any(
        w in lowered
        for w in ("aqi", "air quality", "pollution", "smog", "pm2", "pm10", "haze")
    )
    wants_quake = any(
        w in lowered for w in ("earthquake", "tremor", "seismic", "quake")
    )
    wants_fire = any(
        w in lowered
        for w in ("wildfire", "forest fire", "fire hotspot", "burning forest")
    )
    wants_flood = any(
        w in lowered for w in ("flood", "inundation", "waterlogging", "flooded")
    )
    wants_shelter = any(
        w in lowered
        for w in (
            "shelter",
            "hospital nearby",
            "evacuat",
            "safe place",
            "assembly point",
        )
    )
    wants_solar = any(
        w in lowered
        for w in ("solar", "rooftop", "photovoltaic", "pv output", "sunshine hours")
    )

    if wants_agri:
        crop = next(
            (
                c
                for c in ("cotton", "wheat", "sugarcane", "soybean", "mustard", "paddy")
                if c in lowered
            ),
            "paddy",
        )
        rain = data.hourly[0].rain_prob if data.hourly else 20
        advisory = crop_advisory(
            crop, proper, state, data.current_temp, rain or 0, data.humidity or 0
        )
        extra += (
            f"\n\n**Farm note ({advisory.crop}):** {advisory.irrigation_advice} "
            f"{advisory.pesticide_advice}"
        )
        trace.append(
            {
                "tool": "crop_advisory",
                "status": "OK",
                "duration_ms": None,
                "source": "WeatherGPT crop advisory (deterministic)",
            }
        )
    if wants_air:
        origin = "STATIC sample"
        try:
            from .aviation_live import live_briefing

            city_to_icao = {
                "MUMBAI": "VABB",
                "DELHI": "VIDP",
                "NEW DELHI": "VIDP",
                "BENGALURU": "VOBL",
                "BANGALORE": "VOBL",
                "KOLKATA": "VECC",
                "CHENNAI": "VOMM",
                "HYDERABAD": "VOHS",
            }
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
                briefing.metar_decoded = {
                    **briefing.metar_decoded,
                    "provenance": "LIVE (NOAA ADDS)",
                }
        except Exception:
            briefing = None
        if briefing is None:
            briefing = aviation_briefing(proper)
        extra += (
            f"\n\n**Aviation ({briefing.station_icao}, {origin}):** "
            f"{briefing.flight_category} — {briefing.metar_raw}"
        )
        trace.append(
            {
                "tool": "aviation_briefing",
                "status": "OK",
                "duration_ms": None,
                "source": origin,
            }
        )
    if wants_sea:
        sea = marine_advisory(proper)
        extra += (
            f"\n\n**Marine (estimate):** {sea.wave_height_m} m waves, "
            f"{sea.sea_condition}. {sea.warning_message}"
        )
        trace.append(
            {
                "tool": "marine_advisory",
                "status": "ESTIMATED",
                "duration_ms": None,
                "source": "WeatherGPT marine estimate",
            }
        )
    precipitation_now = float(data.precipitation or 0)
    temperature_now = float(data.current_temp or 0)
    if (
        wants_alert
        or precipitation_now > 25
        or temperature_now > 42
        or persona == "disaster_manager"
    ):
        try:
            alerts = active_alerts(state=state, district=proper) or []
        except Exception:
            alerts = []
        if alerts:
            lines = "\n".join(f"- **[{a.severity}]** {a.headline}" for a in alerts[:4])
            extra += (
                f"\n\n**Computed alerts (WeatherGPT, not official):**\n{lines}\n"
                f'*Official warnings are a separate IMD check; ask "official warning for {proper}" '
                f"for the official bulletin. For life-safety decisions follow IMD/NDMA and local authorities.*"
            )
            trace.append(
                {
                    "tool": "active_alerts",
                    "status": "OK",
                    "duration_ms": None,
                    "source": "WeatherGPT computed alerts",
                }
            )
        else:
            extra += (
                f"\n\n**Computed alerts (WeatherGPT, not official):** none matched {proper}. "
                "This is not an official all-clear; official warnings are checked separately."
            )
            trace.append(
                {
                    "tool": "active_alerts",
                    "status": "NO_MATCH",
                    "duration_ms": None,
                    "source": "WeatherGPT computed alerts",
                }
            )
    if wants_climate:
        ref = climate_reference(f"{proper} ({state})")
        extra += (
            f"\n\n**Climate reference (STATIC):** {ref['summary']} "
            f"Baseline {ref['baseline_period']}; monsoon LPA {ref['lpa_monsoon_rainfall_mm']} mm."
        )
        trace.append(
            {
                "tool": "climate_reference",
                "status": "STATIC",
                "duration_ms": None,
                "source": "WeatherGPT climate reference",
            }
        )
    if wants_travel:
        travel = assess_travel(data, alerts=alerts or [])
        factor_lines = (
            "\n".join(
                f"- **{f['name']}:** {f['value']} · threshold {f['threshold']} · {f['deduction']}"
                for f in travel["factors"]
            )
            or "- No configured weather threshold crossed (no deduction)."
        )
        limitations = "\n".join(f"- {item}" for item in travel["limitations"])
        extra += (
            f"\n\n**Travel read (ESTIMATED, weather-only):** **{travel['score']}/100** · {travel['safety']}\n"
            f"{factor_lines}\n\n_Time window: {travel['time_window']}._\n\n"
            f"_Limitations:_\n{limitations}\n\n_{travel['advice']}_"
        )
        risk_breakdown = {"travel": travel}
        trace.append(
            {
                "tool": "assess_travel",
                "status": "OK",
                "duration_ms": None,
                "source": travel["source"],
            }
        )
    if wants_aqi:
        try:
            from .air_quality import get_air_quality

            live_aqi = get_air_quality(lat, lon)
            extra += (
                f"\n\n**Air quality (LIVE, {live_aqi['standard']}):** "
                f"US AQI **{live_aqi['us_aqi']}** ({live_aqi['band']}), "
                f"PM2.5 {live_aqi['pm2_5']}, PM10 {live_aqi['pm10']}. "
                f"Dominant pollutant: {live_aqi['dominant_pollutant']}."
            )
            trace.append(
                {
                    "tool": "get_air_quality",
                    "status": "LIVE",
                    "duration_ms": None,
                    "source": "Open-Meteo Air Quality",
                }
            )
        except RuntimeError:
            extra += (
                f"\n\n**Air quality (ESTIMATED fallback):** AQI **{data.aqi}** "
                f"({data.aqi_status}). Live feed unavailable right now."
            )
            trace.append(
                {
                    "tool": "get_air_quality",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "WeatherGPT AQI estimate",
                }
            )
    if wants_quake:
        try:
            from .disasters import earthquakes

            quakes = earthquakes(4.5, 7).get("events", [])[:3]
            if quakes:
                lines = "\n".join(
                    f"- **M{q['magnitude']}** {q['place']}" for q in quakes
                )
                extra += (
                    f"\n\n**Recent earthquakes (USGS, OFFICIAL third-party):**\n{lines}\n"
                    f"Geological events — not Indian government alerts."
                )
            else:
                extra += "\n\n**Earthquakes (USGS):** feed reachable, no M4.5+ events in the window."
            trace.append(
                {
                    "tool": "earthquakes",
                    "status": "OK",
                    "duration_ms": None,
                    "source": "USGS",
                }
            )
        except RuntimeError:
            extra += "\n\n**Earthquakes:** USGS feed unreachable right now — showing nothing rather than guessing."
            trace.append(
                {
                    "tool": "earthquakes",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "USGS",
                }
            )
    if wants_fire:
        try:
            from .disasters import wildfires

            fires = wildfires(12).get("events", [])[:3]
            if fires:
                lines = "\n".join(f"- **{f['title']}**" for f in fires)
                extra += f"\n\n**Open wildfires (NASA EONET, OFFICIAL third-party):**\n{lines}"
            else:
                extra += (
                    "\n\n**Wildfires (EONET):** feed reachable, no open fires listed."
                )
            trace.append(
                {
                    "tool": "wildfires",
                    "status": "OK",
                    "duration_ms": None,
                    "source": "NASA EONET",
                }
            )
        except RuntimeError:
            extra += "\n\n**Wildfires:** EONET feed unreachable right now — showing nothing rather than guessing."
            trace.append(
                {
                    "tool": "wildfires",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "NASA EONET",
                }
            )
    if wants_flood:
        try:
            from .flood import flood_risk

            flood = flood_risk(lat, lon, proper, state)
            extra += (
                f"\n\n**Flood proxy ({flood['risk']}, COMPUTED — unofficial):** "
                f"score {flood['score']}/100. "
                + ("; ".join(flood["drivers"]))
                + f" {flood['limits']}"
            )
            trace.append(
                {
                    "tool": "flood_risk",
                    "status": "ESTIMATED",
                    "duration_ms": None,
                    "source": "WeatherGPT flood proxy",
                }
            )
        except Exception:
            extra += "\n\n**Flood proxy:** unavailable right now — showing nothing rather than guessing."
            trace.append(
                {
                    "tool": "flood_risk",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "WeatherGPT flood proxy",
                }
            )
    if wants_shelter:
        try:
            from .places import emergency_places

            found = emergency_places(lat, lon)
            hospitals = found["facilities"].get("hospital", [])[:3]
            if hospitals:
                lines = "\n".join(
                    f"- **{h['name']}** ({h['distance_km']} km)" for h in hospitals
                )
                extra += (
                    f"\n\n**Nearest hospitals (OpenStreetMap, LIVE lookup):**\n{lines}\n"
                    f"{found['note']}"
                )
            else:
                extra += "\n\n**Nearby facilities (OpenStreetMap):** none mapped within 20 km. Call 112 for help."
            trace.append(
                {
                    "tool": "emergency_places",
                    "status": "OK",
                    "duration_ms": None,
                    "source": "OpenStreetMap",
                }
            )
        except Exception:
            extra += (
                "\n\n**Nearby facilities:** lookup unavailable — call 112 for help."
            )
            trace.append(
                {
                    "tool": "emergency_places",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "OpenStreetMap",
                }
            )
    if wants_solar:
        try:
            from .solar import solar_estimate

            solar = solar_estimate(
                data.uv_index or 0, data.cloud_cover or 0, data.sunrise, data.sunset
            )
            extra += (
                f"\n\n**Rooftop solar (ESTIMATED):** ~{solar['daily_kwh_per_kw']} kWh/day per kW "
                f"({solar['peak_sun_hours']} peak sun hours). {solar['formula']}"
            )
            trace.append(
                {
                    "tool": "solar_estimate",
                    "status": "ESTIMATED",
                    "duration_ms": None,
                    "source": "WeatherGPT solar estimate",
                }
            )
        except Exception:
            extra += "\n\n**Solar estimate:** unavailable right now."
            trace.append(
                {
                    "tool": "solar_estimate",
                    "status": "UNAVAILABLE",
                    "duration_ms": None,
                    "source": "WeatherGPT solar estimate",
                }
            )
    special = (
        wants_agri
        or wants_air
        or wants_sea
        or wants_alert
        or wants_climate
        or wants_travel
        or wants_aqi
        or wants_quake
        or wants_fire
        or wants_flood
        or wants_shelter
        or wants_solar
    )
    return advisory, briefing, sea, alerts, extra, risk_breakdown, trace, special


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
    intent = classify_intent(text, lang)

    if intent == "greeting":
        return _greeting_reply(text, lang, persona)
    if intent == "help":
        return _help_reply(text, lang, persona)
    if intent == "meta":
        return _meta_reply(text, lang, persona)
    if intent == "model_comparison":
        place, _ = extract_place_meta(text, request.location_name)
        if not place:
            return _ask_location(
                text,
                lang,
                persona,
                "Please name the location for the model comparison, for example: Compare ECMWF and GFS for Vijayawada.",
            )
        return _model_comparison_reply(text, lang, persona, place)
    if intent == "official_alert":
        place, _ = extract_place_meta(text, request.location_name)
        if not place:
            return _ask_location(
                text,
                lang,
                persona,
                "Please name the city or district for the official IMD warning check.",
            )
        return _official_warning_reply(text, lang, persona, place)
    if intent == "comparison":
        pair = extract_pair(text)
        if pair is None:
            return _ask_location(
                text,
                lang,
                persona,
                "Please name both places to compare, for example: Compare Vijayawada and Hyderabad.",
            )
        first, second = pair
        try:
            result = _compare(first, second)
        except HTTPException as exc:
            return _provider_unavailable(
                text, lang, persona, f"{first} / {second}", str(exc.detail)
            )
        except Exception:
            return _provider_unavailable(
                text,
                lang,
                persona,
                f"{first} / {second}",
                "Comparison data could not be retrieved. No values were substituted.",
            )
        return _comparison_response(text, lang, persona, result)

    place, explicit = extract_place_meta(text, request.location_name)
    if not place:
        return _ask_location(
            text,
            lang,
            persona,
            "Please choose a location or enter a city name before requesting location-specific weather.",
        )

    candidates = geo.resolve_candidates(place, limit=5)
    if not candidates:
        return _unresolved_response(text, lang, persona, place)
    if len(candidates) > 1 and candidates[0].get("confidence", 0) < 0.85:
        return _ask_location(
            text,
            lang,
            persona,
            f"**{place}** matches more than one place. Please choose the correct one before I fetch weather.",
            candidates,
        )
    chosen = candidates[0]
    lat = chosen["lat"]
    lon = chosen["lon"]
    proper = chosen.get("name") or place
    state = chosen.get("state") or ""
    try:
        data = get_weather(lat, lon, proper, state)
    except HTTPException as exc:
        return _provider_unavailable(text, lang, persona, proper, str(exc.detail))
    except Exception:
        return _provider_unavailable(
            text,
            lang,
            persona,
            proper,
            "The weather provider did not return complete data. No synthetic values were substituted.",
        )

    (
        advisory,
        briefing,
        sea,
        alerts,
        extra,
        risk_breakdown,
        extra_trace,
        special_intent,
    ) = _build_extras(data, text, lowered, persona, proper, state, lat, lon)

    speech, markdown = _render_weather(proper, state, data, lang)
    tomorrow_terms = (
        "tomorrow",
        "tomorrow's",
        "repu",
        "कल",
        "उद्या",
        "நாளை",
        "రేపు",
        "আগামীকাল",
        "ನಾಳೆ",
        "ನാളെ",
        "કાલે",
        "କାଲି",
    )
    if (
        not special_intent
        and len(data.daily) > 1
        and any(term in lowered for term in tomorrow_terms)
    ):
        tomorrow = data.daily[1]
        tt = tomorrow_text(lang)
        cond = _condition_names(tomorrow.condition, lang)
        rain_text = tt["rain_yes"] if tomorrow.rain_sum >= 0.1 else tt["rain_no"]
        speech = tt["speech"].format(
            place=proper,
            cond=cond,
            tmax=tomorrow.temp_max,
            tmin=tomorrow.temp_min,
            rain=tomorrow.rain_sum,
        )
        markdown = (
            f"### {tt['title'].format(place=proper, state=state, date=tomorrow.date)}\n\n"
            f"- **{tt['condition']}:** {cond}\n"
            f"- **{tt['high_low']}:** {tomorrow.temp_max:g}°C / {tomorrow.temp_min:g}°C\n"
            f"- **{tt['rain']}:** {tomorrow.rain_sum} mm — {rain_text}\n"
            f"- **{tt['wind']}:** {tomorrow.wind_max} km/h\n\n"
            f"_{tt['source']}: {data.data_source} · {data.status} · {tomorrow.date}. "
            f"{tt['note']}_"
        )
    markdown += extra
    markdown += horizon_note(text)
    template = TEMPLATES.get(lang, TEMPLATES["en"])
    suggestions = [s.format(place=proper, state=state) for s in template["suggest"]]
    provenance = build_weather_provenance(data)
    return ChatResponse(
        query=text,
        detected_language=lang,
        persona=persona,
        speech_text=speech,
        markdown_response=markdown,
        structured_weather=data,
        alerts=alerts,
        agri_advisory=advisory,
        aviation_briefing=briefing,
        marine_advisory=sea,
        quick_suggestions=suggestions,
        suggested_actions=ACTIONS,
        explicit_location=explicit,
        location_resolved=True,
        provenance=provenance,
        sources=provenance["sources"],
        data_type=provenance["data_type"],
        freshness=provenance["freshness"],
        limitations=provenance["limitations"],
        tool_trace=[
            {
                "tool": "get_weather",
                "status": "OK",
                "duration_ms": None,
                "source": data.data_source,
            },
            *extra_trace,
        ],
        risk_breakdown=risk_breakdown,
    )
