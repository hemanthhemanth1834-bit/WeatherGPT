"""Regression: assistant conversation lifecycle (Increment 2).

Covers truthful engine chips, Enter/Shift+Enter, copy, regenerate, new chat,
session restore, jump-to-latest and real stop cancellation. All chat responses
are mocked; no live provider is called.

Run after ``npm run build`` + backend on :8000 + preview on :4173::

    python frontend/tests/chat_lifecycle.py

Env overrides: WG_UI_URL, WG_BROWSERS (csv), WG_CHROME_PATH.
"""

import json
import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
BROWSERS = [
    b.strip() for b in os.getenv("WG_BROWSERS", "chromium").split(",") if b.strip()
]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")
PROBE = "lifecycle-probe-4c81"
VIEWPORTS = [("1440x900", 1440, 900), ("768x1024", 768, 1024), ("390x844", 390, 844)]

FIXTURE = {
    "query": "mock",
    "detected_language": "en",
    "persona": "general",
    "speech_text": f"Fixture {PROBE}.",
    "markdown_response": f"### Mocked answer\n\nDeterministic fixture {PROBE}.\n\n- Rain chance **0%**",
    "structured_weather": None,
    "alerts": [],
    "quick_suggestions": [],
    "suggested_actions": [],
}


def check(cond, label, failures):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        failures.append(label)


def mock_ok(page):
    page.route(
        "**/api/chat/query",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(FIXTURE),
            headers={"access-control-allow-origin": "*"},
        ),
    )


def open_chat(page, width):
    page.goto(UI_URL, wait_until="load", timeout=60000)
    page.wait_for_timeout(1500)
    menu_label = "Open menu" if width < 700 else "Open navigation"
    page.get_by_role("button", name=menu_label).first.click(timeout=15000)
    page.wait_for_timeout(500)
    page.get_by_role("button", name="AI Weather Assistant").first.evaluate(
        "(el) => el.click()"
    )
    page.locator('textarea[aria-label="Type your weather question"]').wait_for(
        state="visible", timeout=15000
    )
    page.wait_for_timeout(600)
    # The start-up engine call is app-level; wait for it to settle.
    page.get_by_test_id("engine-status").wait_for(timeout=15000)


