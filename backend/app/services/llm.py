"""Optional LLM adapters. Original implementation.

Priority: configured provider -> deterministic WeatherGPT engine.
The chat core NEVER depends on an LLM: without credentials every call
falls back to deterministic tools. Keys live only in server environment
variables — never in frontend code, never committed.
"""

import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import requests

from .http import http_get, http_post

PROVIDER_ORDER = ["openai-compatible", "gemini", "groq", "openrouter", "ollama"]


def configured_providers() -> List[str]:
    """Providers with credentials present in this environment."""
    found = []
    if os.getenv("OPENAI_API_KEY"):
        found.append("openai-compatible")
    if os.getenv("GEMINI_API_KEY"):
        found.append("gemini")
    if os.getenv("GROQ_API_KEY"):
        found.append("groq")
    if os.getenv("OPENROUTER_API_KEY"):
        found.append("openrouter")
    ollama_host = os.getenv("OLLAMA_HOST", "")
    if ollama_host:
        found.append("ollama")
    return found


def selected_provider() -> Optional[str]:
    """Return the provider the explainer would try first, or None.

    Configured is not the same as active: chat answers remain deterministic
    until the optional explanation layer is enabled. This function only
    answers "which configured provider would be tried first?".
    """
    available = configured_providers()
    preference = os.getenv("AI_PROVIDER", "auto").lower()
    if preference in ("none", ""):
        return None
    if preference not in ("auto",):
        return preference if preference in available else None
    return next((name for name in PROVIDER_ORDER if name in available), None)


def _model_for(provider: Optional[str]) -> Optional[str]:
    if provider == "openai-compatible":
        return os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if provider == "gemini":
        return os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    if provider == "groq":
        return os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if provider == "openrouter":
        return os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    if provider == "ollama":
        return os.getenv("OLLAMA_MODEL", "llama3.1")
    return None


def _probe_provider(provider: str, timeout: float = 3.0) -> Dict[str, Any]:
    """Short, secret-free liveness check for one configured provider."""
    try:
        if provider == "ollama":
            host = os.getenv("OLLAMA_HOST", "")
            response = http_get(
                f"{host.rstrip('/')}/api/tags", timeout=timeout, retries=0
            )
        elif provider == "gemini":
            response = http_get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                headers={"x-goog-api-key": os.getenv("GEMINI_API_KEY", "")},
                timeout=timeout,
                retries=0,
            )
        elif provider == "groq":
            response = http_get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY', '')}"},
                timeout=timeout,
                retries=0,
            )
        elif provider == "openrouter":
            response = http_get(
                "https://openrouter.ai/api/v1/models",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY', '')}"
                },
                timeout=timeout,
                retries=0,
            )
        else:
            response = http_get(
                f"{os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')}/models",
                headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY', '')}"},
                timeout=timeout,
                retries=0,
            )
        if response.status_code == 200:
            return {"status": "HEALTHY", "http_status": 200}
        return {
            "status": "UNHEALTHY",
            "http_status": response.status_code,
            "error": f"HTTP {response.status_code}",
        }
    except Exception as exc:
        return {"status": "UNHEALTHY", "http_status": None, "error": type(exc).__name__}


def provider_status(check_live: bool = False) -> Dict[str, Any]:
    """Separate configured, selected, active, health and fallback states."""
    available = configured_providers()
    selected = selected_provider()
    health = "NOT_CHECKED"
    health_detail: Dict[str, Any] = {}
    if selected and check_live:
        health_detail = health_check(selected)
        health = health_detail["status"]
    elif not selected:
        health = "NOT_CONFIGURED"
    return {
        "configured": bool(available),
        "configured_providers": available,
        "selected_provider": selected,
        "selected_model": _model_for(selected),
        "active_engine": "RULE-BASED TOOL-GROUNDED",
        "active_inference": "DETERMINISTIC",
        "health": health,
        "health_detail": health_detail,
        "fallback": "deterministic WeatherGPT tools (always available)",
        "live_check": bool(check_live),
        "note": (
            "Configured means credentials are present. Active means the engine "
            "used for this answer. Health is reported only when checked."
        ),
    }


class LLMError(Exception):
    """Base class for secret-free LLM runtime errors."""

    code = "UNAVAILABLE"


class LLMNotConfigured(LLMError):
    code = "NOT_CONFIGURED"


class LLMTimeout(LLMError):
    code = "TIMEOUT"


class LLMAuthError(LLMError):
    code = "AUTH"


class LLMRateLimit(LLMError):
    code = "RATE_LIMIT"


class LLMBadResponse(LLMError):
    code = "BAD_RESPONSE"


class LLMUnavailable(LLMError):
    code = "UNAVAILABLE"


