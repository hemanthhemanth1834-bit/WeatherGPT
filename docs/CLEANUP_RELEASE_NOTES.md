# Cleanup release notes — 2026-10-18

This file tracks the repository cleanup performed on branch `cleanup/remove-unwanted-demo-data`. These edits are proposed through a pull request and must pass CI before merging/deployment.

## Changes in this branch

- Removed the obsolete cyclone-track API client, demo panel, 2D map overlay, 3D globe markers, checkbox, legend, and illustrative-track labels. Genuine alerts and computed weather-risk indicators remain.
- Replaced fabricated weather fallback series and hard-coded values with an explicit HTTP 503 response when the upstream forecast is unavailable. No fake values or current timestamp are returned from this fallback path.
- Removed misleading New Delhi display defaults from the home hero and active-station panel.
- Corrected AQI provenance wording and explicitly documented that the cyclone risk category is a wind/rain heuristic, not cyclone detection, tracking, or an official warning.
- Changed climate analytics labels to identify historical/archive and ERA5 reanalysis data rather than imply current direct observations.
- Replaced fixed-date/fixed-frame README imagery with live provider/source links; removed static provider `LIVE` badges and invalid citation tokens; corrected the deployment note and impact-slide path.
- Updated provider documentation to describe runtime-dependent status and fail-closed weather behavior.
- Marked prior audit/test reports as historical evidence so their results are not mistaken for verification of this release.

## Intentionally not deleted

- Old branches, old Vercel deployments, rollback URLs, browser-local saved places, and environment settings were not deleted. They require separate checks/permissions and are not required to remove fabricated data from the current code.
- Visual-reference screenshots were not bulk-deleted because some are referenced by test manifests and audit evidence. Remove or compress them only after confirming each reference and any third-party image rights.
- This branch does not claim that production has been cleaned. Merge only after CI is green and confirm the resulting Vercel deployment is READY.
