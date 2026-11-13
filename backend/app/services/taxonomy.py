"""Canonical data-kind contract shared by every WeatherGPT module.

The seven kinds below are the only labels the product may use for the
epistemic status of a value. ``data_type`` keeps the provider-specific
detail; ``data_kind`` is the canonical, user-facing classification.

Rules are ordered deliberately: a value described as "observed / reanalysis"
is classified as REANALYSIS, never OBSERVED, because a reanalysis grid is not
a station measurement. Unknown labels fall back to STATIC, which is the most
conservative non-live category, and are flagged via ``classified=False``.
"""

from typing import Any, Dict, List, Optional

DATA_KINDS = (
    "OBSERVED",
    "FORECAST",
    "REANALYSIS",
    "MODEL",
    "COMPUTED",
    "ESTIMATED",
    "STATIC",
    # Published bulletins are not a weather value; kept as an explicit
    # extension so official warnings can never be mistaken for forecasts.
    "OFFICIAL",
)

REQUIRED_PROVENANCE_FIELDS = (
    "source",
    "data_type",
    "data_kind",
    "valid_time",
    "retrieved_at",
    "freshness",
    "units",
    "limitations",
)

_RULES = (
    (("REANALYSIS", "ERA5", "HISTORICAL", "HISTOR"), "REANALYSIS"),
    (("OFFICIAL", "WARNING", "BULLETIN"), "OFFICIAL"),
    (("ENSEMBLE", "FORECAST", "NWP", "PREDICTION"), "FORECAST"),
    (("OBSERV", "STATION", "GAUGE"), "OBSERVED"),
    (("ESTIMAT", "APPROX"), "ESTIMATED"),
    (("COMPUTED", "DERIVED", "PROXY", "CALCULATED"), "COMPUTED"),
    (("STATIC", "REFERENCE", "DEMO", "CLIMATOLOGY"), "STATIC"),
    (("MODEL", "SIMULATION"), "MODEL"),
)


def canonical_kind(data_type: Optional[str]) -> str:
    """Map a provider's data_type string to one canonical kind."""
    text = str(data_type or "").upper()
    for needles, kind in _RULES:
        if any(needle in text for needle in needles):
            return kind
    return "STATIC"


def classify(
    data_type: Optional[str],
    *,
    source: Optional[str] = None,
    valid_time: Optional[str] = None,
    retrieved_at: Optional[str] = None,
    freshness: Optional[str] = None,
    units: Optional[str] = "metric",
    methodology: Optional[str] = None,
    availability: Optional[str] = None,
    limitations: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Return the shared contract object for one value or payload."""
    text = str(data_type or "")
    kind = canonical_kind(text)
    return {
        "data_kind": kind,
        "data_type": text.upper() if text else "UNKNOWN",
        "source": source,
        "valid_time": valid_time,
        "retrieved_at": retrieved_at,
        "freshness": (freshness or "UNKNOWN").upper(),
        "units": units,
        "methodology": methodology
        or _METHODOLOGY.get(kind, "Provider-supplied values, classified as received."),
        "availability": availability or "AVAILABLE",
        "limitations": list(limitations or []),
        "classified": kind != "STATIC" or "STATIC" in text.upper(),
    }


_METHODOLOGY = {
    "OBSERVED": "Measured or reported observation; not interpolated by WeatherGPT.",
    "FORECAST": "Numerical model or ensemble output; future values are uncertain.",
    "REANALYSIS": "Gridded reanalysis of past conditions, not a station reading.",
    "MODEL": "Model output without a forecast lead time attached.",
    "COMPUTED": "Derived by WeatherGPT rules from the stated inputs.",
    "ESTIMATED": "Estimated from available inputs; not a direct measurement.",
    "STATIC": "Reference or demonstration content, not live data.",
    "OFFICIAL": "Published bulletin reproduced as issued; not reinterpreted.",
}


def contract_document() -> Dict[str, Any]:
    """Machine-readable contract for clients and documentation."""
    return {
        "version": "1.0",
        "kinds": list(DATA_KINDS),
        "required_fields": list(REQUIRED_PROVENANCE_FIELDS),
        "rules": {
            "precedence": [
                "REANALYSIS before OBSERVED when both labels appear",
                "OFFICIAL for published bulletins",
                "FORECAST for model/ensemble predictions",
                "COMPUTED for WeatherGPT-derived values",
                "STATIC fallback for unrecognized labels",
            ],
            "note": (
                "data_kind never upgrades a value to OBSERVED. Unknown types "
                "are STATIC and marked classified=false."
            ),
        },
        "methodology": dict(_METHODOLOGY),
    }
