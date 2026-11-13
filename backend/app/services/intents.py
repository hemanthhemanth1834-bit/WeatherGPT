"""Deterministic intent classification for the assistant.

The chat pipeline must decide *what* the user is asking before it resolves a
place or fetches weather. This module is deliberately rule-based: greetings,
help and provenance questions never trigger a weather provider call, and a
warning question is routed to the official-warning path rather than being
answered with application-computed risk.

Every classifier is conservative. When no rule matches, the caller falls back
to the normal weather path, which preserves the existing behaviour for
questions the rules do not recognise.
"""

import re

GREETING_WORDS = (
    "hi",
    "hello",
    "hey",
    "namaste",
    "namaskar",
    "namaskaram",
    "vanakkam",
    "salaam",
    "good morning",
    "good afternoon",
    "good evening",
    "good night",
    "how are you",
    "how do you do",
    "whats up",
    "what's up",
)

NATIVE_GREETINGS = {
    "नमस्ते",
    "नमस्कार",
    "నమస్తే",
    "నమస్కారం",
    "வணக்கம்",
    "নমস্কার",
    "નમસ્તે",
    "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
    "ನಮಸ್ಕಾರ",
    "നമസ്കാരം",
    "ନମସ୍କାର",
}

MODEL_NAMES = ("ecmwf", "gfs", "icon", "ukmo", "noaa", "wrf")

OFFICIAL_WARNING_RE = re.compile(
    r"\b(?:official|imd|ndma)\b.{0,40}\b(?:warning|warnings|alert|bulletin|nowcast|advisory)\b"
    r"|\b(?:warning|warnings)\b"
    r"|\b(?:red|orange|yellow)\s+alert\b"
    r"|\bdistricts?\s+affected\b",
    re.IGNORECASE | re.DOTALL,
)

COMPARE_RE = re.compile(
    r"\b(?:compare|comparison|versus|vs\.?|hotter than|colder than|warmer than|"
    r"cooler than|better than|wetter than|drier than)\b",
    re.IGNORECASE,
)

MODEL_COMPARE_RE = re.compile(
    r"\b(?:model|models|forecast models?)\b.{0,40}\b(?:compare|comparison|disagree|"
    r"difference|differ|spread|versus|vs\.?)\b"
    r"|\b(?:compare|comparison|versus|vs\.?)\b.{0,40}\b(?:ecmwf|gfs|icon|ukmo|noaa|wrf)\b"
    r"|\bwhy\b.{0,40}\b(?:models?|forecast models?)\b.{0,40}\b(?:disagree|differ)\b",
    re.IGNORECASE | re.DOTALL,
)

FORECAST_RE = re.compile(
    r"\b(?:tomorrow|day after|next\s+(?:24|48|72)\s*(?:hours?|h)|"
    r"next\s+\d+\s+days?|next week|seven[- ]day|7[- ]day|this week|weekend|"
    r"forecast|outlook|will it rain|chance of rain|rain probability|"
    r"temperature|wind speed|windy|humidity)\b",
    re.IGNORECASE,
)

HELP_PHRASES = (
    "what can you do",
    "what can you help",
    "how can you help",
    "how do you help",
    "what are your capabilities",
    "your capabilities",
    "what can i ask",
    "what should i ask",
    "help me use",
    "how do i use",
    "who are you",
    "what are you",
    "features",
)

META_PHRASES = (
    "source of this answer",
    "source and update",
    "where does this data come from",
    "where did this data come from",
    "how are answers made",
    "how is this answer made",
    "how do you know",
    "what engine",
    "which model",
    "which llm",
    "are you an ai",
    "are you a language model",
    "provenance",
    "update time",
    "retrieved at",
    "citation",
    "citations",
)

SPECIALIST_RE = re.compile(
    r"\b(?:agricultur(?:e|al)|crop|crops|farm|farmer|irrigation|harvest|spray|paddy|"
    r"cotton|soil|marine|sea state|wave height|waves?|boat|fisher(?:man|men)|coastal|"
    r"aviation|flight|airport|metar|taf|visibility|"
    r"air quality|aqi|pollution|pm2\.?5|"
    r"climate|monsoon trend|warming|historical|history|reanalysis|"
    r"earthquake|quake|wildfire|forest fire|flood|inundation|"
    r"shelter|hospital|solar|radiation)\b",
    re.IGNORECASE,
)

RISK_RE = re.compile(
    r"\b(?:risk|hazard|danger|safe to travel|travel safe|is it safe|"
    r"heatwave|heat wave|cold wave|coldwave|cyclone|storm surge|"
    r"flood risk|landslide|thunderstorm)\b",
    re.IGNORECASE,
)


def _words(text: str):
    return re.findall(r"[a-z']+", text.lower())


def is_greeting(text: str) -> bool:
    cleaned = text.strip().lower()
    if not cleaned:
        return False
    if cleaned.strip(" .!?,") in NATIVE_GREETINGS:
        return True
    if len(_words(cleaned)) > 8:
        return False
    return any(re.match(rf"^{re.escape(word)}\b", cleaned) for word in GREETING_WORDS)


def is_help(text: str) -> bool:
    cleaned = text.lower()
    return any(phrase in cleaned for phrase in HELP_PHRASES)


def is_meta(text: str) -> bool:
    cleaned = text.lower()
    return any(phrase in cleaned for phrase in META_PHRASES)


def classify_intent(query: str, language: str = "auto") -> str:
    """Return a stable intent label used by the chat router."""
    text = (query or "").strip()
    if not text:
        return "meta"

    if is_greeting(text):
        return "greeting"
    if is_help(text):
        return "help"

    lowered = text.lower()
    has_model = any(name in lowered for name in MODEL_NAMES)
    if MODEL_COMPARE_RE.search(text) and (has_model or "model" in lowered):
        return "model_comparison"

    if is_meta(text):
        return "meta"

    if OFFICIAL_WARNING_RE.search(text):
        return "official_alert"

    if COMPARE_RE.search(text):
        return "comparison"

    if RISK_RE.search(text):
        return "risk"

    if SPECIALIST_RE.search(text):
        return "specialist"

    if FORECAST_RE.search(text):
        return "forecast"

    return "weather"
