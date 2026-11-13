"""Logo-to-Overview navigation regression for the local WeatherGPT build.

Verifies the header brand is a real link/accessible control, navigates to the
existing Overview route from every primary section, works from the keyboard,
keeps the sidebar closed (or closes it when open), does not reload the app when
already on Overview, and stays usable at desktop and mobile widths.

Run against the built preview on 127.0.0.1:4173:

    python frontend/tests/logo_navigation.py

Env overrides: WG_UI_URL, WG_CHROME_PATH.
"""

import os

from playwright.sync_api import sync_playwright

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")
BRAND_NAME = "WeatherGPT — Go to Overview"

# Every primary section except Overview. The logo must leave each of these
# and land on the existing home/Overview route.
ROUTES = [
    ("live-weather", "Live Weather"),
    ("deep-cast", "AI Weather Deep-Cast"),
    ("climate-trends", "Climate Trends"),
    ("severe-alerts", "Severe Alerts"),
    ("floodwatch", "FloodWatch"),
    ("disaster-preparedness", "Disaster Preparedness"),
    ("ai-assistant", "AI Weather Assistant"),
    ("farm-advisory", "Farm / Crop Advisory"),
]


def check(condition, label, failures):
    print(("  PASS " if condition else "  FAIL ") + label)
    if not condition:
        failures.append(label)


def app_errors(messages):
    ignored = (
        "favicon",
        "tile.openstreetmap.org",
        "api.open-meteo.com",
        "rainviewer.com",
        "gibs.earthdata.nasa.gov",
        "Failed to load resource",
    )
    return [m for m in messages if not any(token in m for token in ignored)]


def route_url(slug):
    return UI_URL + "#/" + slug


def wait_for_home(page):
    page.wait_for_function(
        "window.location.hash === '#/' || window.location.hash === ''",
        timeout=15000,
    )
    page.wait_for_selector(".wg-ref-hero h1", timeout=30000)
    page.wait_for_function(
        "() => document.querySelector('.wg-ref-hero h1')?.textContent.includes('Weather Intelligence')",
        timeout=15000,
    )


def open_sidebar(page):
    toggle = page.locator(".wg-ref-menu-btn").first
    if toggle.get_attribute("aria-expanded") != "true":
        toggle.click()
    page.wait_for_function(
        "() => document.querySelector('.wg-ref-menu-btn')?.getAttribute('aria-expanded') === 'true'",
        timeout=5000,
    )


