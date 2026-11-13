"""Navigation IA regression for the local WeatherGPT build.

Verifies that the primary navigation exposes only supported features, that
postponed modules remain reachable from the secondary Platform Status page,
and that the mobile drawer/bottom bar follow the same rules.

Run with backend on 127.0.0.1:8000 and the built UI on 127.0.0.1:4173::

    python frontend/tests/navigation_cleanup.py

Env overrides: WG_UI_URL, WG_CHROME_PATH.
"""

import os
import re
import sys
from pathlib import Path

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
POSTPONED = [
    "Life Cast",
    "Station Comparison",
    "Live News Broadcast",
    "RoadWatch",
    "TreeGuard",
    "Trip Planner",
    "UtilityWatch",
    "Solar Energy Potential",
]
GROUPS = [
    "Overview",
    "Weather & Forecasts",
    "Alerts & Safety",
    "AI Assistant",
    "Advisories & Planning",
]


def check(cond, msg, failures):
    print(("  PASS " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def sidebar_button(page, label):
    return (
        page.locator(".wg-ref-sidebar .wg-ref-nav-item")
        .filter(has_text=re.compile(rf"^{re.escape(label)}$"))
        .first
    )


def open_sidebar(page):
    toggle = page.locator(".wg-ref-menu-btn").first
    if toggle.get_attribute("aria-expanded") != "true":
        toggle.click()
    page.wait_for_timeout(350)


def run():
    failures = []
    root = Path(__file__).resolve().parents[1]
    banned = [
        "Install App",
        "Install application",
        "Add to Home Screen",
        "beforeinstallprompt",
        "appinstalled",
        "wg-ref-install",
    ]
    hits = []
    for target in [root / "src", root / "public", root / "index.html"]:
        files = [target] if target.is_file() else target.rglob("*")
        for path in files:
            if not path.is_file() or path.suffix.lower() in {
                ".png",
                ".jpg",
                ".jpeg",
                ".webp",
                ".ico",
                ".woff",
                ".woff2",
            }:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for phrase in banned:
                if phrase.lower() in text.lower():
                    hits.append(f"{path.relative_to(root)}: {phrase}")
    check(not hits, f"no app-install promotion in source ({hits[:3]})", failures)
    check(
        (root / "public" / "manifest.json").is_file(),
        "web app manifest retained",
        failures,
    )

    launch = {"headless": True}
    if CHROME_PATH:
        launch["executable_path"] = CHROME_PATH
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        page.goto(UI_URL, wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-sidebar", timeout=60000)
        page.wait_for_timeout(1200)

        sidebar = page.locator(".wg-ref-sidebar")
        toggle = page.locator(".wg-ref-menu-btn").first
        check(toggle.is_visible(), "sidebar toggle is visible in the header", failures)
        check(
            "open" not in (sidebar.get_attribute("class") or ""),
            "sidebar is closed by default on desktop",
            failures,
        )
        check(
            sidebar.get_attribute("aria-hidden") == "true",
            "closed sidebar is hidden from assistive technology",
            failures,
        )
        check(
            toggle.get_attribute("aria-expanded") == "false",
            "toggle reports collapsed state",
            failures,
        )
        open_sidebar(page)
        check(
            "open" in (sidebar.get_attribute("class") or ""),
            "sidebar toggle opens the desktop drawer",
            failures,
        )
        check(
            toggle.get_attribute("aria-expanded") == "true",
            "toggle reports expanded state",
            failures,
        )
        page.keyboard.press("Escape")
        page.wait_for_timeout(350)
        check(
            "open" not in (sidebar.get_attribute("class") or ""),
            "Escape closes the desktop drawer",
            failures,
        )
        check(
            page.evaluate("document.activeElement?.getAttribute('aria-label')")
            == "Open navigation",
            "focus returns to the header toggle after closing",
            failures,
        )
        open_sidebar(page)
        page.locator(".wg-ref-nav-overlay").click(position={"x": 1050, "y": 280})
        page.wait_for_timeout(350)
        check(
            "open" not in (sidebar.get_attribute("class") or ""),
            "outside click closes the desktop drawer",
            failures,
        )
        open_sidebar(page)

        groups = [
            t.strip().upper()
            for t in page.locator(
                ".wg-ref-sidebar .wg-ref-nav-heading"
            ).all_inner_texts()
        ]
        check(
            groups == [g.upper() for g in GROUPS],
            f"sidebar groups {groups!r} match the approved IA",
            failures,
        )
        labels = [
            t.strip()
            for t in page.locator(".wg-ref-sidebar .wg-ref-nav-item").all_inner_texts()
        ]
        check(
            labels == PRIMARY,
            f"primary items {labels!r} match the approved set",
            failures,
        )
        for label in POSTPONED:
            check(
                label not in labels, f"{label} absent from primary navigation", failures
            )
        check(
            "Compare" not in labels,
            "Compare shortcut absent from primary navigation",
            failures,
        )
        check(
            "Platform Status" not in labels
            and "Privacy & Data" not in labels
            and "About WeatherGPT" not in labels,
            "platform/privacy/about moved out of primary navigation",
            failures,
        )

        check(
            page.locator('button[aria-label="Open station comparison"]').count() == 0,
            "station-comparison header shortcut removed",
            failures,
        )
        check(page.locator("main").count() == 1, "exactly one main landmark", failures)

        # Every primary route renders content and remains reachable.
        for label in PRIMARY:
            open_sidebar(page)
            sidebar_button(page, label).click()
            page.wait_for_timeout(1200)
            body = page.locator("main").inner_text()
            check(len(body.strip()) > 40, f"route {label!r} renders content", failures)
            check(
                "404" not in body and "not found" not in body.lower(),
                f"route {label!r} has no dead-route marker",
                failures,
            )
            check(
                "install app" not in body.lower()
                and "add to home screen" not in body.lower(),
                f"route {label!r} exposes no app-install promotion",
                failures,
            )
            check(
                page.locator("main h1").count() == 1,
                f"route {label!r} has exactly one h1",
                failures,
            )
            figures = page.locator("main figure")
            for index in range(figures.count()):
                figure = figures.nth(index)
                images = figure.locator("img")
                if images.count() == 0:
                    continue
                check(
                    bool((images.first.get_attribute("alt") or "").strip()),
                    f"route {label!r} figure {index} image has alt text",
                    failures,
                )
                check(
                    figure.locator("a[href]").count() > 0,
                    f"route {label!r} figure {index} exposes source attribution",
                    failures,
                )

        page.goto(UI_URL, wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-shortcut-groups", timeout=60000)
        page.wait_for_timeout(700)
        shortcut_labels = [
            t.strip()
            for t in page.locator(
                ".wg-ref-shortcut-group button > span"
            ).all_inner_texts()
        ]
        check(
            shortcut_labels == PRIMARY,
            f"Overview shortcuts {shortcut_labels!r} match the nine primary sections",
            failures,
        )

        # Direct URLs, active-route state and browser history.
        page.goto(f"{UI_URL}#/floodwatch", wait_until="domcontentloaded")
        page.wait_for_selector(".wg-ref-sidebar", timeout=60000)
        page.wait_for_timeout(700)
        open_sidebar(page)
        check(
            page.locator(".wg-ref-sidebar .wg-ref-nav-item.active").inner_text().strip()
            == "FloodWatch",
            "direct URL activates FloodWatch",
            failures,
        )
        sidebar_button(page, "Severe Alerts").click()
        page.wait_for_timeout(500)
        check(
            "#/severe-alerts" in page.url,
            "navigation updates the URL",
            failures,
        )
        page.go_back()
        page.wait_for_timeout(700)
        open_sidebar(page)
        check(
            page.locator(".wg-ref-sidebar .wg-ref-nav-item.active").inner_text().strip()
            == "FloodWatch",
            "browser Back restores FloodWatch",
            failures,
        )
        page.go_forward()
        page.wait_for_timeout(700)
        open_sidebar(page)
        check(
            page.locator(".wg-ref-sidebar .wg-ref-nav-item.active").inner_text().strip()
            == "Severe Alerts",
            "browser Forward restores Severe Alerts",
            failures,
        )
        page.keyboard.press("Escape")
        page.wait_for_timeout(350)

        # Secondary links live in the global footer.
        footer = page.locator(".wg-ref-site-footer")
        check(footer.is_visible(), "global footer is visible", failures)
        for label in ["Platform Status", "Privacy & Data", "About WeatherGPT"]:
            check(
                footer.get_by_role("button", name=label, exact=True).count() == 1,
                f"footer exposes {label}",
                failures,
            )

        footer.get_by_role("button", name="Platform Status", exact=True).click()
        page.wait_for_selector("h1", timeout=20000)
        check(
            page.get_by_role(
                "heading", name="Platform Status", exact=True
            ).is_visible(),
            "footer opens Platform Status",
            failures,
        )
        status_text = page.locator("main").inner_text()
        check(
            "Status key:" in status_text and "DEGRADED" in status_text,
            "Platform Status explains available/degraded/unavailable states",
            failures,
        )
        for label in [
            "Life Cast",
            "City / Model Comparison",
            "RoadWatch",
            "TreeGuard",
            "Trip Planner",
            "UtilityWatch",
            "Solar Energy Potential",
        ]:
            check(
                page.get_by_role(
                    "button", name=f"Open preview: {label}", exact=True
                ).count()
                == 1,
                f"secondary preview exposes {label}",
                failures,
            )

        # Preview remains functional (no empty placeholder page).
        page.get_by_role(
            "button", name="Open preview: Solar Energy Potential", exact=True
        ).click()
        page.wait_for_selector(".wg-solar-stat", timeout=30000)
        check(
            page.locator(".wg-solar-stat").count() >= 1,
            "Solar preview renders its implemented view",
            failures,
        )
        footer = page.locator(".wg-ref-site-footer")
        footer.get_by_role("button", name="Platform Status", exact=True).click()
        page.wait_for_timeout(300)

        app_errors = [
            e
            for e in errors
            if "favicon" not in e.lower()
            and not e.startswith("Failed to load resource")
            and "api.open-meteo.com" not in e
            and "tile.openstreetmap.org" not in e
            and "gibs.earthdata.nasa.gov" not in e
            and "rainviewer.com" not in e
        ]
        check(
            not app_errors,
            f"no application console errors ({app_errors[:3]})",
            failures,
        )
        ctx.close()

        # Mobile navigation mirrors the same IA.
        mctx = browser.new_context(viewport={"width": 390, "height": 844})
        mpage = mctx.new_page()
        mpage.goto(UI_URL, wait_until="domcontentloaded")
        mpage.wait_for_selector(".wg-ref-mobile-nav", timeout=60000)
        mpage.wait_for_timeout(800)
        bottom = [
            t.strip()
            for t in mpage.locator(".wg-ref-mobile-nav button span").all_inner_texts()
        ]
        check(
            bottom == ["Home", "Weather", "AI Chat", "Alerts", "Menu"],
            f"mobile bottom bar {bottom!r} matches the approved set",
            failures,
        )
        drawer = mpage.locator("#wg-mobile-navigation")
        check(
            "open" not in (drawer.get_attribute("class") or ""),
            "mobile drawer is closed by default",
            failures,
        )
        check(
            drawer.get_attribute("aria-hidden") == "true",
            "closed mobile drawer is hidden from assistive technology",
            failures,
        )
        mpage.locator(".wg-ref-mobile-nav button").filter(has_text="Menu").click()
        mpage.wait_for_timeout(400)
        check(drawer.is_visible(), "mobile menu opens", failures)
        check(
            mpage.locator(".wg-ref-mobile-nav button")
            .filter(has_text="Menu")
            .get_attribute("aria-expanded")
            == "true",
            "mobile menu toggle reports expanded state",
            failures,
        )
        mpage.keyboard.press("Escape")
        mpage.wait_for_timeout(350)
        check(
            "open" not in (drawer.get_attribute("class") or ""),
            "Escape closes the mobile drawer",
            failures,
        )
        check(
            not mpage.locator(".wg-ref-nav-overlay").count(),
            "mobile backdrop is removed when the drawer closes",
            failures,
        )
        mpage.locator(".wg-ref-mobile-nav button").filter(has_text="Menu").click()
        mpage.wait_for_timeout(400)
        drawer_labels = [
            t.strip() for t in drawer.locator(".wg-ref-nav-item").all_inner_texts()
        ]
        for label in PRIMARY:
            check(label in drawer_labels, f"mobile drawer exposes {label}", failures)
        for label in POSTPONED:
            check(label not in drawer_labels, f"mobile drawer hides {label}", failures)
        check(
            drawer.locator(".wg-ref-nav-item").filter(has_text="Privacy & Data").count()
            == 1,
            "mobile drawer exposes Privacy & Data under secondary navigation",
            failures,
        )
        mctx.close()
        browser.close()

    print()
    if failures:
        print(f"FAILED: {len(failures)} navigation check(s)")
        for failure in failures:
            print(" -", failure)
        return 1
    print("All navigation checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
