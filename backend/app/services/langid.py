"""Deterministic language + intent analysis. Original implementation.

No ML model, no paid API. Two signals:
  1. Unicode script ranges (native scripts) — high confidence.
  2. Romanized weather-domain vocabulary scoring (Latin script) — the
     common Hinglish/Tanglish-style queries other detectors miss.

Returns language, script, confidence, intent, and a normalized query.
Confidence is a documented heuristic, not a measured probability.
"""
import re
from typing import Dict, List, Tuple

SUPPORTED = ("en", "hi", "mr", "ta", "te", "bn", "gu", "pa", "kn", "ml", "or")

# Native-script keyword anchors (short, our own selection).
SCRIPT_KEYWORDS = {
    "ta": ["வானிலை", "மழை", "வெப்பநிலை", "இன்று", "நாளை", "பெய்யுமா"],
    "te": ["వాతావరణం", "వర్షం", "ఉష్ణోగ్రత", "రేపు", "ఈరోజు", "ఎలా"],
    "bn": ["আবহাওয়া", "বৃষ্টি", "তাপমাত্রা", "আজ", "কাল", "কেমন"],
    "gu": ["હવામાન", "વરસાદ", "તાપમાન", "આજે", "કાલે", "કેવું"],
    "pa": ["ਮੌਸਮ", "ਮੀਂਹ", "ਤਾਪਮਾਨ", "ਅੱਜ", "ਕੱਲ੍ਹ", "ਕਿਵੇਂ"],
    "kn": ["ಹವಾಮಾನ", "ಮಳೆ", "ತಾಪಮಾನ", "ಇಂದು", "ನಾಳೆ", "ಹೇಗಿದೆ"],
    "ml": ["കാലാവസ്ഥ", "മഴ", "താപനില", "ഇന്ന്", "നാളെ", "പെയ്യുമോ"],
    "or": ["ପାଣିପାଗ", "ବର୍ଷା", "ତାପମାତ୍ରା", "ଆଜି", "କାଲି", "ହେବ"],
}

# Romanized weather-domain + function vocabulary per language.
ROMAN_VOCAB: Dict[str, Tuple[str, ...]] = {
    "en": ("weather", "rain", "temperature", "forecast", "today", "tomorrow",
           "tonight", "travel", "safe", "safety", "alert", "warning", "cyclone",
           "storm", "flood", "humidity", "wind", "cloud", "sunny", "hot", "cold",
           "climate", "monsoon", "compare", "versus", "aqi", "pollution",
           "flight", "airport", "marine", "sea", "wave", "crop", "farmer",
           "earthquake", "wildfire", "risk", "advisory", "celsius"),
    "hi": ("baarish", "barish", "barsaat", "mausam", "tapman", "tapmaan",
           "garmi", "sardi", "thand", "hawa", "toofan", "bijli", "bijali",
           "kisan", "fasal", "khet", "kal", "aaj", "kaisa", "kaisi", "kaise",
           "kya", "hoga", "hogi", "honge", "hai", "mein", "kahan", "batao",
           "chetavni", "khatra", "safar", "yatra", "tapmaan", "dilli"),
    "mr": ("paus", "pauus", "havaman", "havaamaan", "garami", "thandi",
           "vaara", "vaaryane", "shetkari", "pik", "udya", "aaj", "kasa",
           "kashi", "aahe", "madhye", "sanga", "ishara", "dhoka", "pravas",
           "us", "kapus", "mumbai", "pune"),
    "te": ("varsham", "vaana", "vataavaranam", "ushnota", "chali", "veyi",
           "gaali", "toofan", "raithu", "pantalu", "repu", "eeroju", "ila",
           "ela", "undi", "undi", "cheppandi", "hechcharika", "pramadam",
           "prayanam", "lo", "emi", "eppudu", "padutundi", "naaku"),
    "ta": ("mazhai", "vaanam", "veyil", "kulir", "kuluru", "kaatru",
           "vivasayi", "payir", "naalai", "indru", "eppadi", "eppo",
           "varum", "peyyuma", "sollunga", "sollu", "echarikkai", "payanam",
           "puyal", "vellam"),
    "kn": ("male", "havamana", "havaamana", "tapamaana", "bisilu", "chali",
           "gaali", "raitha", "bele", "naale", "nina", "indu", "hege",
           "heli", "helu", "muchcharike", "apaya", "prayaana", "barutte"),
    "ml": ("mazha", "kalavastha", "veyil", "thanuppu", "kaattu", "krishi",
           "karshakan", "naale", "innu", "engane", "eppo", "peyyumo",
           "parayamo", "parayu", "munnariyippu", "yatra", "kolllu", "kattu"),
    "bn": ("brishti", "bristi", "abhawa", "abohawa", "gorom", "thanda",
           "hawa", "jhor", "krishak", "foshol", "aaj", "kaal", "kemon",
           "hobe", "bolo", "bolun", "satarkata", "bipod", "safar", "tufan"),
    "gu": ("varshad", "varsad", "havaman", "taapman", "tapman", "garmi",
           "thandi", "pawan", "khedut", "paak", "aaje", "kaale", "kevu",
           "padshe", "kaho", "chetavani", "musafari", "vavazoda"),
    "pa": ("meenh", "minh", "mausam", "tapmaan", "garmi", "thand", "hawa",
           "toofan", "kisan", "fasal", "ajj", "kallh", "kalh", "kiven",
           "dasso", "chetavni", "safar", "bijli"),
    "or": ("barsha", "barshaa", "panipaga", "garama", "thanda", "pabana",
           "chaashi", "phasal", "aji", "kaali", "kemiti", "heba", "kuha",
           "bipada", "bipad", "jatra", "bijuli"),
}

