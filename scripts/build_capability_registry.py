"""Build the UI capability registry from docs/464_CAPABILITY_MATRIX.md.

Single source of truth: the matrix doc. This script:
 1. parses all 464 rows,
 2. maps each row to an existing App tab (or null + reason when the row has
    no frontend surface),
 3. writes frontend/src/services/capabilityRegistry.generated.js,
 4. appends a "UI Accessible" column to the matrix doc.

Run: python scripts/build_capability_registry.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
MATRIX = ROOT / "docs" / "464_CAPABILITY_MATRIX.md"
OUT = ROOT / "frontend" / "src" / "services" / "capabilityRegistry.generated.js"

PREFIX_TAB = {
    "W": "dashboard", "F": "dashboard", "L": "home", "Q": "dashboard",
    "M": "aviation_marine", "V": "aviation_marine", "C": "climate",
    "N": "nwp", "S": "satellite", "R": "map", "G": "map", "E": "earth",
    "A": "alerts", "K": "risk", "D": "severe", "EV": "severe",
    "AG": "agri", "SO": "dashboard", "LC": "dashboard", "RD": "risk",
    "CP": "compare", "AI": "chat", "VM": "chat", "SV": "saved",
    "NT": "alerts", "PS": "chat", "EX": "dashboard", "PH": "nwp",
    "SE": "about", "PQ": "about", "DC": "about",
}

# Rows whose default tab would be misleading even though a frontend string exists.
OVERRIDES = {
    "LC011": "severe", "LC012": "severe",  # blueprint paths live in Severe
    "RD009": "severe",  # emergency places panel lives in Severe
    "NT010": "about",  # official links live in footer/About
    "PS010": "about", "PS011": "about", "PS012": "about",
    "PS013": "about", "PS014": "about",  # documented prefs live in About/docs
    "EX008": "about", "EX009": "about", "EX010": "about", "EX011": "about",
    "SE011": "about", "SE012": "about",  # documented posture, About/docs
}


def prefix_of(cap_id):
    return re.match(r"^([A-Z]+)[0-9]+$", cap_id).group(1)


def main():
    raw = MATRIX.read_text(encoding="utf-8").splitlines()
    # Idempotent: strip a previously appended UI column before rebuilding.
    lines = [re.sub(r" \| UI Accessible \|$", " |", l) if l.startswith("|") else l
             for l in raw]
    rows = [l for l in lines if re.match(r"^\| [A-Z]+[0-9]+ \|", l)]
    assert len(rows) == 464, f"expected 464 rows, found {len(rows)}"
    entries = []
    doc_lines = []
    for row in rows:
        cells = [c.strip() for c in row.strip().strip("|").split("|")]
        cap_id, category, name = cells[0], cells[1], cells[2]
        frontend, source, provider, status = cells[4], cells[6], cells[7], cells[8]
        if frontend in ("", "—"):
            tab, reason = None, f"No UI surface ({status.lower()}); verified by {cells[10]}"
            ui = "INFRA"
        else:
            tab = OVERRIDES.get(cap_id, PREFIX_TAB[prefix_of(cap_id)])
            reason = ""
            ui = "YES"
        entries.append({
            "id": cap_id, "category": category, "name": name,
            "status": status, "source": source, "provider": provider,
            "tab": tab, "reason": reason, "frontend": frontend,
        })
        doc_lines.append(row.rstrip() + f" {ui} |")
    header_idx = next(i for i, l in enumerate(lines) if l.startswith("| ID |"))
    lines[header_idx] = lines[header_idx].rstrip() + " UI Accessible |"
    sep_idx = header_idx + 1
    assert set(lines[sep_idx].replace(" ", "")) <= set("|-:"), "separator row expected"
    last_row = max(i for i, l in enumerate(lines) if re.match(r"^\| [A-Z]+[0-9]+ \|", l))
    out_lines = lines[:sep_idx + 1] + doc_lines + lines[last_row + 1:]
    MATRIX.write_text("\n".join(line.rstrip() for line in out_lines) + "\n", encoding="utf-8")

    js_entries = []
    for e in entries:
        tab_js = "null" if e["tab"] is None else repr(e["tab"])
        js_entries.append(
            "  { id: %r, category: %r, name: %r, status: %r, source: %r, "
            "provider: %r, tab: %s, reason: %r }," % (
                e["id"], e["category"], e["name"], e["status"], e["source"],
                e["provider"], tab_js, e["reason"]))
    OUT.write_text(
        "/* GENERATED from docs/464_CAPABILITY_MATRIX.md — do not edit by hand.\n"
        "   Regenerate: python scripts/build_capability_registry.py */\n"
        "export const CAPABILITIES = [\n" + "\n".join(js_entries) + "\n];\n"
        "export const CAPABILITY_TABS = [...new Set(CAPABILITIES.map((c) => c.tab).filter(Boolean))];\n",
        encoding="utf-8")
    tabs = sorted({e["tab"] for e in entries if e["tab"]})
    infra = sum(1 for e in entries if not e["tab"])
    print(f"rows={len(entries)} tabs={tabs} infra-only={infra}")


if __name__ == "__main__":
    main()
