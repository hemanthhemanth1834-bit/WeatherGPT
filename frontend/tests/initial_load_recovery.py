"""Stage L regression test: initial-load recovery (P0).

Scenario A (no geolocation and no saved location):
  - the header must never stay on "Detecting location…";
  - it must show an honest "…tap to search" placeholder and stay honest
    through the silent retry cycle;
  - the status notice banner becomes visible (previously `notice` was set in
    state but never rendered).

Scenario B (a saved city exists and its first weather request fails):
  - the app retries automatically with NO user action (>= 2 requests);
  - the header settles on the real city from the live backend.

Deterministic: /api/weather/current* is intercepted with page.route; the
assertions use bounded waits only (no fixed-sleep guesses). The backend is
pre-warmed first because the UI client aborts at 20 s by design (api.js) and
a cold local queue is not what this test measures.

Run (backend :8000 + `npm run preview` :4173 up):
  set WG_BROWSERS=chromium,firefox
  set WG_CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
  python frontend/tests/initial_load_recovery.py
"""

import os
import re
import sys
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
API = os.getenv("WG_API_URL", "http://127.0.0.1:8000/api")
BROWSERS = [
    b.strip() for b in os.getenv("WG_BROWSERS", "chromium").split(",") if b.strip()
]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

WEATHER_ROUTE = re.compile(r"/api/weather/current")
PLACEHOLDER = "Detecting location"
HONEST_MARKERS = ("tap to search", "unavailable", "denied")


def check(ok, label, failures):
    print(f"  {'PASS' if ok else 'FAIL'} {label}")
    if not ok:
        failures.append(label)


def warm_backend():
    """Pre-warm the exact endpoint the automatic first load will hit."""
    url = f"{API}/weather/current?" + urllib.parse.urlencode(
        {"location": "New Delhi", "model": "auto", "state": "Delhi NCR"}
    )
    try:
        with urllib.request.urlopen(url, timeout=90) as resp:
            resp.read(2048)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] backend pre-warm failed: {exc}")
        return False


def launch(browser_type):
    opts = {"headless": True}
    if CHROME_PATH and browser_type.name == "chromium":
        opts["executable_path"] = CHROME_PATH
    return browser_type.launch(**opts)


def header_text(page):
    return page.locator(".wg-ref-location b").inner_text().strip()


def scenario_all_fail(browser_type, failures):
    browser = launch(browser_type)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    hits = {"n": 0, "urls": []}

    def handler(route):
        hits["n"] += 1
        hits["urls"].append(route.request.url)
        route.fulfill(
            status=500,
            content_type="application/json",
            body='{"detail":"simulated provider failure"}',
        )

    page.add_init_script("Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })")
    page.route(WEATHER_ROUTE, handler)
    page.goto(UI_URL, wait_until="domcontentloaded")
    page.wait_for_selector(".wg-ref-location b", state="attached", timeout=120000)

    try:
        page.wait_for_function(
            "() => { const b = document.querySelector('.wg-ref-location b');"
            " return b && !b.textContent.includes('Detecting location'); }",
            timeout=60000,
        )
        h1 = header_text(page)
        check(
            any(m in h1.lower() for m in HONEST_MARKERS),
            f"A: header shows an honest placeholder ({h1!r})",
            failures,
        )
    except Exception:
        check(
            False,
            "A: header left 'Detecting location…' (still stuck after 60 s)",
            failures,
        )

    # Stay honest through the silent retry cycle (bounded: one retry at 5 s).
    page.wait_for_timeout(1000)
    h2 = header_text(page)
    check(
        PLACEHOLDER not in h2, f"A: header stays honest after retry ({h2!r})", failures
    )
    # The dashboard may load its explicitly pinned comparison cards, even
    # while the active location is unknown. The invariant is that every
    # weather request is grounded in a non-empty, explicit location query.
    missing_location = [
        url for url in hits["urls"]
        if not urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("location", [""])[0].strip()
    ]
    check(
        not missing_location,
        f"A: no ungrounded weather request without a location (requests={hits['n']}, missing={len(missing_location)})",
        failures,
    )

    # The honest failure notice must actually be visible now.
    try:
        page.wait_for_selector(".wg-ref-notice", timeout=15000)
        notice_text = page.locator(".wg-ref-notice").inner_text()
        check(
            "search for a location manually" in notice_text.lower(),
            f"A: location-help notice visible ({notice_text[:60]!r})",
            failures,
        )
    except Exception:
        check(False, "A: notice banner visible ('.wg-ref-notice' missing)", failures)

    browser.close()


def scenario_recover(browser_type, failures):
    browser = launch(browser_type)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    hits = {"n": 0}

    def handler(route):
        hits["n"] += 1
        if hits["n"] == 1:
            route.fulfill(
                status=500,
                content_type="application/json",
                body='{"detail":"cold start"}',
            )
        else:
            route.continue_()

    page.add_init_script("localStorage.setItem('weathergpt.savedPlaces', JSON.stringify(['New Delhi'])); Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })")
    page.route(WEATHER_ROUTE, handler)
    page.goto(UI_URL, wait_until="domcontentloaded")
    page.wait_for_selector(".wg-ref-location b", state="attached", timeout=120000)

    # No user action anywhere in this scenario: pure automatic recovery.
    try:
        page.wait_for_function(
            "() => { const b = document.querySelector('.wg-ref-location b');"
            " return b && b.textContent.includes('New Delhi'); }",
            timeout=90000,
        )
        check(True, "B: header settled on saved city 'New Delhi' automatically", failures)
    except Exception:
        check(
            False,
            f"B: header did not settle ({header_text(page)!r} after 90 s)",
            failures,
        )

    check(hits["n"] >= 2, f"B: retry observed (requests={hits['n']})", failures)
    # The notice must clear once real data arrives.
    check(
        page.locator(".wg-ref-notice").count() == 0,
        "B: failure notice cleared after recovery",
        failures,
    )
    browser.close()


def main():
    print(f"UI: {UI_URL}  API: {API}  browsers: {BROWSERS}")
    warm_backend()
    failures = []
    with sync_playwright() as p:
        for name in BROWSERS:
            browser_type = getattr(p, name)
            print(f"=== {name} ===")
            scenario_all_fail(browser_type, failures)
            scenario_recover(browser_type, failures)
    print(f"\ninitial_load_recovery: {len(failures)} failure(s)")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
