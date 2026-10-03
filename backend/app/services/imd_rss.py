"""Keyless official IMD warning feed integration."""
from typing import Any, Dict, List
import xml.etree.ElementTree as ET
from .http import http_get

RSS_URL = "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php"

def get_imd_rss_warnings(limit: int = 25) -> Dict[str, Any]:
    try:
        response = http_get(
            RSS_URL, timeout=6, retries=1,
            headers={"User-Agent": "WeatherGPT/2026 (+https://github.com/hemanthhemanth1834-bit/WeatherGPT)"},
        )
        if response.status_code != 200:
            raise RuntimeError(f"IMD RSS HTTP {response.status_code}")
        root = ET.fromstring(response.content)
        items: List[Dict[str, Any]] = []
        for node in root.findall(".//item")[:max(1, min(limit, 100))]:
            def val(tag: str) -> str:
                el = node.find(tag)
                return (el.text or "").strip() if el is not None else ""
            items.append({
                "title": val("title"), "description": val("description"),
                "link": val("link"), "published": val("pubDate"),
                "source": "India Meteorological Department",
                "source_type": "OFFICIAL", "official": True,
            })
        return {"status":"LIVE","provider":"India Meteorological Department",
                "source":RSS_URL,"count":len(items),"items":items,
                "data_type":"Official IMD district-nowcast RSS",
                "note":"Source headlines are reproduced without reinterpretation."}
    except Exception as exc:
        return {"status":"UNAVAILABLE","provider":"India Meteorological Department",
                "source":RSS_URL,"count":0,"items":[],
                "data_type":"Official IMD district-nowcast RSS","error":str(exc)}
