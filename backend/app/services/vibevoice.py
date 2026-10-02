"""Optional VibeVoice TTS bridge.

WeatherGPT itself remains deployable without a GPU. When VIBEVOICE_TTS_URL is
configured, this service proxies text to a separately hosted VibeVoice
Realtime 0.5B server and returns audio. When it is not configured, the
frontend continues using browser-native speech synthesis.
"""

import base64
import os

import httpx
from fastapi import HTTPException
from fastapi.responses import Response

VIBEVOICE_TTS_URL = os.getenv("VIBEVOICE_TTS_URL", "").strip()
VIBEVOICE_API_KEY = os.getenv("VIBEVOICE_API_KEY", "").strip()


def configured() -> bool:
    return bool(VIBEVOICE_TTS_URL)


async def synthesize(text: str, speaker: str = "Carter") -> Response:
    if not configured():
        raise HTTPException(status_code=503, detail="VibeVoice TTS is not configured")

    clean = " ".join(str(text or "").split())[:4000]
    if not clean:
        raise HTTPException(status_code=422, detail="Text is required")

    headers = {"Accept": "audio/wav, audio/*, application/json"}
    if VIBEVOICE_API_KEY:
        headers["Authorization"] = f"Bearer {VIBEVOICE_API_KEY}"

    payload = {"text": clean, "speaker": speaker or "Carter", "language": "en"}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            upstream = await client.post(VIBEVOICE_TTS_URL, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"VibeVoice upstream unavailable: {exc}") from exc

    if upstream.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"VibeVoice upstream returned HTTP {upstream.status_code}")

    content_type = upstream.headers.get("content-type", "audio/wav")
    if "application/json" in content_type:
        data = upstream.json()
        audio_b64 = data.get("audio_base64") or data.get("audio")
        if not isinstance(audio_b64, str):
            raise HTTPException(status_code=502, detail="VibeVoice returned no audio")
        try:
            audio = base64.b64decode(audio_b64)
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Invalid VibeVoice audio payload") from exc
        return Response(content=audio, media_type="audio/wav")

    return Response(content=upstream.content, media_type=content_type.split(";")[0])