def _classify_exception(exc: Exception) -> LLMError:
    """Map provider/transport failures to stable, secret-free error classes."""
    if isinstance(exc, LLMError):
        return exc
    if isinstance(exc, requests.exceptions.Timeout):
        return LLMTimeout("provider timeout")
    if isinstance(exc, requests.exceptions.HTTPError):
        status = getattr(exc.response, "status_code", None)
        if status in (401, 403):
            return LLMAuthError(f"HTTP {status}")
        if status == 429:
            return LLMRateLimit("HTTP 429")
        return LLMUnavailable(f"HTTP {status}")
    match = re.search(r"HTTP (\d{3})", str(exc))
    if match:
        status = int(match.group(1))
        if status in (401, 403):
            return LLMAuthError(f"HTTP {status}")
        if status == 429:
            return LLMRateLimit("HTTP 429")
        return LLMUnavailable(f"HTTP {status}")
    if isinstance(exc, requests.exceptions.ConnectionError):
        return LLMUnavailable("connection failed")
    if isinstance(exc, (KeyError, IndexError, TypeError, ValueError)):
        return LLMBadResponse(type(exc).__name__)
    return LLMUnavailable(type(exc).__name__)


def _openai_compatible(
    prompt: str, system: str, base_url: str, key: str, model: str, timeout: float = 25
) -> Dict[str, Any]:
    response = http_post(
        f"{base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "temperature": 0.2,
            "max_tokens": 400,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        },
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    try:
        text = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMBadResponse("OpenAI-compatible response shape") from exc
    usage = data.get("usage") or {}
    return {"text": text, "tokens": usage.get("total_tokens")}


def _gemini(prompt: str, system: str, key: str, timeout: float = 25) -> Dict[str, Any]:
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    response = http_post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        json={
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400},
        },
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMBadResponse("Gemini response shape") from exc
    usage = data.get("usageMetadata") or {}
    return {"text": text, "tokens": usage.get("totalTokenCount")}


def _ollama(prompt: str, system: str, host: str, timeout: float = 60) -> Dict[str, Any]:
    response = http_post(
        f"{host.rstrip('/')}/api/generate",
        json={
            "model": os.getenv("OLLAMA_MODEL", "llama3.1"),
            "system": system,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 400},
        },
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    text = data.get("response", "").strip()
    if not text:
        raise LLMBadResponse("Ollama returned an empty response")
    tokens = None
    if isinstance(data.get("eval_count"), int) or isinstance(
        data.get("prompt_eval_count"), int
    ):
        tokens = int(data.get("eval_count") or 0) + int(
            data.get("prompt_eval_count") or 0
        )
    return {"text": text, "tokens": tokens}


def _invoke(
    provider: str, prompt: str, system: str, timeout: float = 25
) -> Dict[str, Any]:
    """Run one provider and attach latency. Raises classified LLMError."""
    start = time.perf_counter()
    try:
        if provider == "openai-compatible":
            result = _openai_compatible(
                prompt,
                system,
                os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                os.getenv("OPENAI_API_KEY", ""),
                os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                timeout=timeout,
            )
        elif provider == "gemini":
            result = _gemini(
                prompt, system, os.getenv("GEMINI_API_KEY", ""), timeout=timeout
            )
        elif provider == "groq":
            result = _openai_compatible(
                prompt,
                system,
                "https://api.groq.com/openai/v1",
                os.getenv("GROQ_API_KEY", ""),
                os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                timeout=timeout,
            )
        elif provider == "openrouter":
            result = _openai_compatible(
                prompt,
                system,
                "https://openrouter.ai/api/v1",
                os.getenv("OPENROUTER_API_KEY", ""),
                os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
                timeout=timeout,
            )
        elif provider == "ollama":
            result = _ollama(
                prompt, system, os.getenv("OLLAMA_HOST", ""), timeout=timeout
            )
        else:
            raise LLMNotConfigured(f"unknown provider: {provider}")
    except Exception as exc:
        raise _classify_exception(exc) from exc
    return {
        "text": result["text"],
        "tokens": result.get("tokens"),
        "latency_ms": round((time.perf_counter() - start) * 1000),
    }


def health_check(
    provider: Optional[str] = None, timeout: float = 3.0
) -> Dict[str, Any]:
    """Short provider health probe with latency and stable error classes."""
    selected = (provider or selected_provider() or "").strip()
    available = configured_providers()
    base: Dict[str, Any] = {
        "provider": selected or None,
        "model": _model_for(selected) if selected else None,
        "configured": bool(selected and selected in available),
        "configured_providers": available,
        "latency_ms": None,
        "http_status": None,
        "error": None,
    }
    if not selected:
        return {
            **base,
            "status": "NOT_CONFIGURED",
            "note": "No LLM provider is configured.",
        }
    if selected not in available:
        return {
            **base,
            "status": "NOT_CONFIGURED",
            "error": "provider not configured",
            "note": "The requested provider has no credentials or host.",
        }
    start = time.perf_counter()
    probe = _probe_provider(selected, timeout=timeout)
    latency = round((time.perf_counter() - start) * 1000)
    status = str(probe.get("status", "UNAVAILABLE")).upper()
    http_status = probe.get("http_status")
    error = probe.get("error")
    if status == "HEALTHY":
        error = None
    elif http_status in (401, 403):
        status = "AUTH"
    elif http_status == 429:
        status = "RATE_LIMIT"
    elif error and "timeout" in str(error).lower():
        status = "TIMEOUT"
    else:
        status = "UNAVAILABLE"
    return {
        **base,
        "status": status,
        "latency_ms": latency,
        "http_status": http_status,
        "error": error,
        "note": "Health is a short liveness probe; it does not measure answer quality.",
    }