def run(pw, name, vp_label, width, height):
    failures = []
    tag = f"[{name} {vp_label}]"
    try:
        launcher = getattr(pw, name)
        kwargs = {"headless": True}
        if CHROME_PATH and name == "chromium":
            kwargs["executable_path"] = CHROME_PATH
        browser = launcher.launch(**kwargs)
    except Exception as exc:
        print(f"SKIP {tag} launcher unavailable: {str(exc)[:120]}")
        return ["launcher"]
    context = browser.new_context(viewport={"width": width, "height": height})
    try:
        context.grant_permissions(
            ["clipboard-read", "clipboard-write"], origin=UI_URL.rstrip("/")
        )
    except Exception:
        pass
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: errors.append(m.text) if m.type == "error" else None,
    )
    try:
        open_chat(page, width)
        box = page.locator('textarea[aria-label="Type your weather question"]')
        send = page.locator('button[aria-label="Send question"]')
        stop = page.locator('button[aria-label="Stop generating"]')

        # 1. Truthful status chips.
        chips = (page.get_by_test_id("engine-status").inner_text() or "").upper()
        check(
            "DETERMINISTIC TOOL-GROUNDED" in chips,
            f"{tag} engine chip truthful",
            failures,
        )
        check("LLM CONFIGURED:" in chips, f"{tag} configured chip present", failures)
        check("SELECTED:" in chips, f"{tag} selected chip present", failures)
        check("HEALTH:" in chips, f"{tag} health chip present", failures)
        check(
            "FALLBACK: DETERMINISTIC TOOLS" in chips,
            f"{tag} deterministic fallback chip present",
            failures,
        )

        # 2. Empty state disables Send.
        check(send.is_disabled(), f"{tag} send disabled when empty", failures)

        # 3. Shift+Enter adds a newline without sending; the composer grows.
        box.fill("first line")
        single_height = box.bounding_box()["height"]
        box.press("Shift+Enter")
        box.type("second line")
        box.press("Shift+Enter")
        box.type("third line")
        multi_height = box.bounding_box()["height"]
        check(
            multi_height > single_height + 4,
            f"{tag} composer auto-resizes ({single_height:.0f}->{multi_height:.0f}px)",
            failures,
        )
        value = box.input_value()
        check(
            "\n" in value and "second line" in value,
            f"{tag} shift+enter adds newline",
            failures,
        )
        check(
            page.get_by_test_id("user-message").count() == 0,
            f"{tag} shift+enter does not send",
            failures,
        )
        box.fill("")

        # 4. Enter sends and renders the reply.
        mock_ok(page)
        box.fill("Enter key question")
        box.press("Enter")
        page.wait_for_function(
            f"""() => [...document.querySelectorAll('[data-testid="assistant-message"]')]
                 .some(a => (a.innerText||'').includes('{PROBE}'))""",
            timeout=20000,
        )
        check(
            page.get_by_test_id("user-message").count() == 1,
            f"{tag} enter key sends exactly one message",
            failures,
        )
        check(
            page.get_by_test_id("assistant-message").count() == 2,
            f"{tag} reply appended after welcome",
            failures,
        )

        # 5. Copy individual reply.
        last = page.get_by_test_id("assistant-message").last
        last.get_by_role("button", name="Copy this reply").click(timeout=8000)
        clip = page.evaluate("() => navigator.clipboard.readText()")
        check(PROBE in clip, f"{tag} copy places reply on clipboard", failures)

        # 6. Regenerate replaces the previous answer.
        page.get_by_role("button", name="Regenerate").click(timeout=8000)
        page.wait_for_function(
            f"""() => [...document.querySelectorAll('[data-testid="assistant-message"]')]
                 .some(a => (a.innerText||'').includes('{PROBE}'))""",
            timeout=20000,
        )
        page.wait_for_timeout(600)
        check(
            page.get_by_test_id("user-message").count() == 1,
            f"{tag} regenerate keeps one user turn",
            failures,
        )
        check(
            page.get_by_test_id("assistant-message").count() == 2,
            f"{tag} regenerate replaces instead of duplicating",
            failures,
        )

        # 7. New chat resets to the welcome message.
        page.get_by_role("button", name="New chat").click(timeout=8000)
        check(
            page.get_by_test_id("user-message").count() == 0
            and page.get_by_test_id("assistant-message").count() == 1,
            f"{tag} new chat resets transcript",
            failures,
        )

        # 8. Session restore after reload.
        box.fill("persisted question")
        box.press("Enter")
        page.wait_for_function(
            """() => document.querySelectorAll('[data-testid="assistant-message"]').length === 2""",
            timeout=20000,
        )
        page.wait_for_timeout(500)
        page.reload(wait_until="load", timeout=60000)
        box.wait_for(state="visible", timeout=20000)
        page.wait_for_timeout(1000)
        restored_users = page.get_by_test_id("user-message").count()
        restored_bots = page.get_by_test_id("assistant-message").count()
        check(
            restored_users == 1 and restored_bots == 2,
            f"{tag} session restores conversation ({restored_users}u/{restored_bots}b)",
            failures,
        )

        # 9. Overflow, scroll-up, jump-to-latest.
        for i in range(4):
            box.fill(f"overflow question {i}")
            box.press("Enter")
            page.wait_for_timeout(700)
        page.evaluate(
            "() => { const l = document.querySelector('.wg-ai-message-list'); l.scrollTop = 0; l.dispatchEvent(new Event('scroll')); }"
        )
        page.wait_for_timeout(400)
        jump = page.get_by_role("button", name="Jump to latest")
        check(jump.is_visible(), f"{tag} jump button appears after scroll up", failures)
        jump.click()
        try:
            page.wait_for_function(
                """() => { const l = document.querySelector('.wg-ai-message-list');
                     return l.scrollHeight - l.scrollTop - l.clientHeight < 8; }""",
                timeout=6000,
            )
            at_bottom = True
        except Exception:
            at_bottom = False
        check(at_bottom, f"{tag} jump-to-latest returns to newest", failures)

        # 10. Stop cancels a pending request without an error bubble.
        page.unroute("**/api/chat/query")
        pending = {}

        def hold(route):
            pending["route"] = route

        page.route("**/api/chat/query", hold)  # leave pending
        box.fill("stop me now")
        box.press("Enter")
        stop.wait_for(state="visible", timeout=10000)
        page.wait_for_timeout(500)
        stop.click()
        page.wait_for_timeout(1200)
        if pending.get("route") is not None:
            try:
                pending["route"].abort()
            except Exception:
                pass
        page.unroute("**/api/chat/query")
        check(
            page.get_by_role("button", name="Send question").is_visible(),
            f"{tag} stop restores send control",
            failures,
        )
        check(
            page.get_by_text("Generation stopped", exact=False).count() > 0,
            f"{tag} stop shows stopped state",
            failures,
        )
        check(
            page.get_by_text("could not reach the weather engine", exact=False).count()
            == 0,
            f"{tag} stop does not render an error bubble",
            failures,
        )
        check(
            page.get_by_role("button", name="Stop generating").count() == 0,
            f"{tag} stop clears busy indicator",
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
        for name in BROWSERS:
            for label, width, height in VIEWPORTS:
                all_failures.extend(run(pw, name, label, width, height))
    print(
        f"\nSuites run: {len(BROWSERS) * len(VIEWPORTS)}, failures: {len(all_failures)}"
    )
    if all_failures:
        for f in all_failures:
            print("FAILURE:", f)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
