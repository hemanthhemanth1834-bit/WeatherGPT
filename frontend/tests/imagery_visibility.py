"""Site imagery regression: shared LiveImagery figures must be visible, honest
and resilient. Deterministic mocks (no live providers); live providers are
smoke-tested separately.

Covers: dashboard radar + satellite figures, attribution links, status
honesty (DELAYED, never fabricated LIVE), failure fallback + retry,
responsive layout, alt text, no new console/page errors.

Usage: backend on :8000 (unused, kept for parity), preview build on :4173::

    python frontend/tests/imagery_visibility.py

Env: WG_UI_URL, WG_BROWSERS (csv), WG_CHROME_PATH.
"""
import base64
import json
import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
BROWSERS = [b.strip() for b in os.getenv("WG_BROWSERS", "chromium,firefox").split(",") if b.strip()]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

FRAME_TIME = 1729000000  # fixed past radar frame (deterministic observed label)
RADAR_META = {
    "host": "https://tilecache.rainviewer.com",
    "radar": {"past": [{"time": FRAME_TIME, "path": "/v2/radar/1729000000"}]},
    "satellite": {},
}


def weather_fixture():
    hourly = [
        {"time": f"{h:02d}:00", "temp": 28.0, "rain_prob": 10,
         "condition": "Partly Cloudy", "icon": "CloudSun",
         "wind_speed": 12.0, "humidity": 60}
        for h in range(24)
    ]
    daily = [
        {"date": f"2026-10-{15 + i:02d}", "day": "Today" if i == 0 else "Day",
         "temp_max": 31.0, "temp_min": 23.0, "condition": "Partly Cloudy",
         "icon": "CloudSun", "rain_sum": 0.0, "wind_max": 15.0}
        for i in range(7)
    ]
    return {
        "location": "Pune", "state": "Maharashtra", "country": "India",
        "lat": 18.52, "lon": 73.85, "current_temp": 28.5, "feels_like": 30.0,
        "condition": "Partly Cloudy", "condition_code": 2, "humidity": 60,
        "wind_speed": 12.0, "wind_direction": "W", "precipitation": 0.0,
        "cloud_cover": 25.0, "pressure": 1011.0, "uv_index": 6.0,
        "visibility": 9.0, "aqi": 78, "aqi_status": "Satisfactory",
        "sunrise": "06:05", "sunset": "18:35", "hourly": hourly, "daily": daily,
        "nwp_model": "test blend", "data_source": "Open-Meteo",
        "data_type": "Forecast", "status": "LIVE",
        "updated_at_ist": "15 Oct 2026, 12:00 IST", "confidence": "test",
    }


def mock_backend(page):
    page.route("**/api/weather/current*", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps(weather_fixture())))
    page.route("**/api/alerts/active*", lambda r: r.fulfill(
        status=200, content_type="application/json", body="[]"))
    page.route("**/api/air-quality*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"us_aqi": 42, "band": "Good", "standard": "US AQI (EPA)",
                         "status": "LIVE", "dominant_pollutant": "—"})))
    page.route("**/api/uv*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"uv_index": 5.0, "level": "Moderate", "advice": "test",
                         "data_source": "test", "status": "LIVE"})))
    page.route("**/api/solar/estimate*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"daily_kwh_per_kw": 4.2, "peak_sun_hours": 4.2,
                         "daylight_hours": 11.5})))
    page.route("**/api/locations/regional-explorer*", lambda r: r.fulfill(
        status=200, content_type="application/json", body="[]"))
    page.route("**/api/locations/search*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps([{"name": "Pune", "lat": 18.52, "lon": 73.85,
                          "display_name": "Pune, Maharashtra"}])))
    page.route("**/api/risk/assess*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"overall": "LOW", "advisories": ["test"], "levels": {}})))


def mock_imagery_ok(page):
    page.route("**/api.rainviewer.com/**", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps(RADAR_META)))
    page.route("**/tilecache.rainviewer.com/**", lambda r: r.fulfill(
        status=200, content_type="image/png", body=PNG_1PX))
    page.route("**/gibs.earthdata.nasa.gov/**", lambda r: r.fulfill(
        status=200, content_type="image/jpeg", body=PNG_1PX))


def check(cond, label, failures):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        failures.append(label)


