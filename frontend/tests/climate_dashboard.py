"""Focused deterministic checks for the Climate Trends dashboard.

Uses the real frontend build and a server-computed mock payload. The payload
is generated from the backend aggregation code with synthetic daily records;
it is a test fixture only and is never a production fallback.
"""

import json
import os
import sys
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(__file__))
from imagery_visibility import mock_backend, mock_imagery_ok, weather_fixture  # noqa: E402

URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
MOCK_PATH = os.getenv(
    "WG_CLIMATE_MOCK",
    os.path.join(os.environ.get("TEMP", "."), "opencode", "climate_mock.json"),
)
with open(MOCK_PATH, encoding="utf-8") as handle:
    BASE_DATA = json.load(handle)

failures = []
checks = 0


def check(cond, label, detail=""):
    global checks
    checks += 1
    print(("PASS " if cond else "FAIL ") + label + (f" :: {detail}" if detail else ""))
    if not cond:
        failures.append(label)


def location_from(route):
    query = parse_qs(urlparse(route.request.url).query)
    return (query.get("location") or [""])[0]


def climate_payload(location):
    data = json.loads(json.dumps(BASE_DATA))
    if location.strip().lower() == "mumbai":
        data.update(
            location="Mumbai",
            state="Maharashtra",
            lat=19.076,
            lon=72.8777,
        )
    return data


def weather_payload(location):
    data = weather_fixture()
    data["location"] = location
    if location.strip().lower() == "mumbai":
        data.update(location="Mumbai", state="Maharashtra", lat=19.076, lon=72.8777)
    else:
        data.update(location="New Delhi", state="Delhi", lat=28.6139, lon=77.209)
    return data


def seed_location(context):
    context.add_init_script(
        """
        try {
          localStorage.setItem('weathergpt.savedPlaces', JSON.stringify(['New Delhi']));
        } catch (e) {}
        try {
          Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
        } catch (e) {}
        """
    )


def install_routes(page, climate_handler=None):
    mock_backend(page)
    mock_imagery_ok(page)
    page.route(
        "**/api/weather/current*",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(weather_payload(location_from(r))),
        ),
    )
    page.route(
        "**/api/climate/dashboard*",
        climate_handler
        or (
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(climate_payload(location_from(r))),
            )
        ),
    )


def is_app_console_error(text):
    lowered = text.lower()
    external = (
        "net::err_connection_timed_out",
        "net::err_name_not_resolved",
        "net::err_internet_disconnected",
    )
    return not (
        "failed to load resource" in lowered
        and any(code in lowered for code in external)
    )


