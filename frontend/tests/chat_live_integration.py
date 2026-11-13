"""Live integration: assistant evidence, official warnings, risk and fail-closed.

Uses the real FastAPI backend and live providers (no chat mocks). Requires the
production preview on 4173 and backend on 8000:

    python frontend/tests/chat_live_integration.py
"""

import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")
VIEWPORTS = [("1440x900", 1440, 900), ("768x1024", 768, 1024), ("390x844", 390, 844)]


def check(condition, label, failures):
    if condition:
        print(f"  PASS {label}")
    else:
        print(f"  FAIL {label}")
        failures.append(label)


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
    before = page.locator('[data-testid="assistant-message"]').count()
    box = page.locator('textarea[aria-label="Type your weather question"]')
    box.fill(text)
    box.press("Enter")
    page.wait_for_function(
        "(n) => document.querySelectorAll('[data-testid=\"assistant-message\"]').length > n",
        arg=before,
        timeout=45000,
    )
    page.wait_for_timeout(350)
    return page.locator('[data-testid="assistant-message"]').last


def run(pw, label, width, height):
    failures = []
    tag = f"[{label}]"
    kwargs = {"headless": True}
    if CHROME_PATH:
        kwargs["executable_path"] = CHROME_PATH
    try:
        browser = pw.chromium.launch(**kwargs)
    except Exception as exc:
        print(
            f"SKIP {tag} launcher unavailable: {str(exc).encode('ascii', 'replace').decode('ascii')[:120]}"
        )
        return None
    page = browser.new_page(viewport={"width": width, "height": height})
    page.set_default_timeout(45000)
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))
    try:
        open_chat(page, width)

        reply = send(page, "hello")
        check(
            "Namaste" in reply.inner_text() or "WeatherGPT" in reply.inner_text(),
            f"{tag} greeting returns a reply",
            failures,
        )
        check(
            reply.locator('[aria-label^="Current weather for"]').count() == 0,
            f"{tag} greeting has no weather card",
            failures,
        )
        check(
            reply.locator('[data-testid="chat-provenance"]').count() == 0,
            f"{tag} greeting has no evidence block",
            failures,
        )

        reply = send(page, "What is the weather in Vijayawada?")
        check(
            reply.locator('[aria-label^="Current weather for"]').count() == 1,
            f"{tag} weather answer has a structured card",
            failures,
        )
        evidence = reply.locator('[data-testid="chat-provenance"]')
        check(evidence.count() == 1, f"{tag} weather answer has evidence", failures)
        card_before_evidence = reply.evaluate(
            """(el) => {
              const card = el.querySelector('[data-testid="weather-card"]');
              const evidence = el.querySelector('[data-testid="chat-provenance"]');
              if (!card || !evidence) return false;
              return Boolean(
                card.compareDocumentPosition(evidence) & Node.DOCUMENT_POSITION_FOLLOWING
              );
            }"""
        )
        check(
            card_before_evidence,
            f"{tag} weather metrics render before evidence",
            failures,
        )
        prompts_text = page.locator('[data-testid="contextual-prompts"]').inner_text()
        check(
            "Vijayawada" in prompts_text,
            f"{tag} contextual prompts follow the active location",
            failures,
        )
        if evidence.count():
            evidence.locator("summary").first.click()
            text = evidence.inner_text()
            check("SOURCE:" in text, f"{tag} evidence names a source", failures)
            check(
                "FRESHNESS:" in text
                and "UNKNOWN" not in text.split("FRESHNESS:")[1][:20],
                f"{tag} evidence reports freshness",
                failures,
            )

        reply = send(page, "What is the official warning for Vijayawada?")
        official = reply.locator('[data-testid="official-alerts"]')
        check(
            official.count() == 1, f"{tag} official warning block is separate", failures
        )
        if official.count():
            official_text = official.inner_text()
            check(
                "OFFICIAL" in official_text and "IMD" in official_text,
                f"{tag} official block names IMD",
                failures,
            )
            check(
                "NO MATCH" in official_text
                or "UNAVAILABLE" in official_text
                or official.locator("a").count() > 0,
                f"{tag} official block states match/unavailable with link",
                failures,
            )

        reply = send(page, "Compare Vijayawada and Hyderabad")
        risk = reply.locator('[data-testid="chat-risk-breakdown"]')
        check(risk.count() == 1, f"{tag} comparison shows computed risk", failures)
        if risk.count():
            risk_text = risk.inner_text()
            check(
                "Vijayawada" in risk_text and "Hyderabad" in risk_text,
                f"{tag} risk names both cities",
                failures,
            )
            check("/100" in risk_text, f"{tag} risk shows scores", failures)
            check(
                "not a road-safety rating" in risk_text,
                f"{tag} risk states its limitation",
                failures,
            )

        reply = send(page, "What is the weather in Atlantis-Nowhere-12345?")
        reply_text = reply.inner_text()
        check(
            "could not" in reply_text.lower() or "unresolved" in reply_text.lower(),
            f"{tag} unknown place fails closed",
            failures,
        )
        check(
            reply.locator('[aria-label^="Current weather for"]').count() == 0,
            f"{tag} unknown place gets no substituted weather card",
            failures,
        )

        clipped = page.evaluate(
            """() => {
              const bad = [];
              document.querySelectorAll('[data-testid="message-body"]').forEach((el) => {
                if (el.scrollHeight > el.clientHeight + 2) bad.push(el.innerText.slice(0, 60));
              });
              return bad;
            }"""
        )
        check(not clipped, f"{tag} no clipped message body {clipped[:2]}", failures)
        overflow = page.evaluate(
            "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        check(
            overflow <= 1, f"{tag} no horizontal page overflow ({overflow}px)", failures
        )
        check(not page_errors, f"{tag} no page errors {page_errors[:1]}", failures)
    except Exception as exc:
        check(False, f"{tag} unexpected error: {str(exc)[:180]}", failures)
    finally:
        browser.close()
    return failures


def main():
    from playwright.sync_api import sync_playwright

    all_failures, ran = [], 0
    with sync_playwright() as pw:
        for label, width, height in VIEWPORTS:
            result = run(pw, label, width, height)
            if result is None:
                continue
            ran += 1
            all_failures.extend(result)
    print(f"\nSuites run: {ran}, failures: {len(all_failures)}")
    for failure in all_failures:
        print("FAILURE:", failure[:300])
    if not ran:
        print("BLOCKED: no browsers available")
        sys.exit(2)
    sys.exit(1 if all_failures else 0)


if __name__ == "__main__":
    main()
