"""Deterministic Alerts & Safety regression: official/computed separation,
maps, flood data gaps, preparedness persistence, responsive layout.

Usage: python frontend/tests/alerts_safety.py
Env: WG_UI_URL (default http://127.0.0.1:4173/)
"""

import base64
import copy
import json
import os
import sys
from datetime import datetime, timedelta, timezone

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(__file__))
from imagery_visibility import (  # noqa: E402
    PNG_1PX,
    mock_backend,
    mock_geo,
    mock_imagery_ok,
    weather_fixture,
)

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
FAILURES = []


def check(cond, label):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        FAILURES.append(label)


def iso(delta):
    return (datetime.now(timezone.utc) + delta).isoformat()


def fixture_weather():
    data = copy.deepcopy(weather_fixture())
    data["precipitation"] = 4.2
    for index, hour in enumerate(data["hourly"]):
        hour["rain"] = round(0.2 + (index % 6) * 0.9, 1)
    for index, day in enumerate(data["daily"]):
        day["rain_sum"] = 18.5 if index == 0 else round(1.1 + index * 0.7, 1)
    return data


def computed_alerts():
    return [
        {
            "id": "computed-red-rain",
            "headline": "Heavy rain and thunderstorm over Pune",
            "event": "Heavy Rain",
            "severity": "Red",
            "urgency": "Immediate",
            "certainty": "Likely",
            "effective": iso(timedelta(hours=-2)),
            "expires": iso(timedelta(hours=20)),
            "area_desc": "Pune and adjoining areas",
            "instruction": "Move away from low-lying ground and follow local authority instructions.",
            "district": "Pune",
            "state": "Maharashtra",
            "lat": 18.52,
            "lon": 73.85,
            "sender_name": "WeatherGPT computed threshold engine",
        },
        {
            "id": "computed-expired-heat",
            "headline": "Heatwave update",
            "event": "Heatwave",
            "severity": "Orange",
            "effective": iso(timedelta(days=-3)),
            "expires": iso(timedelta(days=-1)),
            "area_desc": "Pune district",
            "instruction": "Hydrate and avoid direct afternoon sun.",
            "district": "Pune",
            "state": "Maharashtra",
            "lat": 18.52,
            "lon": 73.85,
            "sender_name": "WeatherGPT computed threshold engine",
        },
        {
            "id": "computed-cancelled-wind",
            "headline": "Strong wind warning cancelled",
            "event": "Strong Wind",
            "severity": "Yellow",
            "effective": iso(timedelta(hours=-8)),
            "expires": iso(timedelta(hours=12)),
            "area_desc": "Pune district",
            "instruction": "No further action; monitor updates.",
            "district": "Pune",
            "state": "Maharashtra",
            "lat": 18.52,
            "lon": 73.85,
            "sender_name": "WeatherGPT computed threshold engine",
        },
    ]


def india_alerts():
    return {
        "items": [
            {
                "id": "gdacs-flood-1",
                "headline": "Flood in Maharashtra",
                "event": "Flood",
                "severity": "Orange",
                "official": False,
                "source": "GDACS",
                "source_type": "THIRD PARTY",
                "issued_at": iso(timedelta(hours=-5)),
                "expires_at": iso(timedelta(hours=18)),
                "instruction": "Monitor official updates and avoid flooded roads.",
                "area_desc": "Maharashtra",
                "geometry": {"lat": 19.0, "lon": 75.0},
                "report_url": "https://www.gdacs.org/",
            }
        ],
        "disclaimer": "Third-party official feed. Not an IMD or NDMA bulletin.",
    }


def imd_live():
    return {
        "status": "LIVE",
        "provider": "India Meteorological Department",
        "source": "https://mausam.imd.gov.in/",
        "count": 2,
        "items": [
            {
                "title": "District Nowcast: Thunderstorm with lightning over Pune",
                "description": "Valid for the next 3 hours. Move indoors and avoid open ground.",
                "link": "https://mausam.imd.gov.in/",
                "published": iso(timedelta(hours=-1)),
                "source": "India Meteorological Department",
                "source_type": "OFFICIAL",
                "official": True,
            },
            {
                "title": "Heavy rainfall warning for coastal Maharashtra",
                "description": "Heavy rain likely. Follow local authority instructions.",
                "link": "https://mausam.imd.gov.in/",
                "published": iso(timedelta(hours=-3)),
                "source": "India Meteorological Department",
                "source_type": "OFFICIAL",
                "official": True,
            },
        ],
        "data_type": "OFFICIAL RSS",
        "note": "",
    }


