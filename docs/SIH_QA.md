# JUDGE Q&A — WeatherGPT SIH 2026 (verified answers only)

**What is innovative?** Deterministic grounding: an 11-language chat router
whose every figure provably comes from a live tool (regression-tested), plus
honest source/status labels on every card — no other demo here does both.

**Why AI?** Intent routing, transliteration-tolerant place extraction, and
multilingual templating turn raw NWP numbers into answers for citizens,
farmers, pilots, and disaster cells.

**Why not normal weather apps?** Apps show tables; WeatherGPT answers
questions ("is it safe to travel?", "spray today?") with evidence attached.

**Where does data come from?** Open-Meteo services, NOAA ADDS, RainViewer, NASA GIBS,
BigDataCloud, GDACS, USGS, NASA EONET, OSM and the public IMD district-nowcast
RSS feed — free/public sources where permitted. IMD RSS is used only for the
warning text it actually returns; protected IMD APIs are not claimed. Current
availability is shown by `/api/providers/health`.

**How do you prevent hallucinations?** Numbers originate only in tools;
templates fill them in; tests assert every °C figure exists in the payload;
failures yield "data unavailable", never guesses.

**What happens when APIs fail?** Retry+backoff, then FALLBACK/ESTIMATED
labels, then SIMULATED local estimate or honest 502 — never stale-as-LIVE.

**How is live data verified?** Each payload carries source + IST timestamp;
provider health probes run live; production QA checks timestamps per deploy.

**How does multilingual support work?** Script-range + keyword detection,
native-script place maps, per-language templates (figures never translated),
BCP-47 voice mapping, UI switcher.

**How does GPS work?** Browser Geolocation → BigDataCloud reverse-geocode →
weather refresh; denial keeps manual place; coords never leave the query path.

**How scalable is it?** Stateless serverless API + TTL caches + rate limits;
same-origin static frontend on CDN. No database to scale.

**How secure is it?** See `docs/SECURITY.md`: no secrets, CORS allowlist,
rate limits, validation, no raw HTML.

**Why are some providers NOT CONFIGURED?** WRF, MOSDAC/ISRO, protected IMD APIs
and INCOIS need feeds or credentials that are not available to this deployment.
The public IMD district-nowcast RSS path is configured separately and is marked
LIVE only when the upstream responds. We probed and documented the limits
instead of faking integrations.

**What is the ML/AI contribution?** Rule-based NLU + deterministic risk/travel
models with published thresholds; LLM adapters exist but are key-gated —
determinism is the safety feature.

**How does disaster intelligence work?** 10-station live telemetry scan vs
documented thresholds (computed, unofficial) + GDACS official global feed +
DEMO cyclone geometry + 112/1078 actions + readiness builder.

**Who can use it?** Citizens (chat/voice), farmers (advisories), aviation
(live METAR briefs), marine (wave/SST), disaster cells (alerts+risk+GIS),
researchers (ERA5 history, Telugu-first access).

**Future scope?** Protected IMD API access, MOSDAC/ISRO and INCOIS feeds when
authorized/available; CPCB AQI stations; WRF pipeline; alert push
subscriptions; offline PWA pack; validated risk study.
