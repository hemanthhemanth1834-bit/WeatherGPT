"""Functional and data-integrity checks for AI Weather Deep-Cast.

Covers the 25 numbered topics, selected-location behavior, real imagery and
attribution, radar/OSM map, model refetch, location search, responsive layout
and console health. Requires the backend and built preview on loopback.

    python frontend/tests/deepcast_functional.py

Env overrides: WG_UI_URL, WG_CHROME_PATH.
"""

import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

TOPICS = [
    "Live Satellite Intelligence",
    "Live Radar & Rainfall Tracking",
    "AI Precipitation Deep-Cast",
    "Atmospheric Pressure & Synoptic Systems",
    "Wind Field & Gust Analysis",
    "Thunderstorm & Atmospheric Instability",
    "Humidity, Moisture & Cloud Layers",
    "Heatwave, Temperature & Thermal Analysis",
    "Multi-Model Forecast Comparison",
    "Forecast Accuracy & Verification",
    "Severe Weather Probability",
    "Rainfall Anomaly & Monsoon Analysis",
    "Flash-Flood Potential",
    "River & Catchment Monitoring",
    "Cyclone & Tropical System Tracking",
    "Lightning & Convective Hazards",
    "Visibility & Fog Analysis",
    "Air Quality & Aerosols",
    "Soil Moisture & Agricultural Stress",
    "Drought & Water Stress",
    "Coastal & Marine Forecast",
    "Solar Radiation & Cloud Impact",
    "Upper-Air & Vertical Profiles",
    "Weather Timeline & Event Replay",
    "AI Weather Analyst",
]

VIEWPORTS = [(320, 568), (375, 812), (768, 1024), (1024, 768), (1440, 900)]