def run():
    failures = []
    launch = {"headless": True}
    if CHROME_PATH:
        launch["executable_path"] = CHROME_PATH

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)

        # ---- Desktop: every primary section -> Overview -------------------
        print("--- desktop 1440x900: logo from every primary section ---")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(UI_URL, wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-brand", timeout=60000)
        page.wait_for_timeout(500)
        brand = page.locator(".wg-ref-brand")
        check(
            brand.get_attribute("href") == "#/",
            "logo href uses the existing home route",
            failures,
        )
        check(
            brand.get_attribute("aria-label") == BRAND_NAME,
            "logo has the required accessible name",
            failures,
        )
        check(
            brand.evaluate("el => getComputedStyle(el).cursor") == "pointer",
            "logo shows a pointer cursor",
            failures,
        )
        check(
            brand.locator(".wg-ref-brand-icon").count() == 1,
            "logo artwork is preserved",
            failures,
        )
        icon = brand.locator(".wg-ref-brand-icon")
        shadow_before = icon.evaluate("el => getComputedStyle(el).boxShadow")
        brand.hover()
        page.wait_for_timeout(300)
        shadow_after = icon.evaluate("el => getComputedStyle(el).boxShadow")
        check(shadow_after != shadow_before, "logo has a subtle hover effect", failures)

        for slug, label in ROUTES:
            page.goto(route_url(slug), wait_until="domcontentloaded")
            page.wait_for_selector(".wg-ref-brand", timeout=30000)
            page.wait_for_timeout(250)
            page.evaluate("window.__wgLogoMarker = 'alive'")
            brand = page.locator(".wg-ref-brand")
            brand.click()
            wait_for_home(page)
            kept = page.evaluate("window.__wgLogoMarker === 'alive'")
            check(kept, f"{label} -> Overview without a full reload", failures)

        # ---- Already on Overview: no reload, no history churn -------------
        print("--- already on Overview ---")
        page.goto(UI_URL + "#/", wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-hero h1", timeout=30000)
        hash_before = page.evaluate("window.location.hash")
        history_before = page.evaluate("window.history.length")
        page.evaluate("window.__wgLogoMarker = 'overview'")
        page.locator(".wg-ref-brand").click()
        page.wait_for_timeout(350)
        check(
            page.evaluate("window.__wgLogoMarker === 'overview'"),
            "Overview click does not reload the app",
            failures,
        )
        check(
            page.evaluate("window.location.hash") == hash_before,
            "Overview click keeps the same URL",
            failures,
        )
        check(
            page.evaluate("window.history.length") == history_before,
            "Overview click adds no unnecessary history entry",
            failures,
        )
        check(
            page.evaluate("performance.getEntriesByType('navigation').length") == 1,
            "only one document navigation occurred",
            failures,
        )

        # ---- Sidebar interaction and keyboard ------------------------------
        print("--- sidebar and keyboard ---")
        page.goto(route_url("floodwatch"), wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-brand", timeout=30000)
        open_sidebar(page)
        page.locator(".wg-ref-brand").click()
        wait_for_home(page)
        check(
            page.locator(".wg-ref-menu-btn").first.get_attribute("aria-expanded")
            == "false",
            "logo click closes an open sidebar",
            failures,
        )
        check(
            page.locator(".wg-ref-nav-overlay").count() == 0,
            "logo click removes the backdrop",
            failures,
        )

        # Closed sidebar must stay closed when the logo is clicked.
        page.locator(".wg-ref-brand").click()
        page.wait_for_timeout(250)
        check(
            page.locator(".wg-ref-menu-btn").first.get_attribute("aria-expanded")
            == "false",
            "logo click does not open a closed sidebar",
            failures,
        )

        # Keyboard activation from a non-home route.
        page.goto(route_url("farm-advisory"), wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-brand", timeout=30000)
        page.locator("body").click(position={"x": 4, "y": 4})
        focused = False
        for _ in range(12):
            page.keyboard.press("Tab")
            if page.evaluate(
                "document.activeElement?.classList.contains('wg-ref-brand')"
            ):
                focused = True
                break
        check(focused, "logo is reachable by Tab", failures)
        if focused:
            outline = page.evaluate(
                "() => { const s = getComputedStyle(document.activeElement); return {style:s.outlineStyle, width:s.outlineWidth}; }"
            )
            check(
                outline["style"] != "none" and outline["width"] not in ("0px", ""),
                "logo has a visible keyboard focus ring",
                failures,
            )
            page.keyboard.press("Enter")
            wait_for_home(page)
            check(
                page.evaluate("window.location.hash") == "#/",
                "Enter on the logo opens Overview",
                failures,
            )

        check(
            not app_errors(errors),
            "desktop has no application console errors",
            failures,
        )
        if app_errors(errors):
            print("    console:", app_errors(errors)[:4])
        ctx.close()

        # ---- Mobile positioning and activation ----------------------------
        print("--- mobile 390x844 ---")
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors = []
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(route_url("live-weather"), wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-brand", timeout=60000)
        page.wait_for_timeout(500)
        brand_box = page.locator(".wg-ref-brand").bounding_box()
        menu_box = page.locator(".wg-ref-menu-btn").first.bounding_box()
        check(
            brand_box is not None and brand_box["width"] > 100,
            "logo is visible at mobile width",
            failures,
        )
        check(
            brand_box is not None
            and brand_box["x"] >= menu_box["x"] + menu_box["width"],
            "logo sits after the menu toggle without overlap",
            failures,
        )
        check(
            brand_box is not None and brand_box["x"] + brand_box["width"] <= 390,
            "logo stays inside the mobile viewport",
            failures,
        )
        page.locator(".wg-ref-brand").click()
        wait_for_home(page)
        check(
            page.locator(".wg-ref-hero h1").is_visible(),
            "mobile logo click opens Overview",
            failures,
        )
        check(
            page.locator(".wg-ref-menu-btn").first.get_attribute("aria-expanded")
            == "false",
            "mobile sidebar remains closed after logo click",
            failures,
        )
        check(
            not app_errors(errors), "mobile has no application console errors", failures
        )
        if app_errors(errors):
            print("    console:", app_errors(errors)[:4])
        ctx.close()
        browser.close()

    if failures:
        print(f"\nFAILED: {len(failures)} check(s)")
        for item in failures:
            print(" -", item)
        return 1
    print("\nAll logo navigation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
