"""Browser regression for persisted theme, font-size, and language preferences.

Run against the built Vite preview on port 4173 after installing Playwright.
"""
import os
import sys
from playwright.sync_api import sync_playwright

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")


def main():
    failures = []
    def check(condition, message):
        if condition:
            print("PASS", message)
        else:
            failures.append(message)
            print("FAIL", message)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(UI_URL, wait_until="domcontentloaded", timeout=120000)
        page.wait_for_selector("main", timeout=120000)
        page.wait_for_function("() => document.documentElement.dataset.wgTheme")

        initial_theme = page.locator("html").get_attribute("data-wg-theme")
        page.get_by_role("button", name="Cycle visual theme", exact=False).first.click()
        page.wait_for_function(
            "(before) => document.documentElement.dataset.wgTheme !== before",
            arg=initial_theme,
            timeout=5000,
        )
        chosen_theme = page.locator("html").get_attribute("data-wg-theme")
        page.reload(wait_until="domcontentloaded", timeout=120000)
        page.wait_for_selector("main", timeout=120000)
        page.wait_for_function(
            "(expected) => document.documentElement.dataset.wgTheme === expected",
            arg=chosen_theme,
            timeout=5000,
        )
        check(page.locator("html").get_attribute("data-wg-theme") == chosen_theme,
              "visual theme persists after reload")

        font_button = page.get_by_role("button", name="Toggle larger font size")
        font_button.click()
        page.wait_for_function("() => document.documentElement.classList.contains('wg-font-large')")
        page.reload(wait_until="domcontentloaded", timeout=120000)
        page.wait_for_selector("main", timeout=120000)
        page.wait_for_function("() => document.documentElement.classList.contains('wg-font-large')")
        check(page.locator("html").evaluate("(el) => el.classList.contains('wg-font-large')"),
              "larger font preference persists after reload")

        language = page.locator(".wg-ref-language select")
        language.select_option("te")
        page.reload(wait_until="domcontentloaded", timeout=120000)
        page.wait_for_selector("main", timeout=120000)
        page.wait_for_function("() => document.querySelector('.wg-ref-language select')?.value === 'te'")
        check(page.locator(".wg-ref-language select").input_value() == "te",
              "selected language persists after reload")
        browser.close()

    if failures:
        print("Preference regression failures:", failures)
        sys.exit(1)
    print("All browser preference persistence checks passed.")


if __name__ == "__main__":
    main()
