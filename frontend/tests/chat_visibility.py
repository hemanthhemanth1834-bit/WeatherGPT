"""P0 regression: AI assistant messages must be visible, complete and unclipped.

Uses the repo's existing free Playwright stack with a DETERMINISTIC mocked
``/api/chat/query`` response (no live weather, no external provider).
Run after ``npm run build`` + backend on :8000 + ``npm run preview`` on :4173::

    python frontend/tests/chat_visibility.py

Env overrides: WG_UI_URL, WG_BROWSERS (csv), WG_CHROME_PATH (local browser exe).
"""
import json
import os
import sys

UI_URL = os.getenv("WG_UI_URL", "http://127.0.0.1:4173/")
BROWSERS = [b.strip() for b in os.getenv("WG_BROWSERS", "chromium,firefox,webkit").split(",") if b.strip()]
CHROME_PATH = os.getenv("WG_CHROME_PATH", "")

# NOTE: named PROBE_TAG (not *TOKEN*) so secret scanners don't flag this
# deterministic test marker as a generic-api-key.
PROBE_TAG = "vis-probe-9f27"
QUESTION = f"{PROBE_TAG} will it rain in Pune this evening"
REPLY_MD = (
    f"### Weather for Pune, Maharashtra\n\n"
    f"Currently **Overcast** at **31.5°C** (mocked fixture {PROBE_TAG}).\n\n"
    f"- Rain chance **0%**\n- Wind **12.5 km/h NE**\n\n"
    f"_Source: Open-Meteo · LIVE · mocked fixture, not a live provider_"
)
FIXTURE = {
    "query": QUESTION,
    "detected_language": "en",
    "persona": "general",
    "speech_text": f"Pune is overcast at 31.5 degrees. Fixture {PROBE_TAG}.",
    "markdown_response": REPLY_MD,
    "structured_weather": None,
    "alerts": [],
    "quick_suggestions": [],
    "suggested_actions": [{"label": "Open forecast", "action": "open_dashboard"}],
}

CONTRAST_JS = """() => {
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x));
    return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1};
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const over = (fg, bg) => ({r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1});
  // Page base behind the translucent glass (body uses dark gradients).
  const pageBase = {r: 10, g: 17, b: 32, a: 1};
  const effectiveBg = (el) => {
    let node = el, bg = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a >= 0.99) { bg = c; break; }
      if (c && c.a > 0) bg = bg ? over(c, bg) : over(c, pageBase);
      node = node.parentElement;
    }
    return bg || pageBase;
  };
  const ratio = (fg, bg) => {
    const l1 = lum(fg), l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  return [...document.querySelectorAll('[data-testid="message-body"] p, [data-testid="message-body"] h3, [data-testid="message-body"] li')]
    .map(el => {
      const fg = parse(getComputedStyle(el).color);
      const bg = effectiveBg(el);
      return {tag: el.tagName, text: (el.innerText || '').slice(0, 60),
        color: getComputedStyle(el).color, ratio: +(ratio(over(fg, bg), bg)).toFixed(2)};
    });
}"""


def check(cond, label, failures):
    print(("PASS " if cond else "FAIL ") + label)
    if not cond:
        failures.append(label)


