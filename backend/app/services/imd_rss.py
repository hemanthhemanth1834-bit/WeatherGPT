"""Keyless official IMD warning feed integration."""

from typing import Any, Dict, List
import xml.etree.ElementTree as ET
from .http import http_get

RSS_URL = "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php"


def filter_warnings(
    items: List[Dict[str, Any]],
    *,
    state: str = "",
    district: str = "",
    keywords: List[str] | None = None,
) -> List[Dict[str, Any]]:
    """Match official item text only; never invent a warning match.

    Geographic terms are combined with AND semantics across distinct fields
    (if both state and district are supplied, both must appear). Keyword terms
    are OR semantics within the optional keyword list.
    """
    hay_terms = [
        term.strip().lower() for term in (state, district) if term and term.strip()
    ]
    keyword_terms = [
        term.strip().lower() for term in (keywords or []) if term and term.strip()
    ]
    matched: List[Dict[str, Any]] = []
    for item in items or []:
        text = f"{item.get('title', '')} {item.get('description', '')}".lower()
        if hay_terms and not all(term in text for term in hay_terms):
            continue
        if keyword_terms and not any(term in text for term in keyword_terms):
            continue
        if not hay_terms and not keyword_terms:
            continue
        copy = dict(item)
        copy["matched_terms"] = [
            term for term in (hay_terms + keyword_terms) if term in text
        ]
        matched.append(copy)
    return matched


def get_imd_rss_warnings(limit: int = 25) -> Dict[str, Any]:
    try:
        response = http_get(
            RSS_URL,
            timeout=6,
            retries=1,
            headers={
                "User-Agent": "WeatherGPT/2026 (+https://github.com/hemanthhemanth1834-bit/WeatherGPT)"
            },
        )
        if response.status_code != 200:
            raise RuntimeError(f"IMD RSS HTTP {response.status_code}")
        root = ET.fromstring(response.content)
        items: List[Dict[str, Any]] = []

        # IMD has served unnamespaced RSS and namespace-qualified XML.
        def local_name(tag: str) -> str:
            return tag.rsplit("}", 1)[-1].lower()

        nodes = [node for node in root.iter() if local_name(node.tag) == "item"]
        for node in nodes[: max(1, min(limit, 100))]:

            def val(tag: str) -> str:
                el = next(
                    (
                        child
                        for child in node.iter()
                        if child is not node and local_name(child.tag) == tag.lower()
                    ),
                    None,
                )
                return (el.text or "").strip() if el is not None else ""

            items.append(
                {
                    "title": val("title"),
                    "description": val("description"),
                    "link": val("link"),
                    "published": val("pubDate"),
                    "source": "India Meteorological Department",
                    "source_type": "OFFICIAL",
                    "official": True,
                }
            )
        return {
            "status": "LIVE",
            "provider": "India Meteorological Department",
            "source": RSS_URL,
            "count": len(items),
            "items": items,
            "data_type": "Official IMD district-nowcast RSS",
            "note": "Source headlines are reproduced without reinterpretation.",
        }
    except Exception as exc:
        return {
            "status": "UNAVAILABLE",
            "provider": "India Meteorological Department",
            "source": RSS_URL,
            "count": 0,
            "items": [],
            "data_type": "Official IMD district-nowcast RSS",
            "error": str(exc),
        }