INTENTS: List[Tuple[str, Tuple[str, ...]]] = [
    ("compare", ("compare", " vs ", "versus", "hotter than", "colder than", "warmer than")),
    ("cyclone", ("cyclone", "toofan", "puyal", "vadhal", "tufan")),
    ("agriculture", ("crop", "farmer", "paddy", "cotton", "wheat", "sugarcane", "soybean",
                      "mustard", "irrigation", "harvest", "kisan", "fasal", "raithu",
                      "pantalu", "vivasayi", "shetkari", "khedut", "krishak", "spray",
                      "pesticide", "chaashi", "karshakan")),
    ("aviation", ("flight", "airport", "metar", "taf", "pilot", "runway", "ifr", "vfr")),
    ("marine", ("sea", "marine", "ocean", "wave", "tide", "fisherman", "fishing",
                "samudra", "kadal", "samudram")),
    ("alerts", ("alert", "warning", "flood", "disaster", "storm", "chetavni",
                "khatra", "bipod", "bipada", "echarikkai", "muchcharike", "apaya")),
    ("climate", ("climate", "monsoon", "history", "historical", "trend", "warming",
                 "el nino", "la nina", "jalvayu")),
    ("travel", ("travel", "trip", "journey", "safe to", "is it safe", "commute",
                "drive", "safar", "yatra", "prayanam", "payanam", "musafari", "jatra")),
    ("aqi", ("aqi", "air quality", "pollution", "smog", "pm2", "pm10", "haze", "dhund")),
    ("earthquake", ("earthquake", "tremor", "seismic", "quake", "bhookamp")),
    ("wildfire", ("wildfire", "forest fire", "fire hotspot", "jungle fire", "kaadu ಬೆಂಕಿ")),
    ("rain", ("rain", "baarish", "barish", "varsham", "mazhai", "male", "mazha",
              "brishti", "varshad", "meenh", "barsha", "paus", "barsaat", "rainfall")),
    ("weather_forecast", ("weather", "forecast", "temperature", "mausam", "havaman",
                           "vataavaranam", "kalavastha", "panipaga", "abhawa", "havamana")),
]

SCRIPT_RANGES = [
    ("ta", 0x0B80, 0x0BFF), ("te", 0x0C00, 0x0C7F), ("bn", 0x0980, 0x09FF),
    ("gu", 0x0A80, 0x0AFF), ("pa", 0x0A00, 0x0A7F), ("kn", 0x0C80, 0x0CFF),
    ("ml", 0x0D00, 0x0D7F), ("or", 0x0B00, 0x0B7F),
]


def _script_of(text: str) -> str:
    for code, words in SCRIPT_KEYWORDS.items():
        if any(w in text for w in words):
            return code
    if "ಳ" in text or "ऱ" in text:
        return "mr"
    for code, lo, hi in SCRIPT_RANGES:
        if any(lo <= ord(ch) <= hi for ch in text):
            return code
    if any(0x0900 <= ord(ch) <= 0x097F for ch in text):
        return "devanagari"
    return "latin"


def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z]+", text.lower())


def _score(tokens: List[str]) -> Dict[str, int]:
    counts = {lang: 0 for lang in SUPPORTED}
    bag = set(tokens)
    for lang in SUPPORTED:
        for word in ROMAN_VOCAB[lang]:
            if word in bag:
                counts[lang] += 2 if len(word) > 4 else 1
    return counts


def detect_language(text: str) -> str:
    """Best language code; keeps previous behavior for native scripts."""
    if not (text or "").strip():
        return "en"
    script = _script_of(text)
    if script in SUPPORTED:
        return script
    if script == "devanagari":
        lowered = text.lower()
        mr_hits = sum(1 for w in ("हवामान", "पाऊस", "शेतकरी", "पुण्यात", "सांगा", "मध्ये") if w in lowered)
        return "mr" if mr_hits or "ळ" in text else "hi"
    tokens = _tokens(text)
    if not tokens:
        return "en"
    counts = _score(tokens)
    best = max(counts, key=lambda lang: (counts[lang], lang == "en"))
    if counts[best] == 0:
        # No vocabulary hit: plain English default only if it looks English;
        # otherwise still English (UI default) at low confidence.
        return "en"
    # Tie-break toward English only on equal scores.
    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    if len(top) > 1 and top[0][1] == top[1][1] and top[1][0] == "en":
        return "en"
    return best


def detect_intent(text: str) -> str:
    lowered = text.lower()
    for intent, keywords in INTENTS:
        if any(k in lowered for k in keywords):
            return intent
    return "weather_forecast"


def normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def analyze_query(text: str) -> Dict[str, object]:
    """Full analysis: language, script, confidence, intent, normalized query.

    Confidence is a documented heuristic:
      native script hit 0.95 · strong vocab margin 0.85 · weak/none 0.4–0.6.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return {"language": "en", "script": "latin", "confidence": 0.3,
                "detected_intent": "weather_forecast", "normalized_query": ""}
    script = _script_of(cleaned)
    if script in SUPPORTED:
        language, confidence = script, 0.95
        script_label = script
    elif script == "devanagari":
        language = detect_language(cleaned)
        confidence, script_label = 0.9, "devanagari"
    else:
        tokens = _tokens(cleaned)
        counts = _score(tokens)
        ordered = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        language = detect_language(cleaned)
        margin = ordered[0][1] - (ordered[1][1] if len(ordered) > 1 else 0)
        if ordered[0][1] == 0:
            confidence = 0.4
        elif margin >= 2:
            confidence = 0.85
        else:
            confidence = 0.6
        script_label = "latin"
    return {"language": language, "script": script_label,
            "confidence": confidence, "detected_intent": detect_intent(cleaned),
            "normalized_query": normalize_query(cleaned)}
