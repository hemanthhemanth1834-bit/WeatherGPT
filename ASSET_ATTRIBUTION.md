# WeatherGPT — Asset Attribution

This document records every externally sourced image used by the local WeatherGPT build.
All photographs are used as **editorial / atmospheric context**, never as live satellite
imagery or current local observations. Live radar and satellite products are fetched from
their providers and are labelled separately in the interface.

The optimized WebP files live in `frontend/public/imagery/cinematic/`. The machine-readable
copy of this metadata is `frontend/public/imagery/cinematic/manifest.json`.

## Cinematic image set

| File | Subject | Author / credit | License | Source |
| --- | --- | --- | --- | --- |
| `hero-supercell-kansas.webp` | Supercell thunderstorm, Kansas | Mike Coniglio / NOAA National Severe Storms Laboratory | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ASupercell-thunderstorm-in-Kansas.jpg) |
| `earth-blue-marble.webp` | The Blue Marble (Apollo 17) | Harrison Schmitt / NASA | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AThe_Blue_Marble%2C_AS17-148-22727.jpg) |
| `monsoon-rain-maharashtra.webp` | Monsoon landscape, Bhimashankar, Maharashtra | Nikhil More | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AMonsoon_Maharashtra_India_Rain_Landscape_%281%29_04.jpg) |
| `lightning-danube.webp` | Lightning strike over the Danube, Budapest | Jules Verne Times Two | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3ALightning_strike_over_the_Danube_%28Budapest%2C_Hungary%29.jpg) |
| `flood-affected-village.webp` | Flood-affected village | KEmel49 | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AFlood_affected_village_%28a%29.jpg) |
| `paddy-field-golden-hour.webp` | Paddy field at golden hour, Don Det, Laos | Basile Morin | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AGreen_rice_sheaves_planted_in_a_paddy_field_with_long_shadows_at_golden_hour_in_Don_Det_Laos.jpg) |
| `sikkim-glacier.webp` | Glacier in the Sikkim Himalaya | Jayanta25 | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AGlacier_in_Sikkim_Himalaya.jpg) |
| `hurricane-florence.webp` | Hurricane Florence seen from the ISS | Alexander Gerst / NASA | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AStaring_Down_Hurricane_Florence.jpg) |
| `stratocumulus-clouds.webp` | Stratocumulus and cumulus over Gåseberg, Sweden | W.carter | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File%3AStratocumulus_and_cumulus_over_G%C3%A5seberg.jpg) |

## License notes

- **Public domain** images have no attribution requirement, but author and source are
  recorded here as good practice.
- **CC BY-SA 4.0** images require attribution to the author, a link to the license, and an
  indication of changes. This project:
  - credits the author in this document and in the image caption where the image is used;
  - links to the license at <https://creativecommons.org/licenses/by-sa/4.0/>;
  - states that the original file was cropped/resized and converted to WebP.
- No image is watermarked, paid, or used under a trial-only license.

## Pre-existing imagery

`frontend/public/imagery/nasa-atlantic-goes-2008.jpg` is a NASA/NOAA GOES archival image
already present in the project. It is public domain and is used only as labelled archival
context.

## Fonts

- **Space Grotesk** — Florian Karsten, SIL Open Font License 1.1.
- **Inter** — Rasmus Andersson, SIL Open Font License 1.1.
- **JetBrains Mono** — JetBrains, SIL Open Font License 1.1.

They are installed from Fontsource as local npm packages; no request is made to Google Fonts
at runtime.

## Data providers

Weather and hazard data remain attributable to their providers in the interface:
Open-Meteo, RainViewer, NASA GIBS, NASA EONET, GDACS, USGS, OpenStreetMap and the relevant
official meteorological / disaster agencies. See `ATTRIBUTION.md` and
`THIRD_PARTY_NOTICES.md` for the pre-existing data-source record.
