"""Local regression: module indicators, solar geometry, trip planner, severe error states, chat sync guard.

Run after ``npm run build`` + backend on :8000 + ``npm run preview`` on :4173::

    python frontend/tests/modules_solar_planner.py

Env overrides: WG_UI_URL, WG_BROWSERS (csv), WG_CHROME_PATH (local browser exe).
"""

import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
BROWSERS = [
    b.strip() for b in os.getenv("WG_BROWSERS", "chromium").split(",") if b.strip()
]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

COMPASS = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}
MODULES = [
    (
        "Life Cast",
        ["Outdoor Activity", "Health & Comfort", "Laundry & Drying", "Drone / Cycling"],
    ),
    (
        "RoadWatch",
        ["Hydroplaning Watch", "Visibility Watch", "Crosswind Watch", "Radar & Route"],
    ),
    (
        "TreeGuard",
        ["Windthrow Risk", "Branch-Fall Watch", "Urban Exposure", "Climate Context"],
    ),
    (
        "UtilityWatch",
        ["Storm Exposure", "Heat Stress", "Flood Context", "Live Providers"],
    ),
    (
        "AI Weather Deep-Cast",
        ["NWP Models", "Soundings", "7-Day Synoptic", "Provider Health"],
    ),
]


def nav(page, label):
    page.get_by_role("button", name=label, exact=False).first.click()


def wait_metrics(page, timeout_ms=20000):
    """Wait until at least 4 module metric values are rendered (survives
    transient weather-loading states during tab switches)."""
    try:
        page.wait_for_function(
            "() => document.querySelectorAll('.wg-ref-feature .wg-mod-value').length >= 4",
            timeout=timeout_ms,
        )
        return True
    except Exception:
        return False


def check(cond, msg, failures):
    if cond:
        print(f"  PASS {msg}")
    else:
        failures.append(msg)
        print(f"  FAIL {msg}")


def warm_backend(path: str, timeout: int = 180) -> None:
    """Best-effort pre-flight GET to absorb cold-cache/queue latency.

    The UI's fetch client aborts every request after 20 s
    (frontend/src/services/api.js) and this machine's single-process backend
    can queue longer than that behind the live alerts fan-out. The checks that
    follow are about the UI auto-loading live data, not cold-queue latency;
    warming the same backend path first makes the UI call deterministic. If
    the service is down this fails silently and the UI check fails honestly.
    """
    import urllib.request

    try:
        urllib.request.urlopen(f"http://127.0.0.1:8000{path}", timeout=timeout).read()
    except Exception:
        pass


def warm_chat(query: str, timeout: int = 180) -> None:
    """Pre-flight the same chat query the UI is about to send (see above)."""
    import json as _json
    import urllib.request

    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/chat/query",
            data=_json.dumps({"query": query}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=timeout).read()
    except Exception:
        pass


def wait_for_reply(page, before: int, timeout_ms: int = 120000) -> None:
    """Wait until one more assistant bubble has rendered, then let React commit
    the full markdown body before the caller reads the page text."""
    try:
        page.wait_for_function(
            "n => document.querySelectorAll('[data-testid=\"assistant-message\"]')"
            ".length > n",
            arg=before,
            timeout=timeout_ms,
        )
    except Exception:
        pass
    page.wait_for_timeout(1200)


def stable_location(page, timeout_ms=90000, settle_reads=2):
    """Return the active location once it has STOPPED changing.

    The header renders the weather payload's ``location`` and falls back to the
    placeholder "Detecting location..." until the first weather response
    arrives, so the raw first read can be the placeholder. This readiness
    helper waits for the value to stabilise (two identical consecutive reads)
    instead of asserting against a transient state. The 90 s budget covers the
    geolocation callback watchdog (App.jsx, 12 s) plus a cold fallback fetch on
    this machine's single-process backend.
    """
    deadline = page.evaluate("() => Date.now()") + timeout_ms
    prev = None
    settled = 0
    while page.evaluate("() => Date.now()") < deadline:
        try:
            cur = page.locator(".wg-ref-location b").inner_text().strip()
        except Exception:
            cur = ""
        if cur and cur == prev and "Detecting" not in cur:
            settled += 1
            if settled >= settle_reads:
                return cur
        else:
            settled = 0
        prev = cur
        page.wait_for_timeout(500)
    return prev or ""