def check(cond, msg, failures):
    print(("  PASS " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def is_app_console_error(text):
    ignored_hosts = (
        "openstreetmap.org",
        "rainviewer.com",
        "earthdata.nasa.gov",
        "gibs.earthdata.nasa.gov",
        "basemaps.cartocdn.com",
    )
    lowered = text.lower()
    return not any(host in lowered for host in ignored_hosts)


def wait_for_forecast(page, timeout=90000):
    page.wait_for_selector(".wg-dc h1", timeout=timeout)
    page.wait_for_function(
        "() => document.querySelectorAll('.wg-dc-topic').length === 25",
        timeout=timeout,
    )
    page.wait_for_function(
        """() => {
          const metric = document.querySelector('.wg-dc-metric strong');
          return metric && /[0-9]/.test(metric.textContent);
        }""",
        timeout=timeout,
    )


def install_seed(page):
    page.add_init_script(
        """
        try {
          localStorage.setItem('weathergpt.savedPlaces', JSON.stringify(['New Delhi']));
        } catch (e) {}
        try {
          // Match the app's supported no-geolocation fallback path. A custom
          // failing stub can resolve before the saved-location effect settles.
          Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: undefined,
          });
        } catch (e) {}
        """
    )


def image_ready(page, locator, timeout=30000):
    locator.scroll_into_view_if_needed()
    page.wait_for_function(
        "(img) => img && img.complete && img.naturalWidth > 40",
        arg=locator.element_handle(),
        timeout=timeout,
    )


def run():
    failures = []
    launch = {"headless": True}
    if CHROME_PATH:
        launch["executable_path"] = CHROME_PATH

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        install_seed(page)
        errors = []
        page.on(
            "console",
            lambda m: (
                errors.append(m.text)
                if m.type == "error" and is_app_console_error(m.text)
                else None
            ),
        )
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(UI_URL + "#/deep-cast", wait_until="domcontentloaded")
        # Wait for the app's saved-location recovery before asserting data.
        # The former metric-based readiness check could pass on a placeholder
        # such as "-°C" while the forecast request was still in flight.
        page.wait_for_function(
            "() => document.querySelector('.wg-dc-location-line')?.textContent.includes('New Delhi')",
            timeout=90000,
        )
        wait_for_forecast(page)

        check(page.locator(".wg-dc h1").count() == 1, "one Deep-Cast h1", failures)
        check(
            page.locator(".wg-dc h1").inner_text().strip() == "AI Weather Deep-Cast",
            "Deep-Cast heading is exact",
            failures,
        )
        location_line = page.locator(".wg-dc-location-line").inner_text()
        check(
            "New Delhi" in location_line,
            f"saved location applied ({location_line!r})",
            failures,
        )

        sections = page.locator(".wg-dc-topic")
        check(
            sections.count() == 25, f"25 topic sections ({sections.count()})", failures
        )
        numbers = [
            t.strip() for t in page.locator(".wg-dc-topic-number").all_inner_texts()
        ]
        check(
            numbers == [f"{i:02d}" for i in range(1, 26)],
            "topics numbered 01-25 in order",
            failures,
        )
        titles = [t.strip() for t in page.locator(".wg-dc-topic h2").all_inner_texts()]
        check(titles == TOPICS, "all 25 topic titles and order match", failures)

        check(
            page.locator(".wg-dc-metrics .wg-dc-metric").count() == 8,
            "eight summary metrics",
            failures,
        )
        check(
            page.locator(".wg-dc-signals").is_visible(),
            "signals strip visible",
            failures,
        )
        check(
            page.locator(".wg-dc-analyst li").count() >= 5,
            "AI analyst has grounded statements",
            failures,
        )

        # Real satellite imagery (VIIRS), flood layer and aerosol layer.
        loaded_images = 0
        for topic, name in [("01", "satellite"), ("13", "flood"), ("18", "aerosol")]:
            figure = (
                page.locator(f"#deepcast-topic-{topic} figure")
                .filter(has=page.locator("img"))
                .first
            )
            if figure.count() == 0:
                check(False, f"{name} imagery figure present", failures)
                continue
            img = figure.locator("img").first
            try:
                image_ready(page, img)
                loaded_images += 1
            except Exception as exc:  # noqa: BLE001
                check(False, f"{name} image loaded ({exc})", failures)
                continue
            alt = img.get_attribute("alt") or ""
            check(len(alt.strip()) >= 15, f"{name} image has meaningful alt", failures)
            check(
                figure.locator("a[href]").count() >= 1,
                f"{name} image has source attribution",
                failures,
            )
            text = figure.inner_text().lower()
            check(
                "delayed" in text or "historical" in text,
                f"{name} imagery is not labelled live",
                failures,
            )
        check(loaded_images == 3, "all three topic imagery panels loaded", failures)

        radar = page.locator(".wg-dc-radar-map.leaflet-container").first
        check(radar.is_visible(), "radar map is a real Leaflet map", failures)
        attribution = page.locator(
            ".wg-dc-radar-map .leaflet-control-attribution"
        ).first.inner_text()
        check(
            "OpenStreetMap" in attribution and "RainViewer" in attribution,
            "radar attribution includes OSM and RainViewer",
            failures,
        )
        check(
            page.locator(".wg-dc-radar input[type=range]").count() == 1,
            "radar frame slider present",
            failures,
        )
        check(
            page.locator(".wg-dc-chart, .wg-dc-profile").count() >= 8,
            "multiple real charts present",
            failures,
        )

        # Model comparison table and unavailable topics.
        rows = page.locator("#deepcast-topic-09 table tbody tr")
        check(
            rows.count() >= 4,
            f"model comparison has four or more models ({rows.count()})",
            failures,
        )
        for topic, expected in [("10", "UNAVAILABLE"), ("14", "UNAVAILABLE")]:
            text = page.locator(f"#deepcast-topic-{topic}").inner_text().upper()
            check(
                expected in text,
                f"topic {topic} honestly labelled {expected}",
                failures,
            )

        # Jump links must scroll inside Deep-Cast without changing the route.
        before = page.url
        page.locator(".wg-dc-jump a").nth(12).click()
        page.wait_for_timeout(900)
        check(page.url == before, "topic jump link keeps Deep-Cast route", failures)
        check(
            page.locator("#deepcast-topic-13").is_visible(),
            "topic jump target visible",
            failures,
        )

        # Model selector performs a real model-specific refetch.
        with page.expect_response(
            re.compile(r"open-meteo\.com.*models=gfs_seamless"), timeout=90000
        ) as response_info:
            page.locator(".wg-dc-control-row select").select_option("gfs_seamless")
        response = response_info.value
        check(
            response.status == 200,
            f"GFS model refetch HTTP {response.status}",
            failures,
        )
        page.wait_for_function(
            "() => document.querySelectorAll('.wg-dc-topic').length === 25",
            timeout=90000,
        )

        # Location search updates the header away from the seeded default.
        search = page.locator("#deepcast-location-search")
        search.fill("Mumbai")
        page.locator(".wg-dc-search button[type=submit]").click()
        try:
            page.wait_for_function(
                "() => (document.querySelector('.wg-dc-location-line')?.innerText || '').includes('Mumbai')",
                timeout=60000,
            )
            search_ok = True
        except Exception:  # noqa: BLE001
            search_ok = False
        check(search_ok, "location search updates Deep-Cast header", failures)
        page.wait_for_timeout(800)
        check(
            not errors,
            f"no application console errors (desktop): {errors[:3]}",
            failures,
        )

        # Responsive sweep; reload each time to re-apply the saved location.
        for width, height in VIEWPORTS:
            page.set_viewport_size({"width": width, "height": height})
            errors.clear()
            page.goto(UI_URL + "#/deep-cast", wait_until="domcontentloaded")
            try:
                wait_for_forecast(page)
            except Exception as exc:  # noqa: BLE001
                check(False, f"{width}x{height} Deep-Cast loaded ({exc})", failures)
                continue
            page.wait_for_timeout(900)
            overflow = page.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            check(
                overflow <= 1,
                f"{width}x{height} no horizontal overflow ({overflow}px)",
                failures,
            )
            check(
                page.locator(".wg-dc-topic").count() == 25,
                f"{width}x{height} keeps all 25 topics",
                failures,
            )
            check(
                page.locator(".wg-ref-menu-btn").first.is_visible(),
                f"{width}x{height} header navigation toggle remains visible",
                failures,
            )
            if width <= 620:
                pill = page.locator(".wg-ref-theme-float").first
                display = (
                    pill.evaluate("el => getComputedStyle(el).display")
                    if pill.count()
                    else "none"
                )
                check(
                    display == "none",
                    f"{width}px theme pill hidden on Deep-Cast",
                    failures,
                )
            check(
                not errors,
                f"{width}x{height} no application console errors: {errors[:2]}",
                failures,
            )

        context.close()
        browser.close()

    print()
    if failures:
        print(f"FAILED: {len(failures)} check(s)")
        for failure in failures:
            print(" - " + failure)
        sys.exit(1)
    print("SUCCESS: all Deep-Cast functional checks passed")


if __name__ == "__main__":
    run()
