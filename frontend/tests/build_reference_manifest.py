"""Build docs/visual-references/manifest.json + REFERENCE_AUDIT.md.

Reads docs/visual-references/sources.json (curated candidates actually seen in
web-search results), HTTP-verifies every URL, then merges:

  * web sources            -> manifest entries (verified flag from HTTP probe)
  * docs/visual-references/screenshots/*.png -> captured-screenshot entries
  * docs/visual-references/downloads/*       -> downloaded public-domain assets

The script never invents entries: only URLs present in sources.json and files
present on disk are emitted. HTTP probes use a browser User-Agent; 2xx/3xx
count as verified, everything else is recorded honestly with the raw status.

Usage:  python frontend/tests/build_reference_manifest.py
"""

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VR = ROOT / "docs" / "visual-references"
SOURCES = VR / "sources.json"
DOWNLOADS = VR / "downloads"
SHOTS = VR / "screenshots"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

SHOT_CATEGORY = {
    "local-": "22",
    "prod-": "22",
    "benchmark-": "22",
}

CAT_NAMES = {
    "01": "Current Weather Dashboard",
    "02": "Weather Radar & Storm Tracking",
    "03": "Satellite & Cloud Imagery",
    "04": "Hourly / Daily / Extended Forecasts",
    "05": "Rainfall Intelligence & Flood Risk",
    "06": "Severe Weather Alerts & Warnings",
    "07": "AI Weather Assistant & Chat",
    "08": "Weather Maps & Geographic Layers",
    "09": "NWP & Model Comparison",
    "10": "Weather Charts & Data Visualization",
    "11": "Historical Weather & Climate Explorer",
    "12": "Location Search & Saved Cities",
    "13": "Mobile / Tablet / Responsive",
    "14": "Design System, Color & Typography",
    "15": "Navigation & Application Layout",
    "16": "Settings, Preferences & Accessibility",
    "17": "API Health & Data Source Diagnostics",
    "18": "Loading / Empty / Offline / Error States",
    "19": "Onboarding & First-Use Experience",
    "20": "Weather Reports & Data Export",
    "21": "Weather Imagery & Visual Assets",
    "22": "WeatherGPT Screenshots & Defect References",
}


