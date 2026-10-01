# AI AGENT — WeatherGPT SIH 2026

## Pipeline

```
USER QUERY → INTENT DETECTION → LOCATION EXTRACTION → TOOL SELECTION
→ LIVE DATA RETRIEVAL → SOURCE/EVIDENCE → GROUNDED RESPONSE → PROVENANCE
```

1. **Language** — `services/langid.py`: Unicode script ranges plus
   Romanized weather-vocabulary scoring (Hinglish-style) with confidence;
   explicit UI override wins. Analysis at `POST /api/language/analyze`.
2. **Location** — gazetteer → native-script map → `in/at/near <Place>` →
   fallback place. GPS path resolves via reverse-geocode first.
3. **Intent** — compare / agri / aviation / marine / alerts / climate /
   travel / AQI / default weather (keyword rules, inspectable in
   `backend/app/services/chat.py`).
4. **Tools** — deterministic functions only (see `GET /api/agent/tools`,
   14 tools). Figures originate here, never in prose.
5. **Response** — per-language template filled with tool numbers + speech
   text + structured payload + source line. On tool failure: honest
   "data unavailable" reply (never a 500, never a guess).

## Hallucination prevention (tested)

- `test_no_hallucinated_numbers`: every °C figure in a reply must occur in
  the tool payload, else the test fails.
- `test_no_unsupported_place_invention`: unknown places resolve through
  geocode/fallback with valid coordinates only.
- `test_chat_never_500s_on_tool_failure`: broken tools yield an honest
  error reply with no fabricated payload.
- Query length capped at 500 chars (422 beyond).

## Optional LLM layer

Adapters for Gemini / Groq / OpenRouter / OpenAI-compatible / Ollama
(`services/llm.py`), priority: configured provider → deterministic engine.
Keys live only in server env (`/api/agent/engine` reports status, never
values). No key configured in this deployment → RULE-BASED TOOL-GROUNDED.
`/api/assistant/explain` grounds any LLM wording in live context (mock-tested).