def imd_unavailable():
    return {
        "status": "UNAVAILABLE",
        "provider": "India Meteorological Department",
        "source": "https://mausam.imd.gov.in/",
        "count": 0,
        "items": [],
        "data_type": "OFFICIAL RSS",
        "error": "ConnectTimeout",
    }


def flood_fixture():
    return {
        "risk": "HIGH",
        "score": 72,
        "drivers": [
            "24-hour rainfall of 18.5 mm in the selected area",
            "Point elevation is 560 m; terrain drainage is not modelled",
        ],
        "elevation_m": 560,
        "limits": "Computed from rainfall and point elevation only. Not a hydrological forecast.",
        "rain_24h": 18.5,
    }


def risk_fixture():
    return {
        "overall": "HIGH",
        "location": "Pune",
        "levels": {
            "heat": "LOW",
            "rainfall": "HIGH",
            "flood": "HIGH",
            "wind": "MODERATE",
            "thunderstorm": "HIGH",
            "cyclone": "LOW",
        },
        "advisories": ["Avoid floodwater and follow local authority instructions."],
        "disclaimer": "Computed risk context, not an official warning.",
        "drivers": ["Rainfall threshold", "Thunderstorm coincidence"],
    }


def install_routes(page, mode="live"):
    mock_backend(page)
    mock_imagery_ok(page)
    mock_geo(page)

    page.route(
        "**/tile.openstreetmap.org/**",
        lambda route: route.fulfill(status=200, content_type="image/png", body=PNG_1PX),
    )
    page.route(
        "**/api/weather/current*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(fixture_weather()),
        ),
    )
    page.route(
        "**/api/alerts/active*",
        lambda route: (
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps([] if mode == "down" else computed_alerts()),
            )
            if mode != "down"
            else route.fulfill(
                status=503,
                content_type="application/json",
                body='{"detail":"upstream unavailable"}',
            )
        ),
    )
    page.route(
        "**/api/alerts/india*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {"items": [], "disclaimer": ""} if mode == "down" else india_alerts()
            ),
        ),
    )
    page.route(
        "**/api/imd/warnings*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(imd_unavailable() if mode == "down" else imd_live()),
        ),
    )
    page.route(
        "**/api/flood/risk*",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(flood_fixture()),
        ),
    )
    page.route(
        "**/api/risk/assess*",
        lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps(risk_fixture())
        ),
    )
    for pattern in (
        "**/api/disasters/global*",
        "**/api/disasters/earthquakes*",
        "**/api/disasters/wildfires*",
    ):
        page.route(
            pattern,
            lambda route: route.fulfill(
                status=200, content_type="application/json", body='{"events":[]}'
            ),
        )


