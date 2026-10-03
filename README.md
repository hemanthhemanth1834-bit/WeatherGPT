# WeatherGPT — AI Weather Intelligence for India

<p align="center">
  <strong>Conversational Weather • Forecast Intelligence • Disaster Decision Support</strong><br/>
  Built for Smart India Hackathon (SIH) 2026
</p>

<p align="center">
  <a href="https://github.com/hemanthhemanth1834-bit/WeatherGPT">GitHub</a> ·
  <a href="https://weathergpt-kappa-pink.vercel.app/">Live Demo</a> ·
  <a href="docs/SIH_DEMO.md">4-Minute Demo</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/DATA_SOURCES.md">Data Sources</a>
</p>

> **WeatherGPT turns weather data into understandable, location-aware intelligence.**
> It combines live public weather services, deterministic AI tools, GIS, multilingual interaction, alerts, agricultural guidance, climate analytics, and disaster-oriented decision support in one interface.

---

## 1. What is WeatherGPT?

WeatherGPT is an **AI-powered weather intelligence platform for India** designed around a simple idea:

**Ask naturally → retrieve verified data → explain it clearly → show the evidence.**

Instead of forcing users to interpret multiple technical weather products, WeatherGPT brings together:

- Current conditions
- Hourly and 7-day forecasts
- NWP model selection
- Air quality
- Marine conditions
- Radar and satellite references
- Disaster and hazard information
- Weather alerts
- Agricultural advisories
- Aviation information
- Climate analysis
- GIS and 3D visualization
- Multilingual chat and voice interaction

The platform is designed for **citizens, farmers, students, emergency-awareness workflows, and technical demonstrations**.

---

## 2. Smart India Hackathon 2026

**Domain:** Disaster Management / Software  
**Focus:** AI, weather intelligence, forecasting, alerts, GIS and decision support  
**Problem theme:** Conversational AI for Weather Forecasting, Alerts and Climate Information

### Problem

Weather information is often distributed across different portals, technical products and specialist terminology. A user may know the location and question they care about, but not the correct meteorological product or technical terminology needed to find the answer.

### WeatherGPT approach

WeatherGPT provides a single conversational layer over multiple public data services:

```
User Question
     ↓
Language / Intent Detection
     ↓
Location Extraction
     ↓
Deterministic Weather Tool
     ↓
Live / Computed / Estimated Data
     ↓
Plain-Language Explanation
     ↓
Source + Timestamp + Confidence
```

The system is intentionally designed so that **numbers come from data tools rather than being invented by a generative model**.

---

## 3. Live Product

**Live demo:** https://weathergpt-kappa-pink.vercel.app/

### Example: Pune weather

A user can ask:

> **"What is the weather in Pune today?"**

WeatherGPT can resolve the location, retrieve live Open-Meteo forecast data and return:

- Current temperature
- Feels-like temperature
- Humidity
- Wind speed and direction
- Precipitation
- Cloud cover
- Pressure
- UV index
- Hourly forecast
- 7-day forecast
- Data source
- Update timestamp
- Confidence / provenance label

### Example: model comparison

A technical user can request:

> **"Show Pune weather using GFS."**

or select:

- **Auto** — Open-Meteo multi-model blend
- **GFS** — Global Forecast System
- **ECMWF IFS** — ECMWF model
- **ICON** — DWD ICON model

These model routes use free Open-Meteo endpoints; no paid weather API key is required for the public integration.

---

## 4. Key Capabilities

### 🌦️ Weather Intelligence

- Live current weather
- 24-hour hourly forecast
- 7-day forecast
- Sunrise / sunset
- UV index
- Wind and precipitation
- Humidity and pressure
- Location-aware forecasts
- GPS-based location workflow
- City search and saved places
- City-to-city comparison

**Example**

> "Compare Vijayawada and Chennai for tomorrow."

The comparison tool retrieves weather values for both locations and presents the difference rather than generating unsupported numbers.

---

### 🤖 Deterministic AI Weather Agent

The conversational layer is tool-driven.

```
POST /api/chat/query
        ↓
Language detection
        ↓
Intent detection
        ↓
Place extraction
        ↓
Tool selection
        ↓
Live / computed data
        ↓
Structured response
```

Supported intent families include:

- Weather
- Forecast
- Comparison
- Alerts
- Agriculture
- Aviation
- Marine
- Climate
- Risk
- Location

The complete tool registry is exposed through:

```
GET /api/agent/tools
GET /api/agent/engine
```

### Design principle

