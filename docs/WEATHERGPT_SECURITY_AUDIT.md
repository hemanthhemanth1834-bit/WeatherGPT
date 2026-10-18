> **Historical report (2026-10-18):** This document preserves evidence from its original tested revision. Its findings and test results are not a claim about the current cleanup branch or production deployment. Check the latest CI run and `docs/CLEANUP_RELEASE_NOTES.md` for current status.

# WeatherGPT Security Audit (this release)

Re-run of the security posture for the `audit/verified-release` change set.
Line-level controls are documented in `docs/SECURITY.md`; this file records
what was verified for **this release** and the findings.

## Change-set footprint

- 8 modified files + 5 added files (2 tests, 3 audit docs at time of check);
  **no dependency changes** (`package.json` / `requirements.txt` untouched).
- No new network endpoints, no new external hosts, no new credentials.
- Backend diff touches: `models.py`, `services/chat.py`, `services/weather.py`.
- Frontend diff touches: `App.jsx`, `ReferenceModulePanel.jsx`,
  `SevereWeatherPanel.jsx`, `index.css`.

## Controls verified

| Control | Verification | Result |
|---------|--------------|--------|
| Secrets in code/git | `git diff` + repo scan of modified files; no keys, tokens or credentials added | PASS |
| XSS-safe rendering | All new UI text renders through JSX expressions/markdown renderer without raw HTML; no `dangerouslySetInnerHTML` introduced anywhere in the diff | PASS |
| Input validation | Hotel: Trip Planner destination is a `<select>` limited to a static tuple; chat input keeps the existing 500-char cap and pydantic validation | PASS |
| URL construction | New destination fetch uses the same validated `fetchCurrentWeather(name, lat, lon)` path with numeric literals; no user-controlled URL fragments | PASS |
| Error handling | New `allSettled` paths surface explicit "unavailable" copy; no stack traces or provider error bodies reach the client | PASS |
| Rate limiting | Unchanged (300/min default, 60/min chat+compare, 30/min climate) | PASS (unchanged) |
| CORS | Unchanged; explicit allowlist from env, wildcard disables credentials | PASS (unchanged) |
| Data honesty = safety | AQI provenance always labeled; heuristic fallback can no longer be silently cached into the weather TTL path | PASS |
| Location-sync guard | The app now refuses to move the active location for non-explicit place guesses, preventing silent state hijack via crafted chat strings | PASS |

## Notes / accepted risks

- Pre-existing: the frontend CSP blocks Google Fonts and Leaflet CSS from CDN,
  producing benign console noise in some networks. Not introduced by this
  release; tracked as a follow-up, no security impact (blocked resources only).
- The local `/api/alerts/active` first-call latency can exceed 30 s when an
  upstream provider is slow; the frontend now degrades gracefully (honest
  "feed unreachable" text). No data leakage either way.
- Overpass queries are fixed-shape (no user input concatenated into the query);
  reviewed in `services/places.py`.

## Verdict

No new vulnerabilities introduced by this change set. All previously documented
controls remain intact, and two new anti-spoofing behaviors (explicit-place
sync guard, AQI provenance enforcement) further harden the product.

## Second-session addendum (location-resolution fix)

Change set: `backend/app/services/geo.py`, `backend/app/services/chat.py`,
`backend/app/models.py`, `frontend/src/App.jsx`, two backend test files, one
frontend browser suite, three audit documents. **No dependency changes, no new
endpoints, no new hosts, no new credentials.**

| Control | Verification | Result |
|---------|--------------|--------|
| Secrets | `git diff` scanned for key/token/password patterns; only the word "tokens" appears, as a Python variable | PASS |
| Injection | The fix removes a matching ambiguity; no new string formatting into queries. `resolve()` calls the same `_geocode_live()` with the same `requests.utils.quote()` encoding | PASS |
| XSS | The new note is plain Markdown text with typographic quotes; rendered by the existing markdown renderer. No `dangerouslySetInnerHTML` added | PASS |
| Input validation | Place names remain free text through the existing 500-char cap; the token-set comparison is O(n) and cannot be steered into unbounded matching | PASS |
| Error handling | The new note fires only on a genuine resolution miss; no provider error text or stack trace reaches the client | PASS |
| Location integrity | Two distinct hijack vectors closed: (a) an unknown name can no longer be mapped onto an unrelated real city, (b) an unresolved answer can no longer silently move the app's active location | PASS |
| Rate limiting / CORS / headers | Unchanged | PASS (unchanged) |

Additional evidence: the browser captured the raw reply
`{"explicit_location": true, "location_resolved": false}` while the app's
active location stayed unchanged, confirming the guard operates on the real
payload rather than a mocked one.