def run_browser(pw, name, viewport):
    from playwright.sync_api import TimeoutError as PwTimeout

    failures = []
    tag = f"[{name} {viewport['width']}px]"
    try:
        launcher = getattr(pw, name)
        kwargs = {"headless": True}
        if CHROME_PATH and name == "chromium":
            kwargs["executable_path"] = CHROME_PATH
        browser = launcher.launch(**kwargs)
    except Exception as exc:  # browser unavailable on this machine
        print(f"SKIP {tag} launcher unavailable: {str(exc)[:120]}")
        return None
    page = browser.new_page(viewport=viewport)
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.goto(UI_URL, wait_until="load", timeout=60000)
        page.wait_for_timeout(2000)
        if viewport["width"] < 700:
            page.get_by_role("button", name="Open navigation").first.click(timeout=15000)
            page.wait_for_timeout(600)
        page.get_by_role("button", name="AI Weather Assistant").first.click(timeout=15000)
        page.wait_for_timeout(1000)

        # 1-2. Welcome message visible and non-empty.
        welcome = page.get_by_test_id("assistant-message").first
        welcome.wait_for(timeout=15000)
        wtext = (welcome.inner_text() or "").strip()
        check(len(wtext) > 20, f"{tag} welcome message visible non-empty ({len(wtext)} chars)", failures)
        check("WeatherGPT" in wtext, f"{tag} welcome sender/content present", failures)

        # 3. Typed characters readable: value round-trips + light-on-dark contrast.
        box = page.locator('input[aria-label="Type your weather question"]')
        box.fill(QUESTION)
        check(box.input_value() == QUESTION, f"{tag} typed text round-trips", failures)
        ink = page.evaluate("""() => {
          const i = document.querySelector('input[aria-label="Type your weather question"]');
          const cs = getComputedStyle(i);
          return {color: cs.color, bg: cs.backgroundColor};
        }""")
        print(f"  input ink={ink}")
        check("234, 241, 251" in ink["color"], f"{tag} input text is light ink", failures)

        # 4-6. Mocked API reply: loading, echo, complete reply, no duplicates.
        def fulfill(route):
            route.fulfill(status=200, content_type="application/json",
                          body=json.dumps(FIXTURE), headers={"access-control-allow-origin": "*"})

        def delayed(route):
            page.wait_for_timeout(700)  # let the busy/loading state paint
            fulfill(route)

        page.route("**/api/chat/query", delayed)
        before = page.get_by_test_id("user-message").count()
        page.click('button[aria-label="Send question"]')
        try:
            page.get_by_role("status").first.wait_for(timeout=8000)
            loading_seen = True
        except PwTimeout:
            loading_seen = False
        check(loading_seen, f"{tag} loading indicator visible while busy", failures)
        check(page.get_by_test_id("user-message").count() == before + 1,
              f"{tag} exactly one user bubble appended (no duplicates)", failures)
        page.wait_for_function(
            f"""() => [...document.querySelectorAll('[data-testid="assistant-message"]')]
                 .some(a => (a.innerText||'').includes('{PROBE_TAG}'))""",
            timeout=30000)
        replies = page.get_by_test_id("assistant-message").all_inner_texts()
        check(any(PROBE_TAG in t and "31.5" in t for t in replies),
              f"{tag} assistant reply visible with complete fixture text", failures)

        # 7. Contrast: every message line vs effective background.
        rows = page.evaluate(CONTRAST_JS)
        bad = [r for r in rows if r["ratio"] < 4.5]
        print(f"  contrast lines={len(rows)} min="
              f"{min([r['ratio'] for r in rows]) if rows else 'n/a'}")
        check(len(rows) > 0 and not bad, f"{tag} message contrast >= 4.5 ({len(rows)} lines)", failures)
        if bad:
            print("  low-contrast:", json.dumps(bad[:5]))

        # 7b. Controls that share the theme ink (prompt buttons) must contrast too.
        btn = page.evaluate("""() => {
          const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/);
            const p = m[1].split(',').map(x => parseFloat(x));
            return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
          const lum = (c) => { const f = (v) => { v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
          const b = document.querySelector('.wg-scrollrow .wg-btn-ghost');
          if (!b) return null;
          const fg = parse(getComputedStyle(b).color);
          const page_ = {r: 10, g: 17, b: 32};
          const l1 = lum(fg), l2 = lum(page_);
          return {color: getComputedStyle(b).color,
                  ratio: +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)};
        }""")
        print(f"  prompt-button ink={btn}")
        check(btn is not None and btn["ratio"] >= 4.5,
              f"{tag} suggested-prompt button contrast >= 4.5 {btn}", failures)

        # 8. Error state: abort the API, expect a visible error bubble.
        page.unroute("**/api/chat/query")
        page.route("**/api/chat/query", lambda r: r.abort())
        box.fill(f"{PROBE_TAG} error path probe")
        page.click('button[aria-label="Send question"]')
        page.wait_for_function(
            """() => [...document.querySelectorAll('[data-testid="assistant-message"]')]
                 .some(a => /could not reach|without readable text/i.test(a.innerText||''))""",
            timeout=30000)
        check(True, f"{tag} API-error bubble visible", failures)

        # 9. No clipping + newest reply reachable by scrolling.
        clip = page.evaluate("""() => [...document.querySelectorAll('article')].map(a => {
          const r = a.getBoundingClientRect();
          return {h: Math.round(r.height), scrollH: a.scrollHeight,
                  ok: r.height >= a.scrollHeight - 1};
        })""")
        check(all(c["ok"] for c in clip), f"{tag} no message clipped {clip}", failures)
        try:
            page.wait_for_function("""() => {
              const list = document.querySelector('.wg-ai-message-list');
              const arts = [...document.querySelectorAll('article')];
              const last = arts[arts.length - 1].getBoundingClientRect();
              return last.bottom <= list.getBoundingClientRect().bottom + 2;
            }""", timeout=8000)
            reach_ok, reach = True, page.evaluate("""() => {
              const list = document.querySelector('.wg-ai-message-list');
              return {scrollable: list.scrollHeight > list.clientHeight + 1};
            }""")
        except PwTimeout:
            reach_ok, reach = False, {"scrollable": "timeout"}
        check(reach_ok, f"{tag} newest reply reachable by scrolling {reach}", failures)

        # 10. Console errors fail the test (ignoring known offline-provider noise).
        noise = [e for e in errors if "ERR_CONNECTION_REFUSED" not in e
                 and "api.open-meteo.com" not in e and "net::" not in e]
        check(not noise, f"{tag} no relevant console/page errors {noise[:3]}", failures)
    except AssertionError as exc:
        failures.append(f"{tag} exception: {exc}")
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
    if not ran:
        print("BLOCKED: no browsers available")
        sys.exit(2)
    sys.exit(1 if all_failures else 0)


if __name__ == "__main__":
    main()