**The agent explains data; it does not manufacture weather observations.**

---

### 🌍 Multilingual Weather Assistant

WeatherGPT supports an 11-language conversational layer:

- English
- Hindi
- Marathi
- Tamil
- Telugu
- Bengali
- Gujarati
- Punjabi
- Kannada
- Malayalam
- Odia

It also supports practical Romanized-language patterns such as Hinglish-style queries.

**Example**

> "Vijayawada lo repu rain untunda?"

The system can identify the language/query intent, resolve the location, retrieve the forecast and produce a structured answer.

Language analysis:

```
POST /api/language/analyze
```

---

### 🚨 Weather Alerts & Disaster Awareness

WeatherGPT combines:

1. **Official-source information where available**
2. **Live third-party disaster feeds**
3. **Computed weather thresholds**
4. **Clearly labelled demonstration layers**

Current alert/data integrations include:

- IMD district-nowcast RSS source
- GDACS
- USGS earthquake data
- Live Open-Meteo telemetry
- Application-generated CAP-style alerts

Computed alerts evaluate conditions such as:

- Heavy rainfall
- Thunderstorms
- Heat
- Cold
- Coastal winds

> **Important:** WeatherGPT-generated alerts are application estimates and are **not replacements for official emergency bulletins**.

---

### 🗺️ GIS & 3D Earth

The platform combines 2D and 3D geospatial visualization.

**2D GIS**

- Leaflet
- OpenStreetMap
- RainViewer radar
- USGS earthquake markers
- NASA EONET wildfire information
- Alert zones
- Demonstration cyclone geometry

**3D Earth**

- Three.js
- Procedural globe
- Natural Earth coastline data
- Day/night terminator
- Weather/location markers
- Disaster markers
- Adaptive rendering
- Reduced-motion support
- Lazy loading

The 3D Earth experience is intentionally isolated so the core weather interface remains lightweight.

---

### 🛰️ Satellite & Earth Observation

WeatherGPT provides satellite/earth-observation references using free public resources.

**NASA GIBS**

- Live viewer/tile references
- Earth observation layers
- No static image presented as live observation

**RainViewer**

- Live radar layer when upstream data is available

**MOSDAC / ISRO**

- Public catalog/metadata references are documented
- Protected datasets are not falsely represented as directly integrated

This distinction is important:

> **A satellite viewer link is not the same as proxying satellite pixels through the application.**

---

### 🌾 Agriculture Intelligence

WeatherGPT includes rule-based advisory logic for:

- Paddy
- Cotton
- Wheat
- Sugarcane
- Soybean
- Mustard

Advisories combine weather conditions with crop-oriented rules.

**Example**

> "Will tomorrow's rain affect paddy operations?"

The system can combine rainfall probability, temperature and humidity with the crop rule set and return an informational advisory.

> Agricultural guidance is informational and should not replace agronomist or government advisory services.

---

### ✈️ Aviation Weather

The aviation module supports live NOAA ADDS information when available.

Typical information includes:

- METAR
- TAF
- Airport weather conditions

If the upstream feed is unavailable, the application uses **clearly labelled static demonstration data**.

> Static demonstration data must never be treated as flight-planning information.

---

### 🌊 Marine Intelligence

WeatherGPT provides coastal intelligence using available public weather/marine data.

Includes:

- Coastal wind
- Wave-related estimates
- Sea-state interpretation
- Fisherman-oriented information
- Indicative tide information

Marine outputs are **model-dependent / estimated** where they are not sourced directly from an official bulletin.

---

### 📈 Climate Analytics

The climate module provides a dedicated analytical view for historical/reference information.

It includes:

- Decadal reference values
- Temperature-anomaly visualizations
- Monsoon reference information
- Event-count visualizations
- Plain-language interpretation

The current climate reference dataset is explicitly labelled **STATIC** rather than being presented as a live climate-monitoring feed.

---

### 🧠 Risk Engine

WeatherGPT contains a deterministic risk engine for:

- Heat
- Heavy rainfall
- Flood-related conditions
- Strong winds
- Thunderstorms
- Cyclone-related conditions

The engine uses published application thresholds rather than opaque model-generated scores.

```
Weather observations
       +
Forecast indicators
       +
Documented thresholds
       ↓
Risk level
       ↓
Explanation + evidence
```

Risk output is **ESTIMATED and unofficial** unless an upstream official source is explicitly identified.

---

## 5. Free Data & Provider Architecture

WeatherGPT prioritizes **free public sources and no-key integrations**.

