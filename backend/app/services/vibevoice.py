"""Optional VibeVoice TTS bridge.

WeatherGPT remains deployable without a GPU. When VIBEVOICE_TTS_URL is
configured, this service proxies text to a separately hosted VibeVoice
server and returns audio. The bridge supports both the OpenAI-compatible
/audio/speech contract and the simple {text, speaker, language} contract.
"""

import base64
import os

import httpx
from fastapi import HTTPException
from fastapi.responses import Response

VIBEVOICE_TTS_URL = os.getenv("VIBEVOICE_TTS_URL", "").strip()
VIBEVOICE_API_KEY = os.getenv("VIBEVOICE_API_KEY", "").strip()
# Realtime 0.5B is the model intended for this integration.
VIBEVOICE_MODEL = os.getenv(
    "VIBEVOICE_MODEL", "microsoft/VibeVoice-Realtime-0.5B"
).strip()
VIBEVOICE_VOICE = os.getenv("VIBEVOICE_VOICE", "Carter").strip()
VIBEVOICE_TIMEOUT = float(os.getenv("VIBEVOICE_TIMEOUT_SECONDS", "60"))


def configured() -> bool:
    return bool(VIBEVOICE_TTS_URL)


def _openai_compatible(url: str) -> bool:
    path = url.rstrip("/").lower()
    return path.endswith("/audio/speech") or path.endswith("/v1/audio/speech")


def _decode_json_audio(data: dict) -> bytes:
    audio_b64 = data.get("audio_base64") or data.get("audio") or data.get("data")
    if not isinstance(audio_b64, str):
        raise HTTPException(status_code=502, detail="VibeVoice returned no audio")
    try:
        return base64.b64decode(audio_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Invalid VibeVoice audio payload"
        ) from exc


async def synthesize(text: str, speaker: str = "default") -> Response:
    if not configured():
        raise HTTPException(status_code=503, detail="VibeVoice TTS is not configured")

    clean = " ".join(str(text or "").split())[:4000]
    if not clean:
        raise HTTPException(status_code=422, detail="Text is required")

    headers = {"Accept": "audio/wav, audio/*, application/json"}
    if VIBEVOICE_API_KEY:
        headers["Authorization"] = f"Bearer {VIBEVOICE_API_KEY}"

    if _openai_compatible(VIBEVOICE_TTS_URL):
        payload = {
            "model": VIBEVOICE_MODEL,
            "voice": speaker or VIBEVOICE_VOICE,
            "input": clean,
            "response_format": "wav",
        }
    else:
        payload = {
            "text": clean,
            "speaker": speaker or VIBEVOICE_VOICE,
            "language": "en",
        }

    try:
        async with httpx.AsyncClient(timeout=VIBEVOICE_TIMEOUT) as client:
            upstream = await client.post(
                VIBEVOICE_TTS_URL,
                json=payload,
                headers=headers,
            )
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"VibeVoice upstream unavailable: {exc}",
        ) from exc

    if upstream.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"VibeVoice upstream returned HTTP {upstream.status_code}",
        )

    content_type = upstream.headers.get("content-type", "audio/wav")
    if "application/json" in content_type:
        audio = _decode_json_audio(upstream.json())
        return Response(content=audio, media_type="audio/wav")

    media_type = content_type.split(";")[0].strip() or "audio/wav"
    return Response(content=upstream.content, media_type=media_type)