def http_probe(url: str) -> dict:
    """Probe a URL; record status, final URL and note. Never raises."""
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
                return {
                    "status": int(resp.status),
                    "final_url": resp.geturl(),
                    "content_type": (resp.headers.get("Content-Type") or "")[:80],
                }
        except urllib.error.HTTPError as exc:
            if method == "HEAD" and exc.code in (403, 405, 400, 501):
                continue  # some hosts reject HEAD; retry with GET
            return {
                "status": int(exc.code),
                "final_url": url,
                "content_type": "",
                "note": f"HTTP {exc.code}",
            }
        except Exception as exc:  # noqa: BLE001
            if method == "GET":
                return {
                    "status": None,
                    "final_url": url,
                    "content_type": "",
                    "note": f"unreachable: {type(exc).__name__}",
                }
    return {
        "status": None,
        "final_url": url,
        "content_type": "",
        "note": "probe failed",
    }


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    entries = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        probes = list(pool.map(lambda s: http_probe(s["url"]), sources))

    n_ok = 0
    for src, probe in zip(sources, probes):
        ok = probe.get("status") is not None and 200 <= probe["status"] < 400
        n_ok += ok
        entries.append(
            {
                "image_id": src["id"],
                "category": src["category"],
                "filename_or_url": src["url"],
                "source": src.get("source", ""),
                "license": src.get("license", ""),
                "attribution": src.get("attribution", ""),
                "purpose": src.get("purpose", ""),
                "target_page_or_component": src.get("target", ""),
                "kind": src.get("kind", "inspiration"),
                "checked": now,
                "http_status": probe.get("status"),
                "final_url": probe.get("final_url"),
                "verify_note": probe.get("note", ""),
                "verified": bool(ok),
            }
        )

    # Captured screenshots (real files on disk).
    shot_entries = 0
    if SHOTS.is_dir():
        for f in sorted(SHOTS.glob("*.png")):
            m = re.match(r"([a-z]+)-", f.name)
            prefix = (m.group(1) + "-") if m else ""
            entries.append(
                {
                    "image_id": f"SHOT-{f.stem}",
                    "category": SHOT_CATEGORY.get(prefix, "22"),
                    "filename_or_url": f"docs/visual-references/screenshots/{f.name}",
                    "source": "captured from the WeatherGPT application (Playwright)",
                    "license": "Project screenshot (WeatherGPT)",
                    "attribution": "WeatherGPT project",
                    "purpose": "Defect reference / current-state evidence",
                    "target_page_or_component": f.stem,
                    "kind": "capture",
                    "checked": now,
                    "http_status": None,
                    "final_url": None,
                    "verify_note": f"file on disk, {f.stat().st_size} bytes",
                    "verified": True,
                }
            )
            shot_entries += 1

    # Downloaded assets (public-domain candidates).
    dl_entries = 0
    if DOWNLOADS.is_dir():
        for f in sorted(DOWNLOADS.iterdir()):
            if f.is_file() and f.suffix.lower() in {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".gif",
            }:
                entries.append(
                    {
                        "image_id": f"DL-{f.stem}",
                        "category": "21",
                        "filename_or_url": f"docs/visual-references/downloads/{f.name}",
                        "source": "see DOWNLOADS.md",
                        "license": "see DOWNLOADS.md",
                        "attribution": "see DOWNLOADS.md",
                        "purpose": "Reference imagery / asset-quality benchmark",
                        "target_page_or_component": "imagery fidelity (satellite/banner)",
                        "kind": "download",
                        "checked": now,
                        "http_status": None,
                        "final_url": None,
                        "verify_note": f"file on disk, {f.stat().st_size} bytes",
                        "verified": True,
                    }
                )
                dl_entries += 1

    manifest = {
        "generated": now,
        "verification_method": (
            "HTTP HEAD/GET probe with a browser User-Agent (2xx/3xx = verified); "
            "screenshots/downloads verified by presence on disk. No entry is "
            "invented; blocked or unreachable URLs carry their raw status."
        ),
        "counts": {
            "web_sources": len(sources),
            "web_sources_ok": n_ok,
            "screenshots": shot_entries,
            "downloads": dl_entries,
            "total": len(entries),
        },
        "entries": entries,
    }
    (VR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # REFERENCE_AUDIT.md
    by_cat: dict[str, list[dict]] = {}
    for e in entries:
        by_cat.setdefault(e["category"], []).append(e)
    lines = [
        "# WeatherGPT — Visual Reference Audit",
        "",
        f"Generated: {now}. **{len(entries)} entries** "
        f"({len(sources)} web sources, {n_ok} verified over HTTP; "
        f"{shot_entries} captured screenshots; {dl_entries} downloaded assets).",
        "",
        "Method: web sources were found via DuckDuckGo search in this session and "
        "each URL was probed over HTTP (browser User-Agent; 2xx/3xx = verified). "
        "Screenshots were captured from the running application with Playwright. "
        "Nothing in this audit was fabricated; blocked/unreachable links carry "
        "their raw HTTP status below.",
        "",
        "> These are **references**, not production assets. Third-party artwork / "
        "screenshots remain the property of their owners and are recorded as links "
        "for design study only. Production imagery uses open data (NASA GIBS, "
        "Open-Meteo, RainViewer, OpenStreetMap) where verified.",
        "",
    ]
    for cat in sorted(by_cat):
        rows = by_cat[cat]
        lines.append(
            f"## Category {cat} — {CAT_NAMES.get(cat, 'Uncategorized')} ({len(rows)} reference(s))"
        )
        lines.append("")
        for e in rows:
            status = (
                "VERIFIED"
                if e["verified"]
                else f"NOT VERIFIED ({e.get('verify_note') or 'unknown'})"
            )
            lines.append(f"- `{e['image_id']}` [{status}] — {e['filename_or_url']}")
            if e.get("purpose"):
                lines.append(f"  - purpose: {e['purpose']}")
            if e.get("license"):
                lines.append(f"  - license/usage: {e['license']}")
        lines.append("")
    (VR / "REFERENCE_AUDIT.md").write_text("\n".join(lines), encoding="utf-8")
    print(
        f"manifest.json: {len(entries)} entries "
        f"({n_ok}/{len(sources)} web verified, {shot_entries} shots, {dl_entries} downloads)"
    )


if __name__ == "__main__":
    main()
