"""Collapsible navigation regression for the local WeatherGPT build.

Checks that navigation starts collapsed at desktop, laptop, tablet and mobile
widths; that the header toggle, Escape, outside click and backdrop all work;
that focus and ARIA state are correct; and that the main content uses the full
available width while navigation is closed.

Run with the built UI on 127.0.0.1:4173::

    python frontend/tests/sidebar_collapse.py

Env overrides: WG_UI_URL, WG_CHROME_PATH.
"""

import os
import re
import sys

from playwright.sync_api import sync_playwright

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

PRIMARY = [
    "Overview",
    "Live Weather",
    "AI Weather Deep-Cast",
    "Climate Trends",
    "Severe Alerts",
    "FloodWatch",
    "Disaster Preparedness",
    "AI Weather Assistant",
    "Farm / Crop Advisory",
]

VIEWPORTS = [
    (1440, 900, "desktop"),
    (1280, 800, "laptop"),
    (1024, 768, "small laptop"),
    (768, 1024, "tablet"),
    (390, 844, "mobile"),
    (320, 568, "narrow mobile"),
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


def run():
    failures = []
    launch = {"headless": True}
    if CHROME_PATH:
        launch["executable_path"] = CHROME_PATH

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)

        for width, height, name in VIEWPORTS:
            print(f"--- {name} ({width}x{height}) ---")
            ctx = browser.new_context(viewport={"width": width, "height": height})
            page = ctx.new_page()
            errors = []
            page.on(
                "console",
                lambda m: errors.append(m.text) if m.type == "error" else None,
            )
            page.goto(UI_URL, wait_until="domcontentloaded")
            page.wait_for_selector(".wg-ref-menu-btn", timeout=60000)
            page.wait_for_timeout(700)
            mobile = width <= 820
            drawer = page.locator(
                "#wg-mobile-navigation" if mobile else ".wg-ref-sidebar"
            )
            toggle = page.locator(".wg-ref-menu-btn").first

            check(
                "open" not in (drawer.get_attribute("class") or ""),
                f"{name}: navigation is closed by default",
                failures,
            )
            check(
                drawer.get_attribute("aria-hidden") == "true",
                f"{name}: closed navigation is hidden from assistive technology",
                failures,
            )
            check(
                toggle.is_visible()
                and toggle.get_attribute("aria-expanded") == "false",
                f"{name}: header toggle is visible and collapsed",
                failures,
            )
            check(
                "wg-primary-navigation" in (toggle.get_attribute("aria-controls") or "")
                and "wg-mobile-navigation"
                in (toggle.get_attribute("aria-controls") or ""),
                f"{name}: toggle controls both responsive navigation surfaces",
                failures,
            )

            content_width = page.evaluate(
                "document.querySelector('.wg-ref-content')?.getBoundingClientRect().width || 0"
            )
            check(
                content_width >= width * 0.8,
                f"{name}: main content uses the available width when closed",
                failures,
            )

            toggle.click()
            page.wait_for_timeout(350)
            check(
                "open" in (drawer.get_attribute("class") or ""),
                f"{name}: header toggle opens navigation",
                failures,
            )
            check(
                toggle.get_attribute("aria-expanded") == "true"
                and toggle.get_attribute("aria-label") == "Close navigation",
                f"{name}: open state is exposed by ARIA",
                failures,
            )
            check(
                page.locator(".wg-ref-nav-overlay").count() == 1,
                f"{name}: backdrop is present while open",
                failures,
            )
            check(
                page.evaluate("getComputedStyle(document.body).overflow") == "hidden",
                f"{name}: background scrolling is locked while open",
                failures,
            )
            check(
                page.evaluate("document.activeElement?.getAttribute('aria-label')")
                == "Close navigation",
                f"{name}: focus moves into the open drawer",
                failures,
            )

            labels = [
                text.strip()
                for text in drawer.locator(".wg-ref-nav-item").all_inner_texts()
            ]
            present = [label for label in labels if label in PRIMARY]
            check(
                present == PRIMARY,
                f"{name}: all nine primary entries are available in order",
                failures,
            )

            if name == "desktop":
                for label in PRIMARY:
                    if toggle.get_attribute("aria-expanded") != "true":
                        toggle.click()
                        page.wait_for_timeout(300)
                    page.locator(".wg-ref-sidebar .wg-ref-nav-item").filter(
                        has_text=re.compile(rf"^{re.escape(label)}$")
                    ).first.click()
                    page.wait_for_timeout(650)
                    check(
                        "open" not in (drawer.get_attribute("class") or ""),
                        f"desktop: selecting {label} closes the drawer",
                        failures,
                    )
                    check(
                        page.locator(".wg-ref-nav-overlay").count() == 0,
                        f"desktop: backdrop removed after selecting {label}",
                        failures,
                    )
                page.goto(f"{UI_URL}#/floodwatch", wait_until="domcontentloaded")
                page.wait_for_selector(".wg-ref-menu-btn", timeout=60000)
                page.wait_for_timeout(500)
                toggle.click()
                page.wait_for_timeout(350)
                check(
                    page.locator(".wg-ref-sidebar .wg-ref-nav-item.active")
                    .inner_text()
                    .strip()
                    == "FloodWatch",
                    "desktop: direct URL keeps active-route highlighting",
                    failures,
                )

            # Outside click / backdrop closes the drawer.
            if toggle.get_attribute("aria-expanded") != "true":
                toggle.click()
                page.wait_for_timeout(300)
            page.locator(".wg-ref-nav-overlay").click(
                position={"x": max(2, width - 24), "y": max(2, height // 2)}
            )
            page.wait_for_timeout(350)
            check(
                "open" not in (drawer.get_attribute("class") or ""),
                f"{name}: outside click closes navigation",
                failures,
            )
            check(
                page.evaluate("getComputedStyle(document.body).overflow") != "hidden",
                f"{name}: background scrolling is restored",
                failures,
            )

            toggle.click()
            page.wait_for_timeout(300)
            page.keyboard.press("Escape")
            page.wait_for_timeout(350)
            check(
                "open" not in (drawer.get_attribute("class") or ""),
                f"{name}: Escape closes navigation",
                failures,
            )
            check(
                page.evaluate("document.activeElement?.getAttribute('aria-label')")
                == "Open navigation",
                f"{name}: focus returns to the header toggle",
                failures,
            )
            check(
                page.evaluate(
                    "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
                ),
                f"{name}: no horizontal overflow",
                failures,
            )
            check(
                not app_errors(errors),
                f"{name}: no application console errors ({app_errors(errors)[:2]})",
                failures,
            )
            ctx.close()

        print("--- reduced motion (1440x900) ---")
        rctx = browser.new_context(
            viewport={"width": 1440, "height": 900}, reduced_motion="reduce"
        )
        rpage = rctx.new_page()
        rpage.goto(UI_URL, wait_until="domcontentloaded")
        rpage.wait_for_selector(".wg-ref-menu-btn", timeout=60000)
        rpage.wait_for_timeout(500)
        rpage.locator(".wg-ref-menu-btn").first.click()
        rpage.wait_for_timeout(150)
        duration = rpage.evaluate(
            "getComputedStyle(document.querySelector('.wg-ref-sidebar')).transitionDuration"
        )
        try:
            duration_seconds = float(duration.split(",")[0].strip().replace("s", ""))
        except ValueError:
            duration_seconds = 99.0
        check(
            duration_seconds <= 0.001,
            "reduced motion disables the sidebar transition",
            failures,
        )
        check(
            rpage.locator(".wg-ref-sidebar.open").count() == 1,
            "navigation still opens with reduced motion",
            failures,
        )
        rctx.close()
        browser.close()

    if failures:
        print(f"FAILED: {len(failures)} sidebar check(s)")
        for failure in failures:
            print(" -", failure)
        return 1
    print("All collapsible-sidebar checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
