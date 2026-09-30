# ATTRIBUTION & RIGHTS NOTE — WeatherGPT (SIH 2026)

## Project

WeatherGPT — AI Weather Intelligence. SIH 2026 implementation by **Muchakarla Hemanth Kumar**
(B.Tech CSE – AI/ML, SRK Institute of Technology, 2024–2028).

## Upstream investigation result

**UPSTREAM REPOSITORY COULD NOT BE VERIFIED.**

- The work started from a downloaded archive (`WeatherGPT-main.zip`, files dated 02-09-2026).
- The archive contains **no LICENSE, NOTICE, copyright, author, or repository-URL metadata**,
  no `.git` history, and no package `author`/`repository` fields.
- A same-named public repository (`Kavin1467/WeatherGPT`, same SIH problem statement 26068)
  was found via web search, but its structure (vanilla-JS frontend, `Prototype/` folder,
  Windows `.exe`, flat `backend/main.py`) does **not** match this archive
  (React + Vite frontend, modular `backend/app/...`, `api/index.py`, `vercel.json`).
  It therefore could **not** be verified as the exact upstream, and no URL is claimed here
  as the source of this code.

## What this means

1. The original authors and the original license are **unknown**.
2. Redistribution rights are **unclear**. Nothing in the archive grants permission
   to copy, modify, or redistribute the inherited portions.
3. No original copyright/attribution notices were found in the archive, so none were
   removed. If the upstream is later identified, its required notices must be restored
   and this file updated.
4. The SIH developer's name is used **only** for the modifications listed below —
   no claim is made that the inherited code was originally written by
   Muchakarla Hemanth Kumar.

## Inherited components (from the downloaded archive, authors unknown)

- React + Vite + Tailwind + Leaflet frontend shell, dashboard, chat UI, GIS map,
  alert center, climate/agri/aviation/marine/city-comparison views
- FastAPI backend: weather/geocoding integration, multilingual rule-based chat engine
  (`llm_engine.py`), CAP-style alert scanning, Agromet/aviation/marine/climate services
- Vercel deployment configuration (`vercel.json`, `api/index.py`)

## Modifications by Muchakarla Hemanth Kumar (SIH 2026)

Round 1: deterministic risk engine, NWP interface (GFS LIVE / WRF NOT CONFIGURED),
satellite module, Indian-sources registry, agent tool registry, source-transparency
layer, TTL caching, env-based config, saved preferred locations, About/SIH surfaces,
"WeatherGPT — AI Weather Intelligence" rebranding, README rewrite, `.env.example`, tests.

Round 2 (finalization): CORS wildcard-with-credentials fix, per-tab code-splitting,
removal of unused deps (`chart.js`, `react-chartjs-2`, `canvas-confetti`),
honesty labels (STATIC aviation, INCOIS-estimate marine, non-official alerts/agri),
user-visible error states, voice-fallback messaging, accessibility labels,
crash fixes (missing `onAskAI` props), `ATTRIBUTION.md` / `THIRD_PARTY_NOTICES.md`.

## Permission required before public redistribution

Confirm the upstream repository URL and its license (or obtain the organisers'
guidance) before pushing the full copied source to any public repository.
See `README.md → License` and `THIRD_PARTY_NOTICES.md`.