def open_dashboard(browser, viewport):
    context = browser.new_context(viewport=viewport)
    seed_location(context)
    page = context.new_page()
    errors = []
    page.on(
        "console",
        lambda m: (
            errors.append(m.text)
            if m.type == "error" and is_app_console_error(m.text)
            else None
        ),
    )
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    install_routes(page)
    page.goto(URL + "#/climate-trends", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector(".wg-climate-kpi", timeout=60000)
    return context, page, errors


def run_main(browser):
    context, page, errors = open_dashboard(browser, {"width": 1440, "height": 1000})
    try:
        check(
            page.locator(".wg-climate h1").inner_text().strip() == "Climate Trends",
            "hero heading",
        )
        check(page.locator(".wg-climate-kpi").count() == 6, "six overview KPIs")
        check(
            page.locator(".wg-climate-section").count() >= 7,
            "all analysis sections mounted",
        )
        check(
            page.locator(".wg-climate-chart-card").count() >= 4
            and page.locator(".wg-climate-mini-card").count() >= 2
            and page.locator(".wg-climate-rain-card").count() >= 4,
            "chart, comparison and rain cards mounted",
        )
        check(
            page.locator(".wg-climate-season").count() == 4, "four seasonal summaries"
        )
        check(
            page.locator(".wg-climate-insight").count() >= 4, "deterministic insights"
        )
        check(
            "New Delhi" in page.locator(".wg-climate-overview-head h2").inner_text(),
            "selected location",
        )
        check(
            "1991" in page.locator(".wg-climate-hero").inner_text(),
            "analysis period shown",
        )
        check(
            page.locator("[data-testid=live-imagery]").count() == 2,
            "two climate map figures",
        )

        page.locator(
            '[aria-label="Temperature metric"] button', has_text="Mean max"
        ).click()
        check(
            page.locator(
                '[aria-label="Temperature metric"] button', has_text="Mean max"
            ).get_attribute("aria-pressed")
            == "true",
            "temperature metric switch",
        )

        rain_section = page.locator('section[aria-labelledby="climate-rain-title"]')
        rain_section.get_by_role("button", name="Monthly", exact=True).click()
        check(
            rain_section.get_by_role(
                "button", name="Monthly", exact=True
            ).get_attribute("aria-pressed")
            == "true",
            "rainfall view switch",
        )

        anomaly = page.locator(".wg-climate-anomaly-controls select").first
        before = page.locator(".wg-climate-anomaly-detail").inner_text()
        anomaly.select_option(index=1)
        check(
            page.locator(".wg-climate-anomaly-detail").inner_text() != before,
            "anomaly month changes detail",
        )

        with page.expect_download(timeout=15000) as info:
            page.locator("button", has_text="Annual CSV").first.click()
        download = info.value
        path = download.path()
        size = os.path.getsize(path) if path else 0
        check(
            size > 200,
            "annual CSV download",
            f"{size} bytes, {download.suggested_filename}",
        )

        page.locator(".wg-climate-search input").fill("Mumbai")
        page.locator(".wg-climate-search input").press("Enter")
        page.wait_for_function(
            "() => document.querySelector('.wg-climate-overview-head h2')?.textContent.includes('Mumbai')",
            timeout=30000,
        )
        check(
            "Mumbai" in page.locator(".wg-climate-overview-head h2").inner_text(),
            "location switching",
        )

        overflow = page.evaluate(
            "document.documentElement.scrollWidth - window.innerWidth"
        )
        check(overflow <= 1, "no desktop horizontal overflow", f"{overflow}px")
        check(
            not errors,
            "no relevant desktop console/page errors",
            " | ".join(errors[:3]),
        )
    finally:
        context.close()


def run_error_retry(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    seed_location(context)
    page = context.new_page()
    page.add_init_script("window.__climateCalls = 0;")
    # The counter is advanced in the route handler, not the page.
    state = {"calls": 0}

    def handler(route):
        state["calls"] += 1
        if state["calls"] == 1:
            route.fulfill(
                status=502,
                content_type="application/json",
                body=json.dumps({"detail": "Archive unavailable: test timeout"}),
            )
        else:
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(climate_payload(location_from(route))),
            )

    install_routes(page, handler)
    try:
        page.goto(
            URL + "#/climate-trends", wait_until="domcontentloaded", timeout=60000
        )
        page.wait_for_selector(".wg-climate-error", timeout=30000)
        check(page.locator(".wg-climate-error").is_visible(), "provider error state")
        page.get_by_role("button", name="Retry archive").click()
        page.wait_for_selector(".wg-climate-kpi", timeout=30000)
        check(page.locator(".wg-climate-kpi").count() == 6, "retry recovers dashboard")
        check(state["calls"] >= 2, "retry actually refetched", str(state["calls"]))
    finally:
        context.close()


def run_responsive(browser):
    for width, height in ((390, 844), (320, 740)):
        context, page, errors = open_dashboard(
            browser, {"width": width, "height": height}
        )
        try:
            page.locator(".wg-climate").scroll_into_view_if_needed()
            overflow = page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            check(
                overflow <= 1, f"no horizontal overflow at {width}px", f"{overflow}px"
            )
            chart_width = page.locator(".wg-climate-chart-card").first.bounding_box()[
                "width"
            ]
            check(chart_width <= width, f"chart fits {width}px", f"{chart_width}px")
            check(
                page.locator(".wg-climate-kpi").count() == 6,
                f"KPIs render at {width}px",
            )
            check(
                not errors,
                f"no relevant console errors at {width}px",
                " | ".join(errors[:3]),
            )
        finally:
            context.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        run_main(browser)
        run_error_retry(browser)
        run_responsive(browser)
    finally:
        browser.close()

print(f"RESULT {'PASS' if not failures else 'FAIL'} {checks - len(failures)}/{checks}")
if failures:
    print("FAILED:", failures)
    sys.exit(1)
