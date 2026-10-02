# WeatherGPT VibeVoice bridge

This optional service runs VibeVoice-Realtime-0.5B outside the main Vercel/FastAPI deployment. The main WeatherGPT backend only needs the URL of this service.

## Official setup

Use the Microsoft VibeVoice repository and its realtime installation instructions. The official realtime demo is documented in docs/vibevoice-realtime-0.5b.md.

## WeatherGPT connection

Set on the WeatherGPT backend:

    VIBEVOICE_TTS_URL=https://YOUR-VIBEVOICE-SERVICE/tts

Optionally set VIBEVOICE_API_KEY if your private bridge requires authentication.

The WeatherGPT frontend tries VibeVoice for English replies and automatically falls back to browser speech when VibeVoice is unavailable or another language is selected.