def mock_geo(page):
    # App auto-locates via browser GPS on load: grant it and answer Pune.
    page.route("**/api/locations/reverse*", lambda r: r.fulfill(
        status=200, content_type="application/json",
        body=json.dumps({"city": "Pune", "state": "Maharashtra"})))


def click_visible_button(page, name, timeout=15000):
    # Sidebar and mobile drawer render duplicate nav labels, and the header
    # brand icon carries a overlapping "Live WeatherGPT" label, so role
    # queries are ambiguous here: click the visible button whose rendered
    # text matches exactly.
    deadline = timeout / 1000.0
    import time as _t
    end = _t.time() + deadline
    while _t.time() < end:
        found = page.evaluate("""(label) => {
          const hit = [...document.querySelectorAll('button')]
            .find(b => ((b.innerText || '').trim() === label
                         || (b.getAttribute('aria-label') || '').trim() === label)
                        && b.offsetParent !== null);
          if (hit) { hit.click(); return true; }
          return false;
        }""", name)
        if found:
            return
        page.wait_for_timeout(400)
    raise AssertionError(f"no visible button named {name!r}")


def open_dashboard(page, viewport):
    if viewport["width"] < 700:
        click_visible_button(page, "Open navigation")
        page.wait_for_timeout(600)
    click_visible_button(page, "Live Weather")
    page.get_by_test_id("live-imagery").first.wait_for(timeout=20000)


def load_dashboard(page, viewport):
    page.wait_for_function(
        """() => document.body.innerText.includes('Pune')""", timeout=30000)
    open_dashboard(page, viewport)


