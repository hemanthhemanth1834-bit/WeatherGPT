# WeatherGPT — Visual Design System

The system that produces every screen in WeatherGPT. It is enforced by
convention and by the browser suites (`responsive_accessibility.py`,
`chat_visibility.py`, `modules_solar_planner.py`); new UI must follow it.
Nothing here depends on external stylesheets, fonts, or CDNs — everything
ships in the bundle (CSP-safe, see `WEATHERGPT_SECURITY_AUDIT.md`).

## 1. Foundations

### Color

Dark "operations desk" palette, layered translucency, one accent per context:

| Token / role | Value family | Usage |
|--------------|--------------|-------|
| Base surface | deep navy / slate (`#0b1629`-family, layered `rgba` surfaces) | page, cards |
| `--wg-muted` / `--wg-faint` | slate greys | secondary text, metadata |
| `--wg-ink` | near-white | primary values |
| Accent cyan | `#22d3ee` / `#67e8f9` | live telemetry, links, info |
| Amber | `#fbbf24` | solar, attention (non-critical) |
| Emerald | `#34d399` / `#10b981` | positive / clean-air / low risk |
| Red / orange | risk-extreme / warnings | alerts only, never decoration |
| Violet | `#a78bfa` | model/proxy panels (distinct from live) |

Rule: color never carries the *only* meaning — every colored state ships with
a text label (LIVE, DELAYED, HIGH, …).

### Typography

- System stack; **weights 700–950** for data display, 400–600 for prose.
- Monospace (`ui-monospace`) for machine facts: coordinates, IDs, timestamps,
  hashes, source strings ("SOURCE Open-Meteo …").
- Sizes are compact by design (0.62–0.85 rem metadata; 1.15 rem panel titles;
  2–3.2 rem hero values). Dense dashboards, readable at 100% zoom.
- Global mono/literal size scale toggle: header `A+` adds `.wg-font-large`.

### Spacing, radii, elevation

- Spacing rhythm 0.3 / 0.5 / 0.8 / 1.2 rem.
- Radii 13–24 px (cards ~20 px, chips/pills ~99 px for capsules).
- Elevation via layered translucent backgrounds + 1 px `rgba(255,255,255,.1)`
  borders — not heavy shadows.

## 2. Shell (reference chrome)

`components/ReferenceChrome.jsx` renders one consistent frame for all views:

1. **Skip link** ("Skip to main content") — first tab stop.
2. **Atmosphere layer** — decorative clouds/rain, `aria-hidden`, purely CSS.
3. **Header** — brand, location pill (single-line: name ellipsizes, state
   stays), weather/theme pill, quick actions (station compare, font scale,
   online status, alerts with live count, settings, install-app, LIVE badge,
   language select). Icon-only controls are `aria-label`ed.
4. **Alert bar** — severity ticker, links to the alert center.
5. **Sidebar** — 20 sections in labeled groups (WEATHER / INTELLIGENCE /
   DISASTER & SAFETY / SYSTEMS). Active item: highlighted + `aria-current`.
6. **Mobile (≤820 px)** — sidebar hidden, drawer + overlay, fixed bottom nav
   (Home, AI Chat, Compare, Alerts, Settings, Modules); header simplifies.
7. **Theme float** — persistent status strip (theme + data state).

### Layout primitives

`wg-responsive-2`, `wg-grid-panels`, `wg-grid-tiles`, `wg-scrollrow`
(auto-fit grids, horizontal scroll rows — zero horizontal page overflow from
320 px up; asserted by the responsive suite).

## 3. Component anatomy

### Data card (`wg-card`)

Title row (icon + title + optional status chip) → primary value → supporting
sentences → provenance line. The provenance line is mandatory for any value:
`SourceLine`/`SourceBadge` (`SOURCE … · UPDATED … · STATUS …`).

### Module feature card (`wg-ref-feature` + `wg-mod-value`)

Used by Life Cast, RoadWatch, TreeGuard, UtilityWatch, Deep-Cast:
headline value + tone chip (COMPUTED / LIVE / FORECAST / STATIC / ESTIMATED) +
explanation + "ask" affordance. Values must be non-empty and computed from
live inputs, or explicitly `NOT CONFIGURED`.

