"""Local regression: module indicators, solar geometry, trip planner, severe error states, chat sync guard.

Run after ``npm run build`` + backend on :8000 + ``npm run preview`` on :4173::

    python frontend/tests/modules_solar_planner.py

Env overrides: WG_UI_URL, WG_BROWSERS (csv), WG_CHROME_PATH (local browser exe).
"""
import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
BROWSERS = [b.strip() for b in os.getenv("WG_BROWSERS", "chromium").split(",") if b.strip()]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

COMPASS = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}
MODULES = [
    ("Life Cast", ["Outdoor Activity", "Health & Comfort", "Laundry & Drying", "Drone / Cycling"]),
    ("RoadWatch", ["Hydroplaning Watch", "Visibility Watch", "Crosswind Watch", "Radar & Route"]),
    ("TreeGuard", ["Windthrow Risk", "Branch-Fall Watch", "Urban Exposure", "Climate Context"]),
    ("UtilityWatch", ["Storm Exposure", "Heat Stress", "Flood Context", "Live Providers"]),
    ("AI Weather Deep-Cast", ["NWP Models", "Soundings", "7-Day Synoptic", "Provider Health"]),
]

def nav(page, label):
    page.get_by_role("button", name=label, exact=False).first.click()

def wait_metrics(page, timeout_ms=20000):
    """Wait until at least 4 module metric values are rendered (survives
    transient weather-loading states during tab switches)."""
    try:
        page.wait_for_function(
            "() => document.querySelectorAll('.wg-ref-feature .wg-mod-value').length >= 4",
            timeout=timeout_ms)
        return True
    except Exception:
        return False

def check(cond, msg, failures):
    if cond:
        print(f"  PASS {msg}")
    else:
        failures.append(msg)
        print(f"  FAIL {msg}")

def run(browser_type):
    failures = []
    launch = {"headless": True}
    if CHROME_PATH:
        launch["executable_path"] = CHROME_PATH
    browser = browser_type.launch(**launch)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    console_errors = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.goto(UI_URL, wait_until="domcontentloaded")
    page.wait_for_selector(".wg-ref-location b", timeout=45000)
    page.wait_for_timeout(3000)
    start_location = page.locator(".wg-ref-location b").inner_text()

    print("[solar]")
    nav(page, "Solar Energy Potential")
    page.wait_for_selector(".wg-solar-stat", timeout=20000)
    azimuth_txt = page.locator(".wg-solar-stat").first.locator("strong").inner_text()
    parts = azimuth_txt.replace("°", " ").replace("(", " ").replace(")", " ").split()
    az_val = int(parts[0])
    compass = parts[1] if len(parts) > 1 else "?"
    check(0 <= az_val <= 359, f"solar azimuth {az_val} in 0..359", failures)
    check(compass in COMPASS, f"solar compass {compass} is a real 8-point direction", failures)
    check("SW" not in azimuth_txt or compass == "SW", "no hardcoded (SW) mismatch", failures)
    check("Estimated" in page.content() or "estimate" in page.content().lower(), "solar subtitle states it is an estimate", failures)

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
        check("Shows what this feature means" not in body, f"{label}: placeholder copy removed", failures)

    print("[Trip Planner]")
    nav(page, "Trip Planner")
    page.wait_for_selector('[data-testid="trip-planner"]', timeout=20000)
    for attempt in range(2):
        page.get_by_role("button", name="Show arrival weather").click()
        try:
            page.wait_for_selector('[data-testid="trip-result"]', timeout=30000)
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
    check("NOT CONFIGURED" in body, "deep-cast: soundings honestly not configured", failures)

    print("[Disaster Management error states]")
    nav(page, "Disaster Management")
    page.wait_for_timeout(35000)
    body = page.inner_text("body")
    check("Searching OpenStreetMap near you" not in body, "severe: OSM lookup resolved (no permanent loading)", failures)
    check("Loading USGS feed" not in body, "severe: USGS slot resolved", failures)
    check("Loading EONET feed" not in body, "severe: EONET slot resolved", failures)
    check("Computing rain + elevation proxy" not in body, "severe: flood proxy resolved", failures)

    print("[chat sync guard]")
    nav(page, "AI Weather Assistant")
    box = page.locator('input[aria-label="Type your weather question"]')
    box.fill("What is the source and update time of this answer?")
    page.locator('button[aria-label="Send question"]').click()
    page.wait_for_timeout(15000)
    chat_text = page.inner_text("body")
    check("Grand Est" not in chat_text, "chat: filler-word geocode (Grand Est) gone", failures)
    end_location = page.locator(".wg-ref-location b").inner_text()
    check(end_location == start_location, f"chat: active location unchanged ({start_location})", failures)

    real_errors = [e for e in console_errors if "favicon" not in e.lower() and "fonts.googleapis" not in e]
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
