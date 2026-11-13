"""Selected-location fallback when the weather provider is unavailable.

The app must keep showing a saved/selected place even when the forecast
request fails. It must not claim live values or silently drop the location.
"""

import json
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4173/"
SELECTED = "New Delhi"
PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c"
    "4890000000d49444154789c6360000000020001e221bc330000000049454e44ae426082"
)


def is_relevant_console_error(text):
    lowered = text.lower()
    if "favicon" in lowered:
        return False
    ignored = (
        "net::err_connection_timed_out",
        "net::err_name_not_resolved",
        "net::err_internet_disconnected",
        "status of 503",
        "status of 502",
    )
    return not (
        "failed to load resource" in lowered
        and any(token in lowered for token in ignored)
    )


def install_routes(page, weather_ok=False):
    def mock_api(route):
        parsed = urlparse(route.request.url)
        query = parse_qs(parsed.query)
        if parsed.path.endswith("/weather/current") and weather_ok:
            location = query.get("location", ["28.61, 77.21"])[0]
            payload = {
                "location": location,
                "state": "",
                "country": "India",
                "lat": 28.6139,
                "lon": 77.209,
                "current_temp": 25.0,
                "feels_like": 26.0,
                "condition": "Clear",
                "humidity": 50,
                "wind_speed": 5.0,
                "wind_direction": "NE",
                "precipitation": 0.0,
                "cloud_cover": 10,
                "pressure": 1010,
                "uv_index": 4,
                "visibility": 10,
                "hourly": [],
                "daily": [],
                "data_source": "Deterministic browser-test fixture",
                "status": "LIVE",
            }
            route.fulfill(
                status=200, content_type="application/json", body=json.dumps(payload)
            )
        elif parsed.path.endswith("/imd/warnings"):
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(
                    {
                        "status": "UNAVAILABLE",
                        "provider": "IMD RSS",
                        "count": 0,
                        "items": [],
                        "note": "Provider unreachable in this test.",
                    }
                ),
            )
        elif parsed.path.endswith("/locations/search"):
            route.fulfill(status=200, content_type="application/json", body="[]")
        else:
            route.fulfill(
                status=503,
                content_type="application/json",
                body=json.dumps(
                    {"detail": "Weather provider is temporarily unavailable."}
                ),
            )

    page.route("**/api/**", mock_api)
    page.route(
        "**/tile.openstreetmap.org/**",
        lambda route: route.fulfill(status=200, content_type="image/png", body=PNG_1PX),
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on(
        "console",
        lambda msg: (
            errors.append(msg.text)
            if msg.type == "error" and is_relevant_console_error(msg.text)
            else None
        ),
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script(
        "localStorage.setItem('weathergpt.savedPlaces', JSON.stringify(['New Delhi']));"
        "Object.defineProperty(navigator, 'geolocation', {configurable: true, value: undefined});"
    )
    install_routes(page)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_function(
        "() => document.querySelector('.wg-ref-location-text b')?.textContent.includes('New Delhi')",
        timeout=15000,
    )
    header = page.locator(".wg-ref-location-text b").inner_text()
    assert header == SELECTED, header
    assert "not selected" not in page.locator(".wg-ref-location-text").inner_text()
    assert SELECTED in page.get_by_role(
        "button", name="Change location."
    ).get_attribute("aria-label")

    for route, label in [
        ("#/severe-alerts", "Alerts and safety"),
        ("#/floodwatch", "FloodWatch flood monitoring"),
        ("#/disaster-preparedness", "Disaster preparedness center"),
    ]:
        page.goto(URL + route, wait_until="domcontentloaded")
        page.wait_for_selector(f"section[aria-label='{label}']", timeout=20000)
        page.wait_for_function(
            "() => [...document.querySelectorAll('.wg-safety-status-item')]"
            ".some((node) => node.textContent.includes('New Delhi'))",
            timeout=20000,
        )
        status = (
            page.locator(".wg-safety-status-item")
            .filter(has_text="Location")
            .first.inner_text()
        )
        assert SELECTED in status and "not selected" not in status, (route, status)

    assert page.get_by_role("heading", name="Prepare before the warning.").count() == 1
    page.locator("header.wg-ref-header .wg-ref-location").click()
    page.wait_for_selector(".wg-location-picker")
    assert SELECTED in page.locator(".wg-location-selected").inner_text()
    assert page.get_by_role("button", name="Use live location").count() == 1
    page.get_by_role("button", name="Use live location").click()
    page.wait_for_selector(".wg-location-picker", state="detached")
    assert "Geolocation is not available" in page.locator(".wg-ref-notice").inner_text()
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
    assert not errors, errors
    print(
        json.dumps(
            {
                "saved_location": SELECTED,
                "header": "PASS",
                "aria_label": "PASS",
                "safety_routes": "PASS",
                "provider_unavailable": "PASS",
                "console_errors": errors,
            }
        )
    )

    # GPS must survive a reverse-geocoder outage: keep the detected point,
    # label it honestly with coordinates, and still load weather for it.
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        geolocation={"latitude": 28.6139, "longitude": 77.209},
        permissions=["geolocation"],
    )
    gps = context.new_page()
    gps_errors = []
    gps.on(
        "console",
        lambda msg: (
            gps_errors.append(msg.text)
            if msg.type == "error" and is_relevant_console_error(msg.text)
            else None
        ),
    )
    gps.on("pageerror", lambda error: gps_errors.append(str(error)))
    gps.add_init_script("localStorage.removeItem('weathergpt.savedPlaces');")
    install_routes(gps, weather_ok=True)
    gps.goto(URL, wait_until="domcontentloaded")
    gps.wait_for_function(
        "() => document.querySelector('.wg-ref-location-text b')?.textContent.includes('28.61')",
        timeout=20000,
    )
    gps.wait_for_function(
        "() => JSON.parse(localStorage.getItem('weathergpt.savedPlaces') || '[]')"
        ".some((place) => place.includes('28.61'))",
        timeout=20000,
    )
    assert (
        "Location lookup failed"
        not in gps.locator(".wg-ref-location-text").inner_text()
    )
    assert gps.locator(".wg-ref-notice").count() == 0
    gps.locator("header.wg-ref-header .wg-ref-location").click()
    gps.wait_for_selector(".wg-location-picker")
    assert "28.61" in gps.locator(".wg-location-selected").inner_text()
    assert gps.get_by_role("button", name="Use live location").count() == 1
    gps.get_by_role("button", name="Close location search").click()
    assert not gps_errors, gps_errors
    print(
        json.dumps(
            {
                "gps_reverse_geocode": "UNAVAILABLE",
                "gps_coordinate_fallback": "PASS",
                "gps_weather_loaded": "PASS",
                "console_errors": gps_errors,
            }
        )
    )
    context.close()
    browser.close()