### Status chip vocabulary (`wg-chip`)

| Chip | Meaning |
|------|---------|
| `live` | currently fetched from the named source |
| `estimated` | derived/computed (method named in text) |
| `static` | curated/reference content |
| `demo` | demonstration data (never presented as live) |
| `simulated` | deterministic engine output |
| `off` | unavailable / not configured |

Imagery labels: `DELAYED` (previous-day/radar composite), `RECENT HISTORY`
(RainViewer ~10 min frames), `UNAVAILABLE` + retry on outage.

Live-imagery architecture: a single reusable `LiveImagery` figure (skeleton →
image → explicit status chip, observed-at line, source-attribution link,
error/retry, optional layer switcher) fed by provider adapters in
`services/radar.js` (RainViewer) and `services/gibs.js` (NASA GIBS). GIBS
layers now include true-color (VIIRS/MODIS), MODIS flood-water 2-day composite,
GPM IMERG rain rate and MODIS aerosol optical depth; each layer carries its
own cadence label and honesty note (e.g. "not a rain gauge", "flood context,
not an official flood warning"). Every layer is the previous day's real
product — never labelled LIVE. FloodWatch shows the flood composite directly.

### Charts (`Bars` in `ClimateAnalytics.jsx`, solar chart)

Pure SVG, `role="img"` + `aria-label`, per-point `<title>` hover values,
"real data points" count and `Range:` legend, `● DATA CONNECTED` status chip.
Axis honesty: rainfall axes never go negative; signed series (anomaly,
departure) keep symmetric padding.

### 3D scenes (`Solar3DScene`, `Earth3D`)

Decorative-model layer on top of numeric truth: opacity reduced on narrow
screens, `Motion ON/OFF` toggle, reduced-motion respected. 3D never replaces a
data value.

## 4. Honesty system (the non-negotiable layer)

1. Every value traces to the data-source register; derived values name the
   method in visible copy.
2. Provenance-aware labels: AQI shows "live" only when the payload's
   `aqi_source` is the Open-Meteo US-EPA feed; otherwise "estimated"
   (heuristic), in every surface (dashboard tile, compare rows, chat).
3. Loading vs unavailable are distinct states: `loading…` while in flight,
   `unavailable` after failure — never a fabricated `0`, never "…".
4. First screen is useful without location permission: geolocation failure
   falls back to the reference default, then loads normally; the user can
   always change location.
5. Empty modules auto-run their deterministic engines (e.g., FloodWatch risk
   assessment) instead of presenting dead space.
6. Copy style: short declarative honesty notes ("Blank means no radar
   coverage, not clear skies." / "ESTIMATED — not an official warning.").

## 5. Accessibility

- Contrast: assistant chat 16.58:1 (asserted); status chips pair color+text.
- Keyboard: skip link, visible focus, reachable header/sidebar/drawer
  controls (asserted by the responsive suite).
- Semantics: `aria-current` on nav, `role="status"` for live regions,
  `role="alert"` for errors, `aria-live="polite"` for online state.
- Viewports: 320 / 360 / 390 / 768 / 900 / 1024 / 1280 / 1440 verified (the
  suite's matrix); no horizontal overflow, no clipped controls;
  reduced-motion render checked.
- Header tiers (progressive disclosure, no clipping at any width ≥320):
  full controls ≥1281 px; install/language/user-name hidden ≤1280 px;
  Online chip, LIVE badge and the compare/font-scale/alerts buttons hidden
  ≤1010 px (the settings gear always stays); compact brand ≤400 px. The
  location pill may shrink to fit — the name ellipsizes while the state code
  and CHANGE stay intact.

## 6. Authoring rules for new UI

1. No external stylesheets/fonts/CDNs; styles live in the bundled CSS or an
   inline `<style>` island inside the component (current pattern for panels).
2. Use existing tokens/classes before inventing new ones; keep the chip
   vocabulary exact.
3. Any new value needs a visible source/status; any new failure path needs
   an explicit "unavailable" state.
4. New interactive controls: label, keyboard reach, 320 px layout check.
5. If a control needs data, prefer auto-loading deterministic engines over
   "click to compute" empty screens.
6. Update this document and `WEATHERGPT_COMPLETION_AUDIT.md` when adding a new
   visual pattern.