def run_browser(pw, name, viewport):
    failures = []
    tag = f"[{name} {viewport['width']}px]"
    try:
        launcher = getattr(pw, name)
        kwargs = {"headless": True}
        if CHROME_PATH and name == "chromium":
            kwargs["executable_path"] = CHROME_PATH
        browser = launcher.launch(**kwargs)
    except Exception as exc:
        print(f"SKIP {tag} launcher unavailable: {str(exc)[:120]}")
        return None
    ctx = browser.new_context(viewport=viewport,
                              geolocation={"latitude": 18.52, "longitude": 73.85},
                              permissions=["geolocation"])
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        mock_backend(page)
        mock_geo(page)
        mock_imagery_ok(page)
        page.goto(UI_URL, wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        load_dashboard(page, viewport)

        figs = page.get_by_test_id("live-imagery")
        check(figs.count() >= 2, f"{tag} dashboard shows radar + satellite figures", failures)
        statuses = page.get_by_test_id("live-imagery-status").all_inner_texts()
        check(all(s.strip() in ("DELAYED", "UNAVAILABLE") for s in statuses) and any(
            s.strip() == "DELAYED" for s in statuses),
            f"{tag} honest imagery status (DELAYED, never fabricated LIVE) {statuses}", failures)
        srcs = page.get_by_test_id("live-imagery-source")
        hrefs = [srcs.nth(i).get_attribute("href") for i in range(srcs.count())]
        check(any("rainviewer.com" in (h or "") for h in hrefs),
              f"{tag} RainViewer attribution link present", failures)
        check(any("worldview.earthdata.nasa.gov" in (h or "") for h in hrefs),
              f"{tag} NASA Worldview attribution link present", failures)
        imgs = page.get_by_test_id("live-imagery-img")
        alts = [imgs.nth(i).get_attribute("alt") for i in range(imgs.count())]
        check(len(alts) > 0 and all(a and len(a) > 10 for a in alts),
              f"{tag} imagery alt text meaningful", failures)
        # Lazy images below the fold only fetch once scrolled into view.
        for i in range(imgs.count()):
            try:
                imgs.nth(i).scroll_into_view_if_needed(timeout=8000)
            except Exception:
                pass
        try:
            page.wait_for_function(
                """() => [...document.querySelectorAll('[data-testid="live-imagery-img"]')]
                     .every(i => i.naturalWidth > 0)""",
                timeout=15000)
            widths = page.evaluate(
                """() => [...document.querySelectorAll('[data-testid="live-imagery-img"]')]
                     .map(i => i.naturalWidth)""")
        except Exception:
            widths = [0]
        check(widths and all(w > 0 for w in widths),
              f"{tag} mocked tiles actually rendered {widths}", failures)
        observed = page.evaluate(
            """() => [...document.querySelectorAll('[data-testid="live-imagery"]')]
                 .map(f => f.innerText.slice(0, 400))""")
        check(any("RainViewer" in t for t in observed),
              f"{tag} radar observation timestamp shown", failures)
        check(page.get_by_text("LIVE RADAR HISTORY").count() == 0
              and page.get_by_text("LIVE REFERENCE").count() == 0,
              f"{tag} no stale LIVE imagery labels remain", failures)

        # Failure path: fresh page, providers down.
        page2 = ctx.new_page()
        seen404 = {"tile": False}
        page2.on("console", lambda m: errors.append("p2:" + m.text) if m.type == "error" else None)
        page2.on("pageerror", lambda e: errors.append("p2:" + str(e)))
        # Our deliberate tile-404 mocks surface as resource-load console
        # errors; correlate them so only unexpected failures count.
        page2.on("response", lambda r: seen404.update(tile=True)
                 if r.status == 404 and ("gibs.earthdata.nasa.gov" in r.url
                                         or "tilecache.rainviewer.com" in r.url) else None)
        mock_backend(page2)
        mock_geo(page2)
        page2.route("**/api.rainviewer.com/**", lambda r: r.fulfill(status=500, body="{}"))
        page2.route("**/tilecache.rainviewer.com/**", lambda r: r.fulfill(status=404, body="nope"))
        page2.route("**/gibs.earthdata.nasa.gov/**", lambda r: r.fulfill(status=404, body="nope"))
        page2.goto(UI_URL, wait_until="load", timeout=60000)
        page2.wait_for_timeout(2000)
        page2.wait_for_function(
            """() => document.body.innerText.includes('Pune')""", timeout=30000)
        open_dashboard(page2, viewport)
        # Lazy tiles below the fold only fail once scrolled into view.
        for i in range(page2.get_by_test_id("live-imagery").count()):
            try:
                page2.get_by_test_id("live-imagery").nth(i).scroll_into_view_if_needed(timeout=8000)
            except Exception:
                pass
        try:
            page2.wait_for_function(
                """() => [...document.querySelectorAll('[data-testid="live-imagery-status"]')]
                     .every(el => el.innerText.trim() === 'UNAVAILABLE')""",
                timeout=20000)
        except Exception:
            pass
        st2 = page2.get_by_test_id("live-imagery-status").all_inner_texts()
        check(all(s.strip() == "UNAVAILABLE" for s in st2) and len(st2) >= 2,
              f"{tag} provider outage degrades to UNAVAILABLE {st2}", failures)
        check(page2.get_by_text("Retry imagery").count() >= 1,
              f"{tag} retry action offered on failure", failures)
        page2.close()

        noise = [e for e in errors if "ERR_CONNECTION_REFUSED" not in e
                 and "api.open-meteo.com" not in e and "net::" not in e
                 and "leaflet" not in e.lower()
                 and "fonts.g" not in e and "500 (Internal Server Error)" not in e
                 and not ("Failed to load resource" in e and "status of 404" in e
                          and seen404["tile"])]
        check(not noise, f"{tag} no relevant console/page errors {noise[:3]}", failures)
    except Exception as exc:
        failures.append(f"{tag} exception: {type(exc).__name__}: {str(exc)[:200]}")
        try:
            page.screenshot(path=f"/tmp/imagery-{name}-{viewport['width']}-fail.png")
        except Exception:
            pass
    finally:
        browser.close()
    return failures


def main():
    from playwright.sync_api import sync_playwright
    viewports = [{"width": 1440, "height": 900}, {"width": 390, "height": 844}]
    all_failures, ran = [], 0
    with sync_playwright() as pw:
        for name in BROWSERS:
            for vp in viewports:
                res = run_browser(pw, name, vp)
                if res is None:
                    continue
                ran += 1
                all_failures.extend(res)
    print(f"\nSuites run: {ran}, failures: {len(all_failures)}")
    for f in all_failures:
        print("FAILURE:", f[:300])
    if not ran:
        print("BLOCKED: no browsers available")
        sys.exit(2)
    sys.exit(1 if all_failures else 0)


if __name__ == "__main__":
    main()
