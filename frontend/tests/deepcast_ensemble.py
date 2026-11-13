"""Deep-Cast ensemble section: real backend, responsive, no page errors."""

import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/?open=1#/deep-cast")
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")
VIEWPORTS = [("1440x900", 1440, 900), ("768x1024", 768, 1024), ("390x844", 390, 844)]


def check(ok, label, failures):
    print(f"  {'PASS' if ok else 'FAIL'} [deep-cast] {label}")
    if not ok:
        failures.append(label)


def run(pw, label, width, height):
    failures = []
    tag = f"[{label}]"
    kwargs = {"headless": True}
    if CHROME_PATH:
        kwargs["executable_path"] = CHROME_PATH
    browser = pw.chromium.launch(**kwargs)
    context = browser.new_context(viewport={"width": width, "height": height})
    context.add_init_script(
        """
        try { localStorage.setItem('weathergpt.savedPlaces', JSON.stringify(['Vijayawada'])); } catch (e) {}
        try {
          navigator.geolocation.getCurrentPosition = (ok, fail) =>
            fail && fail({ code: 1, message: 'denied in test' });
        } catch (e) {}
        """
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: errors.append(m.text) if m.type == "error" else None,
    )
    try:
        page.goto(UI_URL, wait_until="load", timeout=60000)
        page.wait_for_timeout(1200)
        page.wait_for_function(
            "() => document.body.innerText.toLowerCase().includes('peak rain probability')",
            timeout=40000,
        )
        section = page.get_by_text("Ensemble Spread & Rain Probability")
        section.first.wait_for(timeout=30000)
        section.first.scroll_into_view_if_needed()
        page.wait_for_timeout(500)

        panel = section.first.locator("xpath=ancestor::section[1]")
        body = panel.inner_text()
        check("ENSEMBLE" in body.upper(), f"{tag} ensemble section rendered", failures)
        check("Open-Meteo Ensemble API" in body, f"{tag} source named", failures)
        check(
            "disagreement" in body.lower() or "not calibrated" in body.lower(),
            f"{tag} limitation stated",
            failures,
        )
        check(
            "122" in body and "members" in body.lower(),
            f"{tag} member count shown",
            failures,
        )
        table = panel.locator(".wg-dc-table")
        check(table.count() > 0, f"{tag} ensemble table rendered", failures)
        if table.count():
            check(
                table.first.locator("tbody tr").count() > 0,
                f"{tag} ensemble rows present",
                failures,
            )

        overflow = page.evaluate(
            "Math.max(0, document.documentElement.scrollWidth - window.innerWidth)"
        )
        check(overflow <= 1, f"{tag} no horizontal overflow ({overflow}px)", failures)
        relevant = [
            e for e in errors if "net::" not in e and "Failed to load resource" not in e
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
        for failure in all_failures:
            print("FAILURE:", failure)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
