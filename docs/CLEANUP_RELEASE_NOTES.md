# Cleanup release notes — 2026-10-18

This document records the WeatherGPT cleanup changes and the remaining verification gates. Treat GitHub Actions and Vercel as the source of current CI/deployment status; this file intentionally contains no static claim that a deployment is live.

## Data integrity and stale demo cleanup

- Removed the obsolete cyclone-track API client, demo panel, 2D map overlay, 3D globe markers, checkbox, legend, and illustrative-track labels. Genuine alerts and computed weather-risk indicators remain.
- Replaced fabricated weather fallback series and hard-coded values with an explicit unavailable response when the upstream forecast is unavailable. No fake weather values or generated current timestamp are returned by this fallback path.
- Corrected AQI provenance wording and documented that the cyclone risk category is a wind/rain heuristic, not cyclone detection, tracking, or an official warning.
- Changed climate analytics labels to identify historical/archive and ERA5 reanalysis data rather than imply current direct observations.
- Removed automatic New Delhi location selection when GPS is unavailable or denied. An explicitly saved city may be used; otherwise the UI asks the user to select a location.
- Corrected the README license badge so it does not imply an MIT license while the repository metadata does not specify an SPDX license.
- Corrected provider documentation to distinguish runtime status from guaranteed availability and to describe fail-closed weather behavior.
- Marked earlier completion, release, and audit reports as historical evidence so their old browser results and fallback behavior are not mistaken for current release behavior.

## Repository and deployment hygiene

- Removed the duplicate SVG icon in favor of the existing WeatherGPT SVG mark.
- Moved the technical-approach presentation slide out of `frontend/public/` into `docs/assets/`. The README still references it, but it is no longer copied into the deployed frontend's public assets.
- Kept screenshots referenced by the visual-reference manifest and test evidence. They are repository QA artifacts, not deployed frontend assets.
- Kept optional WRF, MQTT/WIS2, voice, SIH documentation, provider adapters, tests, and presentation material because they are related to the project.
- Did not bulk-delete historical deployments, branches, open dependency PRs, browser-local saved places, or Vercel environment settings. They are not ordinary project files, and deleting them blindly could remove rollback paths, useful fixes, or user data.

## Verification rule

Merge and deployment are complete only when the latest required CI checks pass, the production deployment is READY, and the primary alias serves the expected commit. A preview deployment or a successful build alone is not proof of production activation.