| Capability | Provider | Status |
|---|---|---|
| Forecast | Open-Meteo | LIVE |
| Geocoding | Open-Meteo | LIVE |
| Air Quality | Open-Meteo | LIVE |
| Marine | Open-Meteo | LIVE |
| Historical weather | Open-Meteo Archive / ERA5 | LIVE |
| GFS | Open-Meteo | LIVE |
| ECMWF IFS | Open-Meteo | LIVE |
| DWD ICON | Open-Meteo | LIVE |
| Radar | RainViewer | LIVE |
| Satellite viewer | NASA GIBS | LIVE / viewer reference |
| Earthquakes | USGS | LIVE |
| Wildfires/events | NASA EONET | LIVE |
| Global disasters | GDACS | LIVE |
| Aviation | NOAA ADDS | LIVE + fallback |
| Maps | OpenStreetMap | LIVE |
| Official weather warnings | IMD RSS | LIVE when upstream responds |

### Provider philosophy

Every important panel communicates its provenance using labels such as:

**LIVE · OFFICIAL · COMPUTED · ESTIMATED · STATIC · DEMO · SIMULATED · NOT CONFIGURED**

This prevents a demonstration value from being mistaken for live government data.

---

## 6. NWP Model Layer

WeatherGPT now exposes a free model-selection layer:

| Model | Route | Purpose |
|---|---|---|
| Auto | `model=auto` | Multi-model Open-Meteo blend |
| GFS | `model=gfs` | Global Forecast System |
| ECMWF | `model=ecmwf` | ECMWF IFS |
| ICON | `model=icon` | DWD ICON |

NWP status:

```
GET /api/nwp/status
```

### WRF

WRF is **not falsely presented as live**.

A local WRF adapter exists for future/local GRIB2 or NetCDF workflows, but it remains disabled unless a real WRF dataset and configuration are supplied.

---

## 7. Voice Interface

WeatherGPT supports a browser-friendly voice pipeline:

```
Speech
 ↓
Web Speech STT
 ↓
WeatherGPT intent engine
 ↓
Weather tool
 ↓
Response
 ↓
TTS / SpeechSynthesis
```

The browser-native path requires no paid API.

The architecture also supports optional local/free voice bridges such as VibeVoice when separately hosted.

The main system remains usable without a GPU-dependent voice service.

---

## 8. High-Level Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                       WeatherGPT UI                          │
│ React 19 • Vite • Tailwind • Leaflet • Three.js              │
└─────────────────────────────┬────────────────────────────────┘
                              │
                       REST / WebSocket
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                     FastAPI Backend                          │
│                                                              │
│  Chat / Agent │ Weather │ Alerts │ Risk │ GIS │ Voice       │
│  Agriculture  │ Marine  │ Climate│ NWP  │ Disasters        │
└───────────────┬──────────────────────────────────────────────┘
                │
        Deterministic Tool Layer
                │
 ┌──────────────┼─────────────────────────────────────────────┐
 │              │                                             │
 ▼              ▼                                             ▼
Open-Meteo   Disaster / GIS                              Official feeds
Forecast     USGS / GDACS / EONET                       IMD RSS
AQI          RainViewer / NASA GIBS                      NOAA ADDS
Marine       OpenStreetMap
ERA5
NWP
 └───────────────────────────────────────────────────────────┘
```

---

## 9. Technology Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- Leaflet / React Leaflet
- Three.js
- Lucide React
- React Markdown

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Requests / HTTP clients
- Pytest

### Data / Geospatial

- Open-Meteo
- RainViewer
- NASA GIBS
- USGS
- NASA EONET
- GDACS
- NOAA ADDS
- OpenStreetMap

### Reliability

- Provider timeouts
- Retry + exponential backoff
- TTL caching
- Explicit fallback states
- Best-effort rate limiting
- Source timestamps
- Confidence labels
- Per-provider health checks

---

## 10. API Surface

Representative endpoints:

```text
GET  /api/health
GET  /api/providers/health
GET  /api/providers/health?live=true

GET  /api/weather/current
GET  /api/air-quality
GET  /api/nwp/status

GET  /api/imd/warnings
GET  /api/disasters/earthquakes
GET  /api/disasters/wildfires

GET  /api/satellite/info
GET  /api/climate/history

POST /api/chat/query
POST /api/language/analyze