def make_page(browser, viewport=(1440, 1000)):
    context = browser.new_context(
        viewport={"width": viewport[0], "height": viewport[1]},
        geolocation={"latitude": 18.52, "longitude": 73.85},
        permissions=["geolocation"],
    )
    page = context.new_page()
    errors = []
    page.on(
        "console",
        lambda message: (
            errors.append(message.text)
            if message.type == "error" and is_relevant_console_error(message.text)
            else None
        ),
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    install_routes(page)
    return context, page, errors


def is_relevant_console_error(text):
    lowered = text.lower()
    if "favicon" in lowered:
        return False
    ignored = (
        "net::err_connection_timed_out",
        "net::err_name_not_resolved",
        "net::err_internet_disconnected",
        # The unavailable-provider case intentionally returns 503 from the
        # mocked API; the UI honesty is asserted separately by the caller.
        "status of 503",
    )
    return not (
        "failed to load resource" in lowered
        and any(token in lowered for token in ignored)
    )


def assert_no_overflow(page, label):
    metrics = page.evaluate(
        "() => ({ page: document.documentElement.scrollWidth, view: window.innerWidth })"
    )
    check(
        metrics["page"] <= metrics["view"] + 2,
        f"{label} no horizontal overflow :: {metrics}",
    )


def run_alerts(browser):
    context, page, errors = make_page(browser)
    try:
        page.goto(
            UI_URL + "#/severe-alerts", wait_until="domcontentloaded", timeout=60000
        )
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_selector(".wg-safety-alert", timeout=60000)

        check(
            page.locator(".wg-safety h1").inner_text().strip()
            == "Official warnings. Clear limits.",
            "Alerts hero title",
        )
        check(page.locator(".wg-safety-kpi").count() == 4, "Alerts four KPI cards")
        check(
            "OFFICIAL FEED LIVE" in page.locator(".wg-safety").inner_text(),
            "Official feed live status",
        )
        check(
            page.locator(".wg-safety-badge.official").count() >= 1,
            "Official badge rendered",
        )
        check(
            page.locator(".wg-safety-badge.computed").count() >= 1,
            "Computed badge rendered",
        )
        check(
            page.locator(".wg-safety-badge.third-party").count() >= 1,
            "Third-party badge rendered",
        )
        check(
            page.locator('section[aria-label="Official warnings"]').count() == 1,
            "Official warnings section",
        )
        check(
            page.locator('section[aria-label="Third-party hazard records"]').count()
            == 1,
            "Third-party section",
        )
        check(
            page.locator('section[aria-label="Computed weather alerts"]').count() == 1,
            "Computed section",
        )
        check(page.locator("ol.wg-safety-timeline").count() == 1, "Warning timeline")
        check(page.locator(".wg-safety-map-panel").count() == 1, "Safety map panel")
        check(page.locator(".wg-safety-map-canvas").count() == 1, "Safety map canvas")
        check(
            page.locator(".wg-safety-map-controls button").count() == 2,
            "Two map layer toggles",
        )
        check(
            page.locator('a[href*="mausam.imd.gov.in"]').count() >= 1,
            "Original IMD source link",
        )

        map_button = page.locator(".wg-safety-map-controls button").first
        before = map_button.get_attribute("aria-pressed")
        map_button.click()
        page.wait_for_timeout(150)
        after = map_button.get_attribute("aria-pressed")
        check(before != after, "Map warnings toggle changes state")
        page.get_by_label("NASA GIBS satellite layer").select_option("imerg")
        check(
            page.get_by_label("NASA GIBS satellite layer").input_value() == "imerg",
            "Satellite layer changes",
        )

        severity = page.locator(
            '.wg-safety-filters[aria-label="Filter warnings by severity"]'
        )
        severity.get_by_role("button", name="Red", exact=True).click()
        page.wait_for_timeout(150)
        check(
            page.locator(".wg-safety-badge.official").count() == 0,
            "Red filter hides official records",
        )
        check(
            page.locator(".wg-safety-badge.computed").count() >= 1,
            "Red filter keeps computed Red alert",
        )
        severity.get_by_role("button", name="All", exact=True).click()
        page.wait_for_timeout(150)

        hazard = page.locator(
            '.wg-safety-filters[aria-label="Filter warnings by hazard"]'
        )
        hazard.get_by_role("button", name="Rain & flood", exact=True).click()
        page.wait_for_timeout(150)
        check(
            page.locator(".wg-safety-badge.third-party").count() >= 1,
            "Flood hazard keeps third-party flood",
        )
        check(
            page.locator(".wg-safety-badge.computed").count() >= 1,
            "Flood hazard keeps computed rain",
        )
        check(
            page.locator(
                'section[aria-label="Official warnings"] .wg-safety-alert:has-text("Thunderstorm")'
            ).count()
            == 0,
            "Flood hazard hides unrelated official nowcast",
        )
        check(
            "rainfall"
            in page.locator('section[aria-label="Official warnings"]')
            .inner_text()
            .lower(),
            "Flood hazard keeps official rainfall warning",
        )
        hazard.locator("button").first.click()
        page.wait_for_timeout(150)

        page.get_by_label("Choose active or recent warnings").select_option("recent")
        page.wait_for_selector(
            'section[aria-label="Expired and cancelled warnings"]', timeout=10000
        )
        recent_text = page.locator(
            'section[aria-label="Expired and cancelled warnings"]'
        ).inner_text()
        check("EXPIRED" in recent_text, "Expired alert status")
        check("CANCELLED" in recent_text, "Cancelled alert status")
        check(
            page.locator('.wg-safety-alert:has-text("Heatwave update")').count() == 1,
            "No duplicated recent alert",
        )

        page.get_by_role("button", name="Emergency contacts", exact=True).first.click()
        page.wait_for_timeout(150)
        check(
            "112" in page.locator("body").inner_text(), "Emergency contacts include 112"
        )
        page.keyboard.press("Escape")

        assert_no_overflow(page, "Alerts 1440")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "Alerts 390")
        page.set_viewport_size({"width": 320, "height": 740})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "Alerts 320")
        check(not errors, f"Alerts no relevant console/page errors :: {errors[:3]}")
    finally:
        context.close()