def run(browser_type):
    failures = []
    launch = {"headless": True}
    if CHROME_PATH and browser_type.name == "chromium":
        launch["executable_path"] = CHROME_PATH
    browser = browser_type.launch(**launch)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    page.on(
        "console",
        lambda m: console_errors.append(m.text) if m.type == "error" else None,
    )
    page.goto(UI_URL, wait_until="domcontentloaded")
    page.wait_for_selector(".wg-ref-location b", timeout=120000)
    start_location = stable_location(page)
    print(f"  active location (settled): {start_location!r}")

    print("[solar]")
    nav(page, "Solar Energy Potential")
    page.wait_for_selector(".wg-solar-stat", timeout=20000)
    azimuth_txt = page.locator(".wg-solar-stat").first.locator("strong").inner_text()
    parts = azimuth_txt.replace("°", " ").replace("(", " ").replace(")", " ").split()
    az_val = int(parts[0])
    compass = parts[1] if len(parts) > 1 else "?"
    check(0 <= az_val <= 359, f"solar azimuth {az_val} in 0..359", failures)
    check(
        compass in COMPASS,
        f"solar compass {compass} is a real 8-point direction",
        failures,
    )
    check(
        "SW" not in azimuth_txt or compass == "SW",
        "no hardcoded (SW) mismatch",
        failures,
    )
    check(
        "Estimated" in page.content() or "estimate" in page.content().lower(),
        "solar subtitle states it is an estimate",
        failures,
    )
    solar_body = page.inner_text("body")
    check(
        "\\n" not in solar_body, "solar: no literal backslash-n text artifact", failures
    )
    badge = page.locator(".wg-solar-badge.warn").first.inner_text().strip()
    check(
        badge.startswith("Cloud Cover (") and badge.endswith("%)"),
        f"solar: cloud badge labeled honestly ({badge!r})",
        failures,
    )

    for label, titles in MODULES:
        print(f"[{label}]")
        nav(page, label)
        page.wait_for_selector(".wg-ref-feature", timeout=20000)
        got = wait_metrics(page)
        cards = page.locator(".wg-ref-feature")
        n = cards.count()
        check(n >= 4, f"{label}: >=4 cards", failures)
        values = page.locator(".wg-ref-feature .wg-mod-value")
        vn = values.count()
        check(vn >= 4, f"{label}: {vn} metric values rendered", failures)
        if vn:
            empty = [i for i in range(vn) if not values.nth(i).inner_text().strip()]
            check(not empty, f"{label}: metric values non-empty", failures)
        body = page.inner_text("body")
        check(
            "Shows what this feature means" not in body,
            f"{label}: placeholder copy removed",
            failures,
        )

    print("[Trip Planner]")
    nav(page, "Trip Planner")
    page.wait_for_selector('[data-testid="trip-planner"]', timeout=20000)
    for attempt in range(2):
        page.get_by_role("button", name="Show arrival weather").click()
        try:
            page.wait_for_selector('[data-testid="trip-result"]', timeout=60000)
            break
        except Exception:
            if attempt == 1:
                raise
    trip = page.locator('[data-testid="trip-result"]').inner_text()
    check("km away" in trip, "trip: distance shown", failures)
    check("arrival" in trip, "trip: arrival time shown", failures)
    check("planning estimates" in trip, "trip: honest estimate disclaimer", failures)

    print("[Deep-Cast honesty]")
    nav(page, "AI Weather Deep-Cast")
    page.wait_for_timeout(1500)
    body = page.inner_text("body")
    check(
        "NOT CONFIGURED" in body,
        "deep-cast: soundings honestly not configured",
        failures,
    )

    print("[FloodWatch auto-assess]")
    # Warm the risk service first (see warm_backend docstring); the UI client
    # would otherwise abort at 20 s while this machine's backend is still
    # queueing behind the live alerts fan-out.
    warm_backend("/api/risk/assess?location=" + start_location.replace(" ", "%20"))
    nav(page, "FloodWatch")
    try:
        page.wait_for_function(
            "() => document.body.innerText.includes('Overall for')", timeout=90000
        )
        auto_ok = True
    except Exception:
        auto_ok = False
    check(auto_ok, "floodwatch: risk assessment auto-loads without a click", failures)
    check(
        page.get_by_test_id("live-imagery").count() >= 1,
        "floodwatch: satellite flood-context figure present",
        failures,
    )

    print("[Station Comparison provenance]")
    nav(page, "Station Comparison")
    try:
        page.wait_for_function(
            "() => {const b = document.body.innerText; return b.includes('City vs city') && !b.includes('Comparing') && !b.includes('loading…');}",
            timeout=90000,
        )
    except Exception:
        pass
    # Readiness: the panel-level wait can resolve while a per-city cell is
    # still fetching (observed once in chromium, passed in firefox the same
    # run). Wait for the settled cell text the asserts judge; the asserts
    # themselves are unchanged and still fail if the cells never settle.
    try:
        page.wait_for_function(
            "() => {const b = document.body.innerText; return !b.includes('…\\n')"
            " && (b.includes('· live') || b.includes('· est.'));}",
            timeout=90000,
        )
    except Exception:
        pass
    page.wait_for_timeout(1000)
    compare_body = page.inner_text("body")
    check(
        "· live" in compare_body or "· est." in compare_body,
        "compare: AQI provenance labeled per city",
        failures,
    )
    check(
        "…\n" not in compare_body,
        "compare: no ambiguous ellipsis placeholder cells",
        failures,
    )

    print("[Disaster Management error states]")
    nav(page, "Disaster Management")
    page.wait_for_timeout(35000)
    body = page.inner_text("body")
    check(
        "Searching OpenStreetMap near you" not in body,
        "severe: OSM lookup resolved (no permanent loading)",
        failures,
    )
    check("Loading USGS feed" not in body, "severe: USGS slot resolved", failures)
    check("Loading EONET feed" not in body, "severe: EONET slot resolved", failures)
    check(
        "Computing rain + elevation proxy" not in body,
        "severe: flood proxy resolved",
        failures,
    )

    print("[chat sync guard]")
    nav(page, "AI Weather Assistant")
    box = page.locator('input[aria-label="Type your weather question"]')
    ask1 = "What is the source and update time of this answer?"
    warm_chat(ask1)
    before = page.locator('[data-testid="assistant-message"]').count()
    box.fill(ask1)
    page.locator('button[aria-label="Send question"]').click()
    wait_for_reply(page, before)
    chat_text = page.inner_text("body")
    check(
        "Grand Est" not in chat_text,
        "chat: filler-word geocode (Grand Est) gone",
        failures,
    )
    end_location = stable_location(page, timeout_ms=20000)
    check(
        end_location == start_location,
        f"chat: active location unchanged ({start_location!r} -> {end_location!r})",
        failures,
    )

    print("[chat unknown-place honesty]")
    # Regression: an unresolvable place name used to answer silently as the
    # default city (and could even be substring-matched to an unrelated
    # gazetteer entry, e.g. "krishnapatnam" -> Patna). It must now say which
    # location the figures describe.
    ask2 = "Tell me about the weather in Krishnapatnam"
    warm_chat(ask2)
    before = page.locator('[data-testid="assistant-message"]').count()
    box.fill(ask2)
    page.locator('button[aria-label="Send question"]').click()
    wait_for_reply(page, before)
    unknown_text = page.inner_text("body")
    check(
        "could not resolve" in unknown_text,
        "chat: unresolvable place states the fallback honestly",
        failures,
    )
    check(
        "Patna" not in unknown_text,
        "chat: unresolvable place is not substring-matched to Patna",
        failures,
    )
    after_unknown = stable_location(page, timeout_ms=20000)
    check(
        after_unknown == start_location,
        f"chat: unresolvable place did not move the app location "
        f"({start_location!r} -> {after_unknown!r})",
        failures,
    )

    real_errors = [
        e
        for e in console_errors
        if "favicon" not in e.lower() and "fonts.googleapis" not in e
    ]
    check(not real_errors, f"no console errors ({len(real_errors)})", failures)
    browser.close()
    return failures


def main():
    from playwright.sync_api import sync_playwright

    all_failures = []
    with sync_playwright() as p:
        for name in BROWSERS:
            print(f"=== {name} ===")
            failures = run(getattr(p, name))
            all_failures.extend(f"{name}: {f}" for f in failures)
    if all_failures:
        print("\nFAILURES:")
        for f in all_failures:
            print(" -", f)
        sys.exit(1)
    print("\nAll module/solar/planner/chat checks passed.")


if __name__ == "__main__":
    main()
