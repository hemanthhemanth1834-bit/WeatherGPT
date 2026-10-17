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