def run_flood(browser):
    context, page, errors = make_page(browser)
    try:
        page.goto(UI_URL + "#/floodwatch", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_selector(".wg-safety-kpi", timeout=60000)
        page.wait_for_timeout(600)

        check(
            page.locator(".wg-safety h1").inner_text().strip()
            == "Rain is context. Flooding needs evidence.",
            "FloodWatch hero title",
        )
        check(page.locator(".wg-safety-kpi").count() == 4, "FloodWatch four KPI cards")
        check(
            page.locator(".wg-safety-bar").count() >= 20,
            "Hourly rainfall timeline bars",
        )
        check(
            "Maximum hourly" in page.locator(".wg-safety").inner_text(),
            "Rainfall maximum caption",
        )
        check(page.locator(".wg-safety-map-panel").count() == 1, "FloodWatch map")
        check(
            page.locator(".wg-safety-data-gap").count() == 1,
            "FloodWatch data-gap panel",
        )
        body = page.locator(".wg-safety").inner_text()
        check(
            "River gauge" in body and "not connected" in body.lower(),
            "No river gauge values invented",
        )
        check("inundation depth" in body.lower(), "Depth limitation stated")
        check(
            page.locator(
                'section[aria-label="Official flood warnings"] .wg-safety-badge.official'
            ).count()
            >= 1,
            "Official flood warning card",
        )
        check(
            page.locator('section[aria-label="Flood data gaps"]').count() == 1,
            "Flood data gaps section",
        )
        check(
            page.locator('section[aria-label="Local flood snapshot history"]').count()
            == 1,
            "Local snapshot history section",
        )
        check(
            page.locator('[data-testid="live-imagery"]').count() >= 2,
            "Radar and satellite imagery panels",
        )

        stored = page.evaluate(
            "() => localStorage.getItem('weathergpt.floodSnapshots.v1')"
        )
        check(bool(stored), "Flood snapshot persisted")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_timeout(700)
        snapshots = page.evaluate(
            "() => JSON.parse(localStorage.getItem('weathergpt.floodSnapshots.v1') || '[]')"
        )
        check(
            isinstance(snapshots, list) and len(snapshots) >= 1,
            "Flood snapshot survives reload",
        )

        assert_no_overflow(page, "FloodWatch 1440")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "FloodWatch 390")
        page.set_viewport_size({"width": 320, "height": 740})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "FloodWatch 320")
        check(not errors, f"FloodWatch no relevant console/page errors :: {errors[:3]}")
    finally:
        context.close()