GET  /api/agent/tools
GET  /api/agent/engine
GET  /api/voice/status
```

The API is designed so the frontend can consume structured data while preserving provider provenance.

---

## 11. Data Provenance & Safety

WeatherGPT follows a strict provenance model.

### LIVE

Data successfully retrieved from an upstream provider.

### OFFICIAL

Information directly attributed to an official source such as IMD, USGS or NOAA.

### COMPUTED

Generated by WeatherGPT from live upstream values and documented rules.

### ESTIMATED

Application/model-derived information that is not an official observation or bulletin.

### STATIC

Reference/demo dataset that does not represent current conditions.

### DEMO

Illustrative geometry or scenario created for product demonstration.

### SIMULATED

Fallback value used when an upstream provider is unavailable.

### NOT CONFIGURED

A provider or integration that has not been connected and therefore must not be represented as live.

This is a core design requirement, not merely UI wording.

---

## 12. What Is Not Falsely Claimed as Live

The following remain explicitly constrained:

- WRF — not configured as a live service
- Direct authenticated IMD APIs — not assumed without access authorization
- Protected MOSDAC datasets — not represented as directly integrated
- INCOIS official bulletins — not fabricated
- External paid LLM APIs — not required for the deterministic core
- Static climate references — labelled static
- Computed risk — labelled estimated
- Computed alerts — not official IMD bulletins
- Marine estimates — labelled model-dependent

This keeps the project technically demonstrable while maintaining honest data provenance.

---

## 13. Example User Journeys

### Citizen

**Question:**  
> "Will it rain in Vijayawada tomorrow?"

**Flow:**

```
Vijayawada
 → location resolution
 → Open-Meteo forecast
 → precipitation probability
 → hourly/daily analysis
 → plain-language answer
```

### Farmer

**Question:**  
> "Is tomorrow suitable for paddy field work?"

```
Location
 → forecast
 → rain / temperature / humidity
 → paddy rules
 → advisory
```

### Disaster awareness

**Question:**  
> "Are there any active hazards around India?"

```
IMD RSS + GDACS + USGS + computed alerts
 → provenance-aware fusion
 → severity / area / timestamp
 → GIS visualization
```

### Technical user

**Question:**  
> "Compare GFS and ECMWF for Pune."

```
Pune
 ├── GFS
 └── ECMWF IFS
       ↓
model-specific forecast data
       ↓
structured comparison
```

---

## 14. Visuals

### Technical Architecture

![WeatherGPT Technical Architecture](frontend/public/technical_approach_slide.jpg)

### Impact & Benefits

![WeatherGPT Impact and Benefits](frontend/public/impact_and_benefits_slide.png)

These visuals correspond to the project's **technical approach** and **impact/benefits** rather than presenting generic stock imagery.

---

## 15. Local Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default Vite development URL:

```text
http://localhost:5173
```

---

## 16. Environment Configuration

See:

```text
.env.example
```

The core free-provider workflow does **not require paid API keys**.

Optional provider integrations may require their own credentials. Secrets must never be committed to GitHub.

---

## 17. Testing & Quality

The repository includes automated verification for:

- Backend API behavior
- Provider/service smoke tests
- Frontend linting
- Frontend production builds
- Browser smoke testing
- Production API smoke checks
- WebSocket behavior
- Voice status
- Provider health
- Weather endpoints
- Disaster endpoints
- Satellite metadata
- Climate endpoints

Run locally:

```bash
cd backend
python -m pytest -q