def _numeric_tokens(value: Any) -> set:
    text = json.dumps(value, ensure_ascii=False, default=str)
    return {_canonical_number(token) for token in re.findall(r"-?\d+(?:\.\d+)?", text)}


def _canonical_number(token: str) -> str:
    try:
        return f"{float(token):g}"
    except (TypeError, ValueError):
        return token


def _deterministic(topic: str, facts: Any) -> str:
    return (
        f"Deterministic brief (no LLM used): {topic}. "
        f"Validated facts: {json.dumps(facts, ensure_ascii=False, default=str)[:700]}"
    )


def explain_grounded(
    topic: str,
    validated_facts: Any,
    *,
    provider: Optional[str] = None,
    timeout: float = 25,
) -> Dict[str, Any]:
    """Explain validated facts, rejecting any number not present in them.

    The deterministic answer remains authoritative. This layer only supplies
    wording, never weather values, warnings, locations, timestamps or sources.
    """
    deterministic = _deterministic(topic, validated_facts)
    available = configured_providers()
    selected = (provider or selected_provider() or "").strip()
    if not selected:
        return {
            "explanation": deterministic,
            "engine": "RULE-BASED (deterministic)",
            "provider": None,
            "status": "NOT_CONFIGURED",
            "grounded": True,
            "latency_ms": None,
            "tokens": None,
            "error": None,
            "note": "No LLM configured; deterministic brief from validated facts.",
        }
    if selected not in available:
        return {
            "explanation": deterministic,
            "engine": "RULE-BASED (deterministic)",
            "provider": selected,
            "status": "NOT_CONFIGURED",
            "grounded": True,
            "latency_ms": None,
            "tokens": None,
            "error": "provider not configured",
            "note": "Requested provider is not configured; deterministic brief used.",
        }
    if provider:
        order = [selected]
    else:
        order = [selected] + [
            name for name in PROVIDER_ORDER if name in available and name != selected
        ]
    system = (
        "You are a careful weather explainer. Use ONLY the validated facts "
        "supplied. Do not introduce any number, timestamp, warning, location, "
        "model run, or source that is not present. Explain uncertainty and "
        "limitations. Write one short paragraph under 120 words, no lists."
    )
    prompt = (
        f"Topic: {topic}\n"
        f"Validated facts (JSON):\n{json.dumps(validated_facts, ensure_ascii=False, default=str)[:2000]}"
    )
    last_error: Optional[LLMError] = None
    for name in order:
        try:
            result = _invoke(name, prompt, system, timeout=timeout)
        except LLMError as exc:
            last_error = exc
            continue
        allowed = _numeric_tokens(validated_facts)
        used = _numeric_tokens(result["text"])
        invented = sorted(used - allowed)
        if invented:
            return {
                "explanation": deterministic,
                "engine": "RULE-BASED (deterministic)",
                "provider": name,
                "status": "GROUNDING_FAILED",
                "grounded": False,
                "latency_ms": result["latency_ms"],
                "tokens": result.get("tokens"),
                "error": "LLM introduced numbers absent from validated facts",
                "rejected_numbers": invented,
                "note": "LLM wording rejected; deterministic brief from validated facts used.",
            }
        return {
            "explanation": result["text"],
            "engine": f"LLM ({name})",
            "provider": name,
            "model": _model_for(name),
            "status": "OK",
            "grounded": True,
            "latency_ms": result["latency_ms"],
            "tokens": result.get("tokens"),
            "error": None,
            "note": "Wording by LLM; all figures from validated facts.",
        }
    error = last_error or LLMUnavailable("no provider available")
    return {
        "explanation": deterministic,
        "engine": "RULE-BASED (deterministic)",
        "provider": selected,
        "status": error.code,
        "grounded": True,
        "latency_ms": None,
        "tokens": None,
        "error": error.code,
        "note": "LLM unavailable; deterministic brief from validated facts used.",
    }


def explain(topic: str, context: str) -> Dict[str, Any]:
    """Backward-compatible wrapper around grounded explanation."""
    return explain_grounded(topic, {"context": context[:2000]})
