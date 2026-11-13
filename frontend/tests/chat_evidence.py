"""Regression: assistant evidence, official warnings, risk and candidates.

All chat responses are mocked. Requires a production build and the local
preview server:

    python frontend/tests/chat_evidence.py
"""

import json
import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")
VIEWPORTS = [("1440x900", 1440, 900), ("390x844", 390, 844)]

WEATHER_SOURCE = {
    "name": "Open-Meteo",
    "url": "https://open-meteo.com/",
    "type": "PROVIDER",
}
OFFICIAL_SOURCE = {
    "name": "India Meteorological Department",
    "url": "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php",
    "type": "OFFICIAL",
}
OFFICIAL_FIXTURE = {
    "query": "official",
    "detected_language": "en",
    "persona": "general",
    "speech_text": "One official warning matched.",
    "markdown_response": "### Official IMD warnings - Vijayawada\n\nReproduced as published.",
    "structured_weather": None,
    "official_alerts": [
        {
            "title": "Heavy rainfall warning for Vijayawada",
            "description": "Heavy rainfall likely in Vijayawada, Andhra Pradesh.",
            "link": "https://mausam.imd.gov.in/example",
            "published": "02 Nov 2026 10:00 IST",
            "source": "India Meteorological Department",
            "source_type": "OFFICIAL",
            "official": True,
        }
    ],
    "official_alert_status": "MATCHED",
    "provenance": {
        "source": OFFICIAL_SOURCE,
        "sources": [OFFICIAL_SOURCE],
        "data_type": "OFFICIAL_WARNING",
        "freshness": "FRESH",
        "limitations": ["Official text is reproduced as published."],
    },
    "sources": [OFFICIAL_SOURCE],
    "data_type": "OFFICIAL_WARNING",
    "freshness": "FRESH",
    "limitations": ["Official text is reproduced as published."],
    "tool_trace": [
        {
            "tool": "get_official_warnings",
            "status": "OK",
            "source": "India Meteorological Department",
            "duration_ms": 42,
        }
    ],
    "suggested_actions": [],
}
RISK_FIXTURE = {
    "query": "compare",
    "detected_language": "en",
    "persona": "general",
    "speech_text": "Comparison with computed weather risk.",
    "markdown_response": "### Vijayawada vs Hyderabad\n\nComputed weather risk is shown separately.",
    "structured_weather": None,
    "risk_breakdown": {
        "travel": {
            "city1": {
                "location": "Vijayawada",
                "score": 40,
                "safety": "HIGH",
                "factors": [
                    {
                        "name": "Heavy rain",
                        "value": "98%",
                        "threshold": ">= 70%",
                        "deduction": -30,
                        "evidence": "Hourly rain probability",
                    }
                ],
                "limitations": ["Weather risk only; not road safety."],
            },
            "city2": {
                "location": "Hyderabad",
                "score": 100,
                "safety": "LOW",
                "factors": [],
                "limitations": ["Weather risk only; not road safety."],
            },
        }
    },
    "provenance": {
        "source": WEATHER_SOURCE,
        "sources": [WEATHER_SOURCE],
        "data_type": "MODEL_FORECAST",
        "freshness": "FRESH",
        "model": "Open-Meteo NWP blend",
        "retrieved_at": "2026-11-02T10:00:00+05:30",
        "limitations": ["Model forecast, not an observation."],
    },
    "sources": [WEATHER_SOURCE],
    "data_type": "MODEL_FORECAST",
    "freshness": "FRESH",
    "limitations": ["Model forecast, not an observation."],
    "tool_trace": [{"tool": "get_weather", "status": "OK", "duration_ms": 90}],
    "suggested_actions": [],
}
CANDIDATE_FIXTURE = {
    "query": "ambiguous",
    "detected_language": "en",
    "persona": "general",
    "speech_text": "Please choose a location.",
    "markdown_response": "### Choose a location\n\nMore than one place matched.",
    "structured_weather": None,
    "needs_location_confirmation": True,
    "location_candidates": [
        {
            "name": "Springfield",
            "state": "Illinois",
            "country": "United States",
            "lat": 39.8,
            "lon": -89.6,
            "confidence": 0.65,
            "source": "live",
        }
    ],
    "suggested_actions": [],
}
GENERIC_FIXTURE = {
    "query": "generic",
    "detected_language": "en",
    "persona": "general",
    "speech_text": "Fixture answer.",
    "markdown_response": "### Fixture answer\n\nDeterministic fixture.",
    "structured_weather": None,
    "suggested_actions": [],
}


def check(cond, label, failures):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        failures.append(label)


