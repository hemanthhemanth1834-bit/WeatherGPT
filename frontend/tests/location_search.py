"""Browser regression for the manual location picker (desktop + mobile).

The frontend API is mocked so this test is deterministic and can run against
Vite preview without a live backend. Set WG_UI_URL to override the local URL.
"""
import json
import os
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
WEATHER = {
    "location": "Rajahmundry",
    "state": "Andhra Pradesh",
    "country": "India",
    "lat": 17.00517,
    "lon": 81.77784,
    "current_temp": 26.7,
    "feels_like": 32.2,
    "condition": "Partly Cloudy",
    "humidity": 90,
    "wind_speed": 7.9,
    "wind_direction": "ENE",
    "precipitation": 0.0,
    "cloud_cover": 53,
    "pressure": 1008.7,
    "uv_index": 2.7,
    "visibility": 9.1,
    "aqi": 52,
    "aqi_status": "Moderate",
    "sunrise": "05:56",
    "sunset": "17:39",
    "hourly": [
        {
            "time": "20:00",
            "temp": 26.7,
            "rain_prob": 21,
            "condition": "Partly Cloudy",
            "wind_speed": 7.9,
            "humidity": 90,
        }
    ],
    "daily": [],
    "data_source": "Open-Meteo",
    "status": "LIVE",
    "updated_at_ist": "18 Oct 2026, 20:00 IST",
}


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        results = []
        for width, height in ((1440, 900), (390, 844)):
            context = browser.new_context(viewport={"width": width, "height": height})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on(
                "console",
                lambda message: errors.append(message.text)
                if message.type == "error"
                else None,
            )

            def route_api(route):
                parsed = urlparse(route.request.url)
                query = parse_qs(parsed.query)
                if parsed.path.endswith("/locations/search"):
                    term = query.get("q", [""])[0].lower()
                    matches = (
                        [
                            {
                                "name": "Rajahmundry",
                                "display_name": "Rajahmundry, East Godavari, Andhra Pradesh",
                                "lat": 17.00517,
                                "lon": 81.77784,
                                "state": "Andhra Pradesh",
                                "region": "East Godavari",
                            }
                        ]
                        if "rajahmundry" in term
                        else []
                    )
                    route.fulfill(status=200, content_type="application/json", body=json.dumps(matches))
                elif parsed.path.endswith("/weather/current"):
                    weather = dict(WEATHER)
                    weather["location"] = query.get("location", ["Rajahmundry"])[0]
                    route.fulfill(status=200, content_type="application/json", body=json.dumps(weather))
                elif parsed.path.endswith("/alerts/active"):
                    route.fulfill(status=200, content_type="application/json", body="[]")
                else:
                    route.fulfill(status=200, content_type="application/json", body="{}")

            page.route("**/api/**", route_api)
            response = page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            assert response and response.status == 200, f"page did not load at {width}px"

            trigger = (
                page.locator(".wg-ref-mobile-location")
                if width <= 820
                else page.locator("button.wg-ref-location")
            )
            trigger.click(timeout=5000)
            page.get_by_role("dialog", name="Choose your location").wait_for(timeout=3000)

            search = page.get_by_role("searchbox", name="City, town, or district")
            search.fill("qzxqzxqzx")
            page.get_by_text("No matching places found.", exact=False).wait_for(timeout=10000)
            search.fill("Rajahmundry")
            result = page.get_by_role(
                "option", name="Rajahmundry Rajahmundry, East Godavari, Andhra Pradesh"
            )
            result.wait_for(timeout=10000)
            result.click(timeout=5000)

            page.wait_for_function(
                "document.querySelector('.wg-ref-hero-location')?.innerText.includes('Rajahmundry')",
                timeout=15000,
            )
            hero = page.locator(".wg-ref-hero-location").inner_text()
            assert "Rajahmundry" in hero and "Andhra Pradesh" in hero, hero
            assert "26.7" in page.locator("main").inner_text(), "weather values did not render"
            assert page.get_by_role("dialog").count() == 0, "picker did not close after selection"

            trigger.click(timeout=5000)
            page.get_by_role("dialog", name="Choose your location").wait_for(timeout=3000)
            page.keyboard.press("Escape")
            assert page.get_by_role("dialog").count() == 0, "Escape did not close picker"
            assert not page.evaluate("document.documentElement.scrollWidth > window.innerWidth"), (
                f"horizontal overflow at {width}px"
            )
            assert not errors, f"browser errors at {width}px: {errors}"
            results.append(
                {
                    "viewport": f"{width}x{height}",
                    "page_load": "PASS",
                    "empty_results": "PASS",
                    "manual_search_and_weather_update": "PASS",
                    "escape_close": "PASS",
                    "no_horizontal_overflow": "PASS",
                    "console_errors": errors,
                }
            )
            context.close()
        browser.close()
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
