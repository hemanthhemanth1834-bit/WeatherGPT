# SECURITY — WeatherGPT SIH 2026

Implemented and verified in production.

- **Secrets**: none in code, git, or bundles. LLM/provider keys (if ever set)
  live only in server environment variables. `.env` git-ignored;
  `.env.example` holds placeholders. Verified by pre-push secret scans.
- **CORS**: explicit allowlist from `CORS_ALLOW_ORIGINS`; wildcard `*`
  automatically disables credentials. Production sets the site origin.
  Verified: production origin echoed, foreign origin rejected.
- **Rate limiting**: best-effort per-IP sliding window — 300/min default,
  60/min chat+compare, 30/min climate+explain — JSON 429 + `Retry-After` + ACAO,
  documented BEST-EFFORT PER INSTANCE. Tested (pass + block + tier paths).
- **Validation**: pydantic models everywhere; chat query capped at 500 chars
  (422 beyond); query params typed (422 on bad types); guarded endpoints
  return honest 502s, never stack traces.
- **XSS**: React auto-escaping + `react-markdown` without raw-HTML plugins;
  no `dangerouslySetInnerHTML` anywhere; Leaflet popups use buttons, not HTML strings.
- **Injection**: no SQL/database; no shell calls; geocoding input is
  normalized/encoded; tile/API URLs are constructed from validated floats.
- **Logging**: no request bodies, keys, or coordinates logged server-side.
- **Transport**: HTTPS only in production (Vercel-managed TLS).
- **Dependencies**: no new packages this release; `npm audit`-clean install
  (0 vulnerabilities reported at build); Dependabot-style pinning via lockfiles.

Residual notes: rate limiting is per-worker memory (documented best-effort
on serverless); no auth layer (public read-only demo, no user accounts).