def mock_chat(page):
    def handler(route):
        try:
            body = json.loads(route.request.post_data or "{}")
        except Exception:
            body = {}
        query = str(body.get("query") or "").lower()
        if "official" in query or "imd" in query:
            fixture = OFFICIAL_FIXTURE
        elif "compare" in query:
            fixture = RISK_FIXTURE
        elif "ambiguous" in query or "springfield" in query:
            fixture = CANDIDATE_FIXTURE if "ambiguous" in query else GENERIC_FIXTURE
        else:
            fixture = GENERIC_FIXTURE
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(fixture),
            headers={"access-control-allow-origin": "*"},
        )

    page.route("**/api/chat/query", handler)


def open_chat(page, width):
    page.goto(UI_URL, wait_until="load", timeout=60000)
    page.wait_for_timeout(1200)
    menu_label = "Open menu" if width < 700 else "Open navigation"
    page.get_by_role("button", name=menu_label).first.click(timeout=15000)
    page.wait_for_timeout(400)
    page.get_by_role("button", name="AI Weather Assistant").first.evaluate(
        "(el) => el.click()"
    )
    page.locator('textarea[aria-label="Type your weather question"]').wait_for(
        state="visible", timeout=15000
    )
    page.wait_for_timeout(500)


def send(page, text):
    box = page.locator('textarea[aria-label="Type your weather question"]')
    box.fill(text)
    box.press("Enter")
    page.wait_for_timeout(500)


def run(pw, label, width, height):
    failures = []
    tag = f"[{label}]"
    kwargs = {"headless": True}
    if CHROME_PATH:
        kwargs["executable_path"] = CHROME_PATH
    try:
        browser = pw.chromium.launch(**kwargs)
    except Exception as exc:
        print(f"SKIP {tag} launcher unavailable: {str(exc)[:120]}")
        return ["launcher"]
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: errors.append(m.text) if m.type == "error" else None,
    )
    try:
        mock_chat(page)
        open_chat(page, width)

        send(page, "official warning")
        page.get_by_test_id("official-alerts").wait_for(timeout=10000)
        official = page.get_by_test_id("official-alerts").inner_text().upper()
        check(
            "OFFICIAL" in official and "IMD" in official,
            f"{tag} official section",
            failures,
        )
        check(
            "HEAVY RAINFALL WARNING" in official, f"{tag} official item title", failures
        )
        check(
            page.locator('[data-testid="official-alerts"] a').first.get_attribute(
                "href"
            )
            == "https://mausam.imd.gov.in/example",
            f"{tag} official link preserved",
            failures,
        )

        send(page, "compare Vijayawada and Hyderabad")
        risk = page.get_by_test_id("chat-risk-breakdown")
        risk.wait_for(timeout=10000)
        risk_text = risk.inner_text()
        check("VIJAYAWADA" in risk_text.upper(), f"{tag} risk city shown", failures)
        check("40/100" in risk_text, f"{tag} risk score shown", failures)
        check("HEAVY RAIN" in risk_text.upper(), f"{tag} factor shown", failures)
        check(
            "NOT A ROAD-SAFETY" in risk_text.upper()
            or "NOT A ROAD" in risk_text.upper(),
            f"{tag} risk limitation shown",
            failures,
        )

        send(page, "weather in ambiguous place")
        candidates = page.get_by_test_id("location-candidates")
        candidates.wait_for(timeout=10000)
        candidate_text = candidates.inner_text()
        check("Springfield" in candidate_text, f"{tag} candidate name shown", failures)
        page.get_by_role("button", name="Springfield, Illinois · United States").click(
            timeout=10000
        )
        page.wait_for_timeout(600)
        transcript = page.get_by_test_id("user-message").last.inner_text()
        check(
            "Springfield" in transcript,
            f"{tag} candidate click asks for place",
            failures,
        )

        relevant = [
            e
            for e in errors
            if "ERR_CONNECTION_REFUSED" not in e
            and "Failed to load resource" not in e
            and "net::" not in e
        ]
        check(not relevant, f"{tag} no page errors {relevant[:2]}", failures)
    except Exception as exc:
        failures.append(f"{tag} exception: {type(exc).__name__}: {str(exc)[:240]}")
    finally:
        context.close()
        browser.close()
    return failures


def main():
    from playwright.sync_api import sync_playwright

    all_failures = []
    with sync_playwright() as pw:
        for label, width, height in VIEWPORTS:
            all_failures.extend(run(pw, label, width, height))
    print(f"\nSuites run: {len(VIEWPORTS)}, failures: {len(all_failures)}")
    if all_failures:
        for f in all_failures:
            print("FAILURE:", f)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
