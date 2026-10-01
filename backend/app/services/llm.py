"""Optional LLM adapters. Original implementation.

Priority: configured provider -> deterministic WeatherGPT engine.
The chat core NEVER depends on an LLM: without credentials every call
falls back to deterministic tools. Keys live only in server environment
variables — never in frontend code, never committed.
"""
import os
from typing import Any, Dict, List, Optional

import requests


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


def _openai_compatible(prompt: str, system: str, base_url: str, key: str,
                       model: str) -> str:
    response = requests.post(
        f"{base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "temperature": 0.2, "max_tokens": 400,
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": prompt}]},
        timeout=25,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def _gemini(prompt: str, system: str, key: str) -> str:
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        json={"system_instruction": {"parts": [{"text": system}]},
              "contents": [{"parts": [{"text": prompt}]}],
              "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400}},
        timeout=25,
    )
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _ollama(prompt: str, system: str, host: str) -> str:
    response = requests.post(
        f"{host.rstrip('/')}/api/generate",
        json={"model": os.getenv("OLLAMA_MODEL", "llama3.1"), "system": system,
              "prompt": prompt, "stream": False,
              "options": {"temperature": 0.2, "num_predict": 400}},
        timeout=60,
    )
    response.raise_for_status()
    return response.json().get("response", "").strip()


def explain(topic: str, context: str) -> Dict[str, Any]:
    """Explain a weather topic using live context.

    Tries, in order: explicit AI_PROVIDER, any configured key, Ollama host.
    Falls back to the deterministic brief (always works).
    """
    deterministic = (
        f"Deterministic brief (no LLM configured): {topic}. "
        f"Live context: {context[:600]}"
    )
    preference = os.getenv("AI_PROVIDER", "auto").lower()
    order: List[str] = []
    if preference not in ("auto", "", "none"):
        order.append(preference)
    order += ["openai-compatible", "gemini", "groq", "openrouter", "ollama"]
    available = set(configured_providers())
    system = ("You are a careful weather explainer. Use ONLY the supplied live "
              "context. Never invent readings, warnings, or cyclone positions. "
              "Keep it under 150 words.")
    prompt = f"Topic: {topic}\nLive context: {context[:2000]}"
    for name in order:
        if name not in available:
            continue
        try:
            if name == "openai-compatible":
                text = _openai_compatible(prompt, system, os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"), os.getenv("OPENAI_API_KEY", ""), os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
            elif name == "gemini":
                text = _gemini(prompt, system, os.getenv("GEMINI_API_KEY", ""))
            elif name == "groq":
                text = _openai_compatible(prompt, system, "https://api.groq.com/openai/v1", os.getenv("GROQ_API_KEY", ""), os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
            elif name == "openrouter":
                text = _openai_compatible(prompt, system, "https://openrouter.ai/api/v1", os.getenv("OPENROUTER_API_KEY", ""), os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"))
            elif name == "ollama":
                text = _ollama(prompt, system, os.getenv("OLLAMA_HOST", ""))
            else:
                continue
            if text:
                return {"explanation": text, "engine": f"LLM ({name})",
                        "grounded": True,
                        "note": "Wording by LLM; all figures from live context."}
        except Exception:
            continue
    return {"explanation": deterministic, "engine": "RULE-BASED (deterministic)",
            "grounded": True,
            "note": "No LLM configured; deterministic brief from live data."}
