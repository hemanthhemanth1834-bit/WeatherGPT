"""UI exposure gate: every matrix capability is reachable or has a reason."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
MATRIX = ROOT / "docs" / "464_CAPABILITY_MATRIX.md"
REGISTRY = ROOT / "frontend" / "src" / "services" / "capabilityRegistry.generated.js"
APP = ROOT / "frontend" / "src" / "App.jsx"
NAV = ROOT / "frontend" / "src" / "components" / "ReferenceChrome.jsx"


def _matrix_ids():
    lines = MATRIX.read_text(encoding="utf-8").splitlines()
    return [l.split("|")[1].strip()
            for l in lines if re.match(r"^\| [A-Z]+[0-9]+ \|", l)]


def _registry():
    text = REGISTRY.read_text(encoding="utf-8")
    entries = re.findall(
        r"\{ id: '([A-Z0-9]+)', category: '([^']*)', name: '((?:[^'\\]|\\.)*)', "
        r"status: '([^']*)', source: '((?:[^'\\]|\\.)*)', provider: '((?:[^'\\]|\\.)*)', "
        r"tab: (null|'[a-z_]+'), reason: '((?:[^'\\]|\\.)*)' \},",
        text)
    cleaned = []
    for e in entries:
        e = list(e)
        e[6] = None if e[6] == "null" else e[6].strip("'")
        cleaned.append(tuple(e))
    return cleaned


def _app_tabs():
    nav_text = NAV.read_text(encoding="utf-8")
    app_text = APP.read_text(encoding="utf-8")
    groups = re.search(r"GROUPS = \[(.*?)\];", nav_text, re.DOTALL).group(1)
    tabs = set(re.findall(r'\["([a-z_]+)",', groups))
    renders = set(re.findall(r'\{tab === "([a-z_]+)"', app_text))
    return tabs, renders


def test_registry_covers_matrix():
    assert REGISTRY.exists(), "generated registry missing — run scripts/build_capability_registry.py"
    matrix_ids = _matrix_ids()
    entries = _registry()
    assert len(matrix_ids) == 464
    assert len(entries) == 464
    assert {e[0] for e in entries} == set(matrix_ids)


def test_registry_tabs_are_real_routes():
    entries = _registry()
    tabs, renders = _app_tabs()
    used = {e[6] for e in entries if e[6] is not None}
    available = tabs | renders
    assert used <= available, f"registry tabs have no nav/render surface: {used - available}"
    assert used <= renders, f"registry tabs with no render case: {used - renders}"


def test_every_row_reachable_or_explained():
    entries = _registry()
    orphans = [e[0] for e in entries if e[6] is None and not e[7].strip()]
    assert not orphans, f"rows with neither tab nor reason: {orphans}"
    assert all(e[6] is not None or e[7].strip() for e in entries)


def test_status_columns_match_matrix():
    lines = MATRIX.read_text(encoding="utf-8").splitlines()
    rows = [l for l in lines if re.match(r"^\| [A-Z]+[0-9]+ \|", l)]
    entries = {e[0]: e for e in _registry()}
    mismatched = [r.split("|")[1].strip() for r in rows
                  if entries[r.split("|")[1].strip()][3] !=
                  [c.strip() for c in r.strip().strip("|").split("|")][8]]
    assert not mismatched, f"registry status drift: {mismatched}"
