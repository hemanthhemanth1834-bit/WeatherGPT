"""Manual location-picker regression test (GPS permission is not required)."""
import json
import os
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
WEATHER = {
    "location": "Rajahmundry", "state": "Andhra Pradesh", "country": "India",
    "lat": 17.00517, "lon": 81.77784, "current_temp": 26.7, "feels_like": 32.2,
    "condition": "Partly Cloudy", "humidity": 90, "wind_speed": 7.9,
    "wind_direction": "ENE", "precipitation": 0.0, "cloud_cover": 53,
    "pressure": 1008.7, "uv_index": 2.7, "visibility": 9.1, "aqi": 52,
    "aqi_status": "Moderate", "sunrise": "05:56", "sunset": "17:39",
    "hourly": [], "daily": [], "data_source": "Open-Meteo", "status": "LIVE",
    "updated_at_ist": "18 Oct 2026, 20:00 IST",
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width, height in [(1440, 900), (390, 844)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        def mock_api(route):
            parsed = urlparse(route.request.url)
            query = parse_qs(parsed.query)
            if parsed.path.endswith("/locations/search"):
                q = query.get("q", [""])[0].lower()
                results = [{"name": "Rajahmundry", "display_name": "Rajahmundry, East Godavari, Andhra Pradesh, India", "lat": 17.00517, "lon": 81.77784, "state": "Andhra Pradesh", "region": "East Godavari", "country": "India"}] if "rajahmundry" in q else []
                route.fulfill(status=200, content_type="application/json", body=json.dumps(results))
            elif parsed.path.endswith("/weather/current"):
                data = dict(WEATHER)
                data["location"] = query.get("location", ["Rajahmundry"])[0]
                route.fulfill(status=200, content_type="application/json", body=json.dumps(data))
            elif parsed.path.endswith("/alerts/active"):
                route.fulfill(status=200, content_type="application/json", body="[]")
            else:
                route.continue_()

        page.route("**/api/**", mock_api)
        response = page.goto(URL, wait_until="domcontentloaded")
        if width <= 820:
            page.get_by_role("button", name="Open navigation").click()
            page.get_by_role("button", name="Change location").click()
        else:
            page.locator(".wg-ref-location").click()
        dialog = page.get_by_role("dialog", name="Choose your location")
        assert dialog.count() == 1, "location picker dialog did not open"
        page.get_by_role("searchbox", name="City or area").fill("Rajahmundry")
        result = page.get_by_role("button", name="Rajahmundry Rajahmundry, East Godavari, Andhra Pradesh, India")
        result.wait_for(timeout=10000)
        result.click()
        page.wait_for_function("() => JSON.parse(localStorage.getItem('weathergpt.savedPlaces') || '[]').includes('Rajahmundry')", timeout=10000)
        assert page.get_by_role("dialog").count() == 0, "picker did not close after selection"
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth"), "horizontal overflow"
        assert not errors, f"browser errors: {errors}"
        print(json.dumps({"viewport": f"{width}x{height}", "http": response.status, "manual_search": "PASS", "weather_update": "PASS", "modal_close": "PASS", "horizontal_overflow": "PASS", "console_errors": errors}))
        page.close()
    browser.close()