def run_preparedness(browser):
    context, page, errors = make_page(browser)
    try:
        page.goto(
            UI_URL + "#/disaster-preparedness",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_timeout(300)

        check(
            page.locator(".wg-safety h1").inner_text().strip()
            == "Prepare before the warning.",
            "Preparedness hero title",
        )
        check(
            page.locator(".wg-safety-hazard-tabs [role=tab]").count() == 5,
            "Five hazard tabs",
        )
        household = page.locator(
            'section[aria-label="Household emergency checklist"] input[type=checkbox]'
        )
        kit = page.locator(
            'section[aria-label="Emergency kit checklist"] input[type=checkbox]'
        )
        check(household.count() == 12, "Twelve household checklist items")
        check(kit.count() == 16, "Sixteen emergency kit items")
        check(
            "0 percent complete"
            in page.locator('[aria-label^="Household checklist"]').get_attribute(
                "aria-label"
            ),
            "Household progress starts at zero",
        )

        household.first.check()
        page.wait_for_timeout(150)
        progress = page.locator('[aria-label^="Household checklist"]').get_attribute(
            "aria-label"
        )
        check("0 percent complete" not in progress, "Household progress updates")
        page.get_by_role("textbox", name="Family meeting point", exact=True).fill(
            "Community hall near the school"
        )
        page.wait_for_timeout(150)
        saved = page.evaluate(
            "() => ({household: localStorage.getItem('weathergpt.preparedness.household.v1'), family: localStorage.getItem('weathergpt.preparedness.familyPlan.v1')})"
        )
        check(
            bool(saved["household"]) and bool(saved["family"]),
            "Preparedness state persisted",
        )

        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_timeout(250)
        check(
            page.locator(
                'section[aria-label="Household emergency checklist"] input[type=checkbox]'
            ).first.is_checked(),
            "Household checkbox survives reload",
        )
        check(
            page.get_by_role(
                "textbox", name="Family meeting point", exact=True
            ).input_value()
            == "Community hall near the school",
            "Family plan survives reload",
        )

        with page.expect_download(timeout=15000) as download_info:
            page.get_by_role("button", name="Download plan", exact=True).click()
        download = download_info.value
        check(
            download.suggested_filename == "weathergpt-preparedness-plan.txt",
            "Preparedness plan download filename",
        )

        page.get_by_role("button", name="Emergency contacts", exact=True).first.click()
        page.wait_for_timeout(150)
        check(
            "112" in page.locator("body").inner_text(),
            "Preparedness contacts include 112",
        )
        page.keyboard.press("Escape")
        check(
            page.locator(
                'section[aria-label="Shelter and evacuation data gap"]'
            ).count()
            == 1,
            "Shelter data-gap panel",
        )
        check(
            "No verified shelter"
            in page.locator(
                'section[aria-label="Disaster preparedness center"]'
            ).inner_text(),
            "No invented shelters",
        )

        assert_no_overflow(page, "Preparedness 1440")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "Preparedness 390")
        page.set_viewport_size({"width": 320, "height": 740})
        page.wait_for_timeout(250)
        assert_no_overflow(page, "Preparedness 320")
        check(
            not errors, f"Preparedness no relevant console/page errors :: {errors[:3]}"
        )
    finally:
        context.close()


def run_unavailable(browser):
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        geolocation={"latitude": 18.52, "longitude": 73.85},
        permissions=["geolocation"],
    )
    page = context.new_page()
    errors = []
    page.on(
        "console",
        lambda message: (
            errors.append(message.text)
            if message.type == "error" and is_relevant_console_error(message.text)
            else None
        ),
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    install_routes(page, mode="down")
    try:
        page.goto(
            UI_URL + "#/severe-alerts", wait_until="domcontentloaded", timeout=60000
        )
        page.wait_for_selector(".wg-safety h1", timeout=60000)
        page.wait_for_timeout(800)
        body = page.locator(".wg-safety").inner_text()
        check("UNAVAILABLE" in body, "Unavailable official feed is stated")
        check(
            page.locator(".wg-safety-alert").count() == 0,
            "No fabricated alerts when providers fail",
        )
        check(
            "not a safety clearance" in body.lower()
            or "not a safety guarantee" in body.lower(),
            "No-alert caveat",
        )
        check(
            not errors,
            f"Unavailable state no relevant console/page errors :: {errors[:3]}",
        )
    finally:
        context.close()


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            run_alerts(browser)
            run_flood(browser)
            run_preparedness(browser)
            run_unavailable(browser)
        finally:
            browser.close()
    print("RESULT", "PASS" if not FAILURES else f"FAIL {len(FAILURES)}")
    if FAILURES:
        for failure in FAILURES:
            print("FAILED:", failure)
        sys.exit(1)


if __name__ == "__main__":
    main()
