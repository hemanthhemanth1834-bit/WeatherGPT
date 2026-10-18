# Reference downloads — licenses & provenance

These are **reference assets** kept for design study and imagery-fidelity
comparison. They are NOT shipped in the production frontend.

## gibs-viirs-truecolor-2026-10-16.jpg

- Source: NASA **Global Imagery Browse Services (GIBS)** WMS (`gibs.earthdata.nasa.gov`, EPSG:4326 "best" endpoint).
- Layer: `VIIRS_SNPP_CorrectedReflectance_TrueColor` (true-color satellite composite, VIIRS aboard Suomi-NPP).
- Imagery date requested: `TIME=2026-10-16` (2 days before capture, matching GIBS latency).
- Query: `SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&WIDTH=1400&HEIGHT=700&CRS=EPSG:4326&BBOX=-60,-120,60,60&FORMAT=image/jpeg`.
- Fetch result recorded at capture time: HTTP 200, `Content-Type: image/jpeg`, 316,149 bytes, JPEG magic bytes verified.
- License: NASA imagery is generally **not copyrighted** (see NASA media usage guidelines); attribution "NASA EOSDIS GIBS / VIIRS Suomi-NPP". No endorsement implied.
- Purpose: reference for the LiveImagery satellite panel (tone, resolution expectations, cloud/land/sea appearance) and for the MRMS/true-color layer work already shipped in the app.

## Attribution wording used in the app

The LiveImagery panel attributes GIBS products as "NASA GIBS" and keeps the
provider per-layer URL/attribution visible. This matches the repository's
`docs/DATA_SOURCES.md` register.