cd ../frontend
npm run build
npx oxlint src
```

---

## 18. Security & Reliability

WeatherGPT applies several defensive measures:

- No secrets committed
- Explicit CORS configuration
- Provider timeout limits
- Retry/backoff
- TTL caching
- Rate limiting
- Structured API responses
- Graceful upstream failure
- Source attribution
- Confidence metadata
- Fallback states instead of silent fabrication

The application is designed so a provider outage does not automatically become a misleading user-facing claim.

---

## 19. Documentation

Detailed project documentation is available in `docs/`:

| Document | Purpose |
|---|---|
| `ARCHITECTURE.md` | System architecture |
| `DATA_SOURCES.md` | Provider inventory and provenance |
| `AI_AGENT.md` | Agent/tool design |
| `SECURITY.md` | Security model |
| `SIH_DEMO.md` | Verified demo flow |
| `SIH_PPT.md` | SIH presentation material |
| `SIH_MAPPING.md` | Requirement mapping |
| `PROVENANCE.md` | Source and licensing provenance |
| `SIH_PRESENTATION.md` | Presentation package |

---

## 20. Project Status

**Development status:** SIH 2026 demonstration-ready baseline

The repository prioritizes:

- Free public data sources
- Transparent provenance
- Deterministic tool execution
- Multilingual accessibility
- Disaster-awareness workflows
- High-quality visualization
- Graceful provider failure
- Honest limitations

No paid provider is required for the core WeatherGPT workflow.

---

## 21. Attribution & License

WeatherGPT SIH 2026 application code is independently implemented by **Muchakarla Hemanth Kumar**.

**License:** MIT — see [LICENSE](LICENSE).

Third-party packages, datasets, APIs, map tiles, fonts and external services remain subject to their respective licenses and terms.

See:

- [ATTRIBUTION.md](ATTRIBUTION.md)
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- [docs/PROVENANCE.md](docs/PROVENANCE.md)

---

## 22. Developer

**Muchakarla Hemanth Kumar**  
B.Tech CSE — AI/ML  
SRK Institute of Technology  
2024–2028

- GitHub: https://github.com/hemanthhemanth1834-bit
- LinkedIn: https://www.linkedin.com/in/hemanth-kumar-muchakarla-7974002a7/

---

<p align="center">
  <strong>WeatherGPT — Understand the weather. Understand the risk. Act with better information.</strong>
</p>


---

## Free-First SIH Coverage

The implementation follows the uploaded SIH technical approach while separating **LIVE**, **OPTIONAL**, and **DEMO/STATIC** capabilities. The core weather path does not require a paid LLM or paid weather API.

### Live/free sources

| Topic | Integration | Cost model |
|---|---|---|
| Forecast + history | Open-Meteo | Free/no key for non-commercial use |
| GFS / ECMWF / ICON | Open-Meteo model endpoints | Free/no key |
| Radar | RainViewer Weather Maps | Public/free personal & educational access |
| Satellite | NASA GIBS | Public/open Earth-observation access |
| Earthquakes | USGS FDSN | Public |
| Natural events | NASA EONET | Public |
| Global disasters | GDACS | Public feed |
| Aviation | NOAA Aviation Weather Data API | Public/rate-limited |
| Maps | OpenStreetMap | Public tiles/data subject to attribution/usage policy |
| GPS reverse geocoding | BigDataCloud client-side endpoint | Free/no key under fair-use rules |
| Official India warnings | IMD RSS/API | RSS public; API account where required |

### Advanced free/open-source adapters

- **WRF:** file-based GRIB2/NetCDF adapter is present; it becomes LIVE only when a real WRF-ARW output file is supplied.
- **NOMADS:** free NOAA GRIB2 is the fallback/open-data route for model workflows where direct GFS files are required.
- **MQTT/WIS2.0:** optional MQTT bridge using self-hosted Mosquitto.
- **PostgreSQL/PostGIS:** optional spatial database.
- **Valkey:** optional Redis-compatible cache.
- **Ollama:** optional local NLU/LLM layer.
- **PWA/offline:** browser-native service-worker architecture.
- **Three.js:** existing 3D Earth and motion-safe visual layer.

### Live visual evidence

The application now includes a **Live Evidence** panel showing public-source radar and NASA Earth-observation imagery beside provenance/status labels. This prevents a static screenshot from being presented as live telemetry.

![Technical approach](frontend/public/technical_approach_slide.jpg)

![Impact and benefits](frontend/public/impact_and_benefits_slide.png)

### UI/UX direction

WeatherGPT uses a high-level command-center design:

- glass/telemetry cards
- source-first status chips
- animated weather states
- 3D Earth visualization
- live radar/satellite evidence
- responsive navigation
- reduced-motion fallback
- PWA installation support
- clear LIVE / OFFICIAL / COMPUTED / ESTIMATED / STATIC labels

### Example user journeys

**Citizen:** “Will it rain near Vijayawada tomorrow?” → location → forecast → rain probability → warning correlation → plain-language answer.

**Farmer:** “Can I spray my paddy tomorrow?” → crop + forecast → rain/wind/humidity rules → advisory with uncertainty.

**Responder:** “Which areas have active warnings?” → official/third-party alerts → map → severity/proximity → source and timestamp.

**Technical user:** “Compare GFS, ECMWF and ICON for Pune.” → model-specific retrieval → differences → uncertainty explanation.

### Important accuracy rule

A provider is never labelled LIVE merely because an adapter exists. A source becomes LIVE only when the upstream response is actually available and the application can show its source and freshness. WRF, MQTT/WIS2.0, PostGIS, Valkey and Ollama therefore remain optional until their real runtime/feed is configured.
