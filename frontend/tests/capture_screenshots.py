"""Stage L2: capture reference screenshots of WeatherGPT (local + prod + benchmark).

Outputs PNGs to docs/visual-references/screenshots/. This is a capture tool,
not an assertion suite: it records the actual current state of the app.

Usage (local preview + backend running):
  set WG_CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
  python frontend/tests/capture_screenshots.py [--local-only] [--remote-only]
"""

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "visual-references" / "screenshots"
LOCAL = "http://127.0.0.1:4173/"
PROD = "https://weathergpt-kappa-pink.vercel.app/"
BENCH = "https://weather-gpt-umber.vercel.app/"
CHROME = os.getenv("WG_CHROME_PATH", "")

# Sidebar label -> output filename (desktop 1440x900, full page).
LOCAL_PAGES = [
    ("Overview", "local-home"),
    ("Live Weather", "local-dashboard"),
    ("AI Weather Deep-Cast", "local-deep-cast"),
    ("Life Cast", "local-life-cast"),
    ("Station Comparison", "local-compare"),
    ("Climate Trends", "local-climate"),
    ("Live News Broadcast", "local-alerts"),
    ("AI Weather Assistant", "local-chat"),
    ("Farm / Crop Advisory", "local-agri"),
    ("RoadWatch", "local-roadwatch"),
    ("TreeGuard", "local-treeguard"),
    ("Trip Planner", "local-trip-planner"),
    ("UtilityWatch", "local-utilitywatch"),
    ("Solar Energy Potential", "local-solar"),
    ("Platform Status", "local-capabilities"),
    ("Disaster Management", "local-severe"),
    ("FloodWatch", "local-floodwatch"),
]


def launch(p):
    opts = {"headless": True}
    if CHROME:
        opts["executable_path"] = CHROME
    return p.chromium.launch(**opts)


def shot(page, name, full_page=True):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=full_page)
    print(f"  saved {path.name}")


def capture_local(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(LOCAL, wait_until="domcontentloaded")
    page.wait_for_selector("main", timeout=90000)
    page.wait_for_selector(".wg-ref-location b", timeout=90000)
    page.wait_for_timeout(9000)  # let the live first load settle
    shot(page, "local-home")

    for label, name in LOCAL_PAGES[1:]:
        try:
            page.get_by_role("button", name=label, exact=False).first.click(
                timeout=15000
            )
            page.wait_for_timeout(4200)
            shot(page, name)
        except Exception as exc:  # noqa: BLE001
            print(f"  [warn] {label}: {exc}")
    # Map tab is only reachable via the header location button.
    try:
        page.locator(".wg-ref-location").first.click(timeout=10000)
        page.wait_for_timeout(4200)
        shot(page, "local-map")
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] map: {exc}")
    ctx.close()

    # Mobile pass: home, navigation drawer, mobile nav bar.
    mctx = browser.new_context(viewport={"width": 390, "height": 844})
    mpage = mctx.new_page()
    mpage.goto(LOCAL, wait_until="domcontentloaded")
    mpage.wait_for_selector("main", timeout=90000)
    mpage.wait_for_timeout(9000)
    shot(mpage, "local-mobile-home", full_page=False)
    try:
        mpage.locator(".wg-ref-menu-btn").first.click(timeout=10000)
        mpage.wait_for_timeout(1200)
        shot(mpage, "local-mobile-drawer", full_page=False)
        mpage.locator(
            ".wg-ref-mobile-drawer button[aria-label='Close navigation']"
        ).first.click()
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] mobile drawer: {exc}")
    shot(mpage, "local-mobile-nav", full_page=False)
    mctx.close()

    # Error-state shot: every weather request fails -> honest placeholder +
    # notice banner must be visible (defect-reference evidence).
    ectx = browser.new_context(viewport={"width": 1440, "height": 900})
    epage = ectx.new_page()
    epage.route(
        "**/api/weather/current*",
        lambda r: r.fulfill(
            status=500, content_type="application/json", body='{"detail":"capture"}'
        ),
    )
    epage.goto(LOCAL, wait_until="domcontentloaded")
    epage.wait_for_selector(".wg-ref-location b", timeout=90000)
    epage.wait_for_timeout(12000)
    shot(epage, "local-error-state", full_page=False)
    ectx.close()
    print("local capture complete")


def capture_remote(browser, url, prefix):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_selector("main", timeout=90000)
    page.wait_for_timeout(12000)
    shot(page, f"{prefix}-home", full_page=False)
    try:
        page.get_by_role("button", name="Live Weather", exact=False).first.click(
            timeout=15000
        )
        page.wait_for_timeout(7000)
        shot(page, f"{prefix}-dashboard")
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] {prefix} dashboard: {exc}")
    ctx.close()

    mctx = browser.new_context(viewport={"width": 390, "height": 844})
    mpage = mctx.new_page()
    mpage.goto(url, wait_until="domcontentloaded", timeout=90000)
    mpage.wait_for_selector("main", timeout=90000)
    mpage.wait_for_timeout(12000)
    shot(mpage, f"{prefix}-mobile-home", full_page=False)
    mctx.close()
    print(f"{prefix} capture complete")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    local_only = "--local-only" in sys.argv
    remote_only = "--remote-only" in sys.argv
    with sync_playwright() as p:
        browser = launch(p)
        if not remote_only:
            capture_local(browser)
        if not local_only:
            capture_remote(browser, PROD, "prod")
            capture_remote(browser, BENCH, "benchmark")
        browser.close()
    print(f"\nScreenshots in {OUT}")


if __name__ == "__main__":
    main()
