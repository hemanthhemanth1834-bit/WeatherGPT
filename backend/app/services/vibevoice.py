"""Free online TTS bridge with optional VibeVoice support.

VibeVoice remains supported when VIBEVOICE_TTS_URL is configured. For the
free production path, WeatherGPT automatically uses edge-tts (Microsoft
Edge's online neural TTS service) when VibeVoice is not configured, with
browser SpeechSynthesis still available as the frontend fallback.
"""

import base64
import io
import os

import httpx
from fastapi import HTTPException
from fastapi.responses import Response

VIBEVOICE_TTS_URL = os.getenv("VIBEVOICE_TTS_URL", "").strip()
VIBEVOICE_API_KEY = os.getenv("VIBEVOICE_API_KEY", "").strip()
VIBEVOICE_MODEL = os.getenv(
    "VIBEVOICE_MODEL", "microsoft/VibeVoice-Realtime-0.5B"
).strip()
VIBEVOICE_VOICE = os.getenv("VIBEVOICE_VOICE", "Carter").strip()
VIBEVOICE_TIMEOUT = float(os.getenv("VIBEVOICE_TIMEOUT_SECONDS", "60"))

# Free Edge neural voice used when no VibeVoice server is configured.
EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-US-ChristopherNeural").strip()
EDGE_TTS_VOICES = {
    "en": "en-IN-NeerjaNeural", "auto": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural", "mr": "mr-IN-AarohiNeural",
    "ta": "ta-IN-PallaviNeural", "te": "te-IN-ShrutiNeural",
    "bn": "bn-IN-TanishaaNeural", "gu": "gu-IN-DhwaniNeural",
    "pa": "pa-IN-OjasNeural", "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural", "or": "or-IN-SubhasiniNeural",
}


def configured() -> bool:
    """Return whether a server-side TTS provider is available."""
    if VIBEVOICE_TTS_URL:
        return True
    try:
        import edge_tts
        return True
    except ImportError:
        return False


def provider() -> str:
    return "VibeVoice-Realtime-0.5B" if VIBEVOICE_TTS_URL else "Edge-TTS"


def _openai_compatible(url: str) -> bool:
    path = url.rstrip("/").lower()
    return path.endswith("/audio/speech") or path.endswith("/v1/audio/speech")


def _decode_json_audio(data: dict) -> bytes:
    audio_b64 = data.get("audio_base64") or data.get("audio") or data.get("data")
    if not isinstance(audio_b64, str):
        raise HTTPException(status_code=502, detail="TTS returned no audio")
    try:
        return base64.b64decode(audio_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Invalid TTS audio payload"
        ) from exc


async def _edge_tts(text: str, language: str = "en") -> Response:
    """Synthesize MP3 using edge-tts without an API key or GPU."""
    try:
        import edge_tts

        voice = EDGE_TTS_VOICES.get((language or "en").lower(), EDGE_TTS_VOICE)
        communicate = edge_tts.Communicate(text, voice)
        audio = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio.write(chunk.get("data", b""))
        content = audio.getvalue()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Edge TTS unavailable: {exc}",
        ) from exc

    if not content:
        raise HTTPException(status_code=502, detail="Edge TTS returned no audio")
    return Response(content=content, media_type="audio/mpeg")


async def synthesize(text: str, speaker: str = "default", language: str = "en") -> Response:
    clean = " ".join(str(text or "").split())[:4000]
    if not clean:
        raise HTTPException(status_code=422, detail="Text is required")

    # Keep VibeVoice as an optional higher-priority provider when supplied.
    if not VIBEVOICE_TTS_URL:
        return await _edge_tts(clean, language)

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
