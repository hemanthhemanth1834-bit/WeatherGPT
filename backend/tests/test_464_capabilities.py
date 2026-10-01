"""464-capability coverage gate + honesty scan. Offline-safe."""
import pathlib
import re

import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = pathlib.Path(__file__).resolve().parents[2]
MATRIX = ROOT / "docs" / "464_CAPABILITY_MATRIX.md"
ALLOWED = {"LIVE", "OFFICIAL", "COMPUTED", "FALLBACK", "ESTIMATED",
           "SIMULATED", "DEMO", "STATIC", "NOT_CONFIGURED"}

# Phrases that must never appear as factual claims in shipped source.
# (Denials such as "No Bhashini integration" are allowed and excluded here.)
FORBIDDEN = [
    "IMD LIVE", "WRF LIVE", "MOSDAC LIVE", "INCOIS LIVE",
    "OFFICIAL ALERT", "LIVE LIGHTNING",
    "AI analyzed image", "predicted earthquake",
    "Bhashini is live", "Bhashini connected", "powered by Bhashini",
]


def _rows():
    lines = MATRIX.read_text(encoding="utf-8").splitlines()
    return [l for l in lines if re.match(r"^\| [A-Z]{1,3}[0-9]{3} \|", l)]


def test_matrix_has_464_unique_rows():
    rows = _rows()
    assert len(rows) == 464, f"expected 464 rows, found {len(rows)}"
    ids = [r.split("|")[1].strip() for r in rows]
    assert len(set(ids)) == 464, "duplicate capability IDs"


def test_matrix_statuses_valid_and_complete():
    for row in _rows():
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        assert len(cells) == 13, f"row must have 13 columns: {cells[0]}"
        assert cells[8] in ALLOWED, f"{cells[0]} has invalid status {cells[8]!r}"
        assert cells[1] and cells[2], f"{cells[0]} missing category/capability"
        assert cells[12] in ("YES", "INFRA"), f"{cells[0]} missing UI verdict"


def test_matrix_live_claims_have_backend():
    for row in _rows():
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        if cells[8] == "LIVE":
            implemented = (cells[4] not in ("", "—")) or (cells[5] not in ("", "—"))
            assert implemented, f"{cells[0]} LIVE without implementation mapping"


def test_no_forbidden_claims_in_source():
    hits = []
    for path in list((ROOT / "backend" / "app").rglob("*.py")) + list(
            (ROOT / "frontend" / "src").rglob("*.jsx")) + list(
            (ROOT / "frontend" / "src").rglob("*.js")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for phrase in FORBIDDEN:
            if phrase in text:
                hits.append(f"{path.name}: {phrase!r}")
    assert not hits, f"forbidden claims found: {hits}"


def test_key_live_routes_respond():
    client = TestClient(app, raise_server_exceptions=False)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/providers/health", params={"live": False}).status_code == 200
    assert client.get("/api/agent/tools").status_code == 200
    body = client.get("/api/alerts/india").json()
    assert body["status"] == "LIVE"
