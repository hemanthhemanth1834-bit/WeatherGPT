# WeatherGPT Free-Source and Attribution Policy

Last reviewed: 2026-10-18

WeatherGPT prioritizes public, free, open-source, and keyless data sources. "Free" does not mean unrestricted, guaranteed, or suitable for commercial use. Before adding or expanding an integration, verify its current terms, attribution requirements, rate limits, geographic coverage, and whether the intended deployment is commercial.

## Provider policy

| Source | Intended role | Required product behaviour | Usage caveat |
| --- | --- | --- | --- |
| Open-Meteo Forecast / Geocoding / Air Quality | Forecast, model and air-quality values | Show provider attribution, model/source, timestamp, data type, and fallback state | The free API is for non-commercial use and has published rate limits. Data is CC BY 4.0; attribution is required. Commercial use requires a suitable plan or self-hosted alternative. |
| RainViewer | Recent-past radar frames | Label as recent history, show frame time and attribution, cache metadata, retry gracefully | Public API is for personal/educational use, has no SLA, and should not be described as a guaranteed live/nowcast feed. |
| NASA GIBS | Earth-observation imagery | Identify product/layer and imagery date; distinguish daily imagery from real-time observations | Follow NASA Earthdata service, product, and attribution guidance. |
| OpenStreetMap | Map context | Keep visible attribution and use a compliant tile provider | The public OSM tile service is capacity-limited; do not treat it as a free unlimited production CDN. |
| USGS / GDACS / NASA EONET / NOAA | Event and hazard context where supported | Keep each event's source, timestamp, geographic scope and event type visible | These feeds have different coverage and update schedules; they are not interchangeable with local official warnings. |
| IMD / MOSDAC | Official India weather and satellite information where a documented public feed is available | Only label data official when it was actually retrieved from the official source; expose unavailable or portal-only states | Never guess protected API endpoints or present WeatherGPT-computed thresholds as an official bulletin. |

## Data semantics

Every panel should clearly distinguish:

- **LIVE** — successfully retrieved from its stated provider; show a timestamp.
- **DELAYED** — a real product that is intentionally older (for example, recent-past radar frames or daily satellite imagery).
- **HISTORICAL / STATIC** — reference information, not a current observation.
- **ESTIMATED / SIMULATED / DEMO** — modelled or illustrative values, never presented as a measurement or official warning.
- **UNAVAILABLE** — no valid data was obtained. Do not silently replace it with plausible-looking defaults.
- **NOT CONFIGURED / PORTAL ONLY** — integration is not active or the source offers no verified public endpoint in this deployment.

An HTTP 200 response alone does not prove the underlying data is current or that every provider is working. Provider health checks and actual product freshness must be reported separately.

## Safety policy for computed alerts

- WeatherGPT-generated risk indicators are decision-support estimates, not government bulletins or CAP messages.
- Rain probability alone is not evidence of observed heavy rainfall.
- A provider failure or incomplete response must never be converted into a calm-weather sample or synthetic warning.
- Do not emit an illustrative warning in the live feed when no data crosses a validated threshold.
- Use explicit model/forecast wording and expected urgency for model-derived signals. Preserve source and valid-time information.
- Encourage users to verify official local bulletins before making emergency decisions.

## Free alternatives and self-hosting

Prefer no-key public endpoints for low-volume educational use. Where scale, availability or commercial terms become a problem, evaluate self-hosting open-source software or choosing a provider with terms appropriate to the deployment. Do not add paid APIs, credentials, telemetry SDKs, or new dependencies without an explicit need and license review.

## Source links

- Open-Meteo terms: https://open-meteo.com/en/terms
- Open-Meteo API overview and open-source/self-hosting: https://open-meteo.com/
- RainViewer API documentation and usage terms: https://www.rainviewer.com/api.html
- RainViewer API transition notes: https://www.rainviewer.com/api/transition-faq.html
- NASA GIBS: https://earthdata.nasa.gov/gibs
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/

This document is an engineering checklist, not legal advice. Recheck linked terms before a release or change in use.
