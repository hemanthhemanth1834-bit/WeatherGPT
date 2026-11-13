# WeatherGPT AI Assistant — Repository-Specific Upgrade Checklist

**Status:** Planning only. No application source has been changed for this specification.
**Repository:** `wg-navclean-recovered`
**Scope:** The AI Weather Assistant at `#/ai-assistant`, its FastAPI chat backend, and the shared provider/provenance layers it depends on.
**Non-goals:** Redesigning the nine existing modules, replacing React/Vite/FastAPI, adding mandatory paid services, committing, pushing, or deploying.

---

## 0. Evidence from the local audit

Full-page screenshots (open in the Review pane):

- `weathergpt-assistant-desktop.jpeg` — empty assistant workspace at 1440×960.
- `weathergpt-assistant-audit.jpeg` — after “Will it rain heavily tomorrow in Vijayawada? Is travelling safe?”

### Confirmed defects

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| A1 | P1 | The long answer card is clipped mid-sentence inside a fixed-height scroll region and is not scrolled into view. | `.wg-ai-message-list` height 546 px; last message height 472 px and bottom 1213 px; composer begins at 1154 px. `ReferenceChrome.css` sets `.wg-ai-chat-column { max-height: calc(100vh - 170px) }`. |
| A2 | P1 | The UI always claims `LLM NOT CONFIGURED`, while `/api/agent/engine` reports `llm_configured: true` and `configured_providers: ["openai-compatible"]`. | `WeatherChat.jsx` line 222 hardcodes the chip; `providers.py` lines 141–142 hardcode `NOT_CONFIGURED`; live API response disagrees. |
| A3 | P1 | “What is the official warning?” returns a normal weather card, an empty “Alerts (computed, not official)” section, and no official IMD feed lookup. | `chat.py` alert block; `imd_rss.py` exists and `/api/alerts/imd` is routed but unused by chat. |
| A4 | P1 | “hello” returns a full weather card because `answer()` resolves location and fetches weather before intent classification. | Live `POST /api/chat/query` with `hello` returned `structured_weather: true`. |
| A5 | P2 | Comparison without a parsed pair silently compares Mumbai and Delhi. | `chat.py` `extract_pair()` fallback. |
| A6 | P2 | “Travel safety: 95/100” appears without formula, inputs, thresholds, or limitations. | `chat.py` `_compare()`; `travel.py` has the formula but the reply does not expose it. |
| A7 | P2 | Alerts can fall back to unrelated reference stations when no local alert exists. | `chat.py` calls `active_alerts()` without a state filter. |
| A8 | P2 | No stop, regenerate, copy, export, new-chat, or clear-chat controls; messages are in-memory only. | `WeatherChat.jsx`; `App.jsx` `ask()`. |
| A9 | P2 | Composer is a single-line input; no auto-resize or Enter/Shift+Enter contract. | `WeatherChat.jsx` composer. |
| A10 | P2 | `ChatResponse` has no provenance, source list, freshness, confidence, limitations, or tool trace. | `backend/app/models.py` lines 162–182. |
| A11 | P2 | Condition names are translated only for hi/mr/ta/te; other supported languages show English conditions. | `chat.py` translation table. |
| A12 | P3 | Ollama defaults to `llama3.1`, not the user’s local Qwen model; no health, latency, or token reporting. | `llm.py` `_ollama()` and `explain()`. |
| A13 | P3 | `agent_tools.py` is metadata only; there is no validated executor. | `agent_tools.py` (31 lines). |

### What is already good and must be preserved

- React 19 + Vite frontend; FastAPI backend; Leaflet maps; Three.js visualisation; existing chart components.
- `ModuleProvenance`, `ErrorBoundary`, `ModuleSkeleton`, request cancellation for weather/location.
- `ReactMarkdown` + `remarkGfm` with no raw HTML; safe Markdown baseline.
- Backend request IDs, security headers, readiness endpoint, CORS exposure.
- Keyless Open-Meteo, RainViewer, NASA GIBS, IMD RSS integrations.
- Deterministic, tool-grounded chat path that works without any LLM key.
- All nine modules, routes, and existing API endpoints.

---

## 1. Engineering rules for this upgrade

1. **LLMs never produce weather numbers.** Tools retrieve/calculate; validators check; the LLM may only explain validated values.
2. **No silent substitution.** A failed live request must return an explicit `UNAVAILABLE`/`STALE` state, never an old or estimated value presented as live.
3. **Official means official.** Computed risk is never labelled a warning. Preserve issuer, area, issue time, expiry, instructions, and source URL.
4. **Every weather answer carries provenance.** Source, data type, valid time, retrieval time, freshness, and limitations.
5. **Incremental and reversible.** Each numbered increment below must build, lint, and pass its focused tests before the next begins.
6. **No new paid dependency.** Prefer existing packages. Do not add shadcn/Radix/Motion/Recharts wholesale; the current design system and `lucide-react` are sufficient.
7. **No commit, push, merge, or deploy without explicit approval.**

---

## 2. Increment 1 — Make engine status truthful

**Goal:** Remove the hardcoded `LLM NOT CONFIGURED` claim and make provider status agree across UI, API, and health table.

### Modify

- `backend/app/services/providers.py`
  - Replace the fixed `{"name": "LLM provider", ..., "fixed": "NOT_CONFIGURED"}` row.
  - Derive status from `llm.configured_providers()` and `AI_PROVIDER`.
  - Report `CONFIGURED` with provider names; `NOT_CONFIGURED` only when the list is empty.
  - Do not expose keys, base URLs containing credentials, or model secrets.
- `backend/app/services/llm.py`
  - Add `provider_status() -> dict` returning configured providers, selected provider, model name, and whether a live health check was attempted.
  - Add a bounded `health_check()` (short timeout) used only by the explicit engine endpoint, not on every chat request.
- `backend/app/main.py`
  - Extend `/api/agent/engine` with the `provider_status()` payload while keeping existing keys for compatibility.
- `frontend/src/services/api.js`
  - Reuse `fetchEngineStatus()`; add a typed fallback result on network error.
- `frontend/src/App.jsx`
  - Fetch engine status once on mount and after a failed chat; pass `engineStatus` to `WeatherChat`.
- `frontend/src/components/WeatherChat.jsx`
  - Replace the hardcoded chip with a derived label:
    - LLM configured: `ENGINE: TOOL-GROUNDED + {provider}`
    - No LLM: `ENGINE: DETERMINISTIC TOOL-GROUNDED`
    - Status fetch failed: `ENGINE: TOOL-GROUNDED (STATUS UNAVAILABLE)`
  - Add an accessible title/tooltip explaining that weather values always come from tools.

### Add tests

- `backend/tests/test_providers.py` — assert LLM row matches `configured_providers()` with and without env keys.
- `backend/tests/test_api.py` — `/api/agent/engine` keeps existing keys and adds provider status.
- `frontend/tests/assistant_workspace.py` — chip text matches the API response, not a constant.

### Acceptance

- With no AI keys: UI says deterministic; health table says `NOT_CONFIGURED`; chat still works.
- With `OPENAI_API_KEY` set: UI and health table both report the provider.
- No secret appears in any response or DOM.

---

## 3. Increment 2 — Conversation lifecycle and composer

**Goal:** Give the assistant a real conversation workspace without changing the backend contract.

### Modify

- `frontend/src/App.jsx`
  - Add `chatAbortRef = useRef(null)`.
  - In `ask()`, abort any in-flight chat, create a new `AbortController`, pass `signal` to `sendChatQuery`.
  - Ignore `AbortError`; never render an error bubble for a user-cancelled request.
  - Track `chatBusy`, `lastUserQuery`, and `lastReply` for regenerate.
  - Persist messages and active location in `sessionStorage` under a versioned key (e.g. `weathergpt.chat.v1`); clear on New chat. Do not send history to the server in this increment.
- `frontend/src/services/api.js`
  - `sendChatQuery(query, persona, language, locationName, { signal } = {})`.
  - Preserve the existing payload and 20 s default unless a caller overrides it.
- `frontend/src/components/WeatherChat.jsx`
  - Replace the single-line `<input>` with an auto-resizing `<textarea>` capped at ~6 rows.
  - Enter sends; Shift+Enter inserts a newline; Escape cancels an active request.
  - Add controls: Stop (visible while busy), Regenerate, Copy answer, Copy sources, Export `.md`, New chat, Clear chat with confirmation.
  - Keep the mic button and existing speech engine; disable it while busy and announce unsupported browsers accurately.
  - Scroll the newest message into view after render and after streaming/loading completes.
  - Use `aria-live="polite"` for the busy state and `role="log"` for the message list.
- `frontend/src/components/ReferenceChrome.css` and `frontend/src/styles/module-cinematic.css`
  - Remove the fixed `max-height: calc(100vh - 170px)` clipping behavior for the assistant column.
  - Let the message list grow with the page, or use a viewport-height flex layout where the composer is always visible and the list scrolls independently.
  - Add a visible focus ring, disabled styles, and a two-line mobile composer.

### Add tests

- `frontend/tests/assistant_conversation.py` (new, Playwright):
  - Ask a question; assert the answer is fully visible (last message bottom ≤ list bottom, or page scrolled to it).
  - Stop a request; assert no error bubble and the user message remains.
  - Regenerate; assert a second request is issued for the same query.
  - Copy/export; assert clipboard/file content contains the answer.
  - Reload; assert session history is restored; New chat clears it.
- `frontend/tests/responsive_accessibility.py` — extend with the assistant at 390×844 and 1440×900.

### Acceptance

- No answer is clipped at 1440×900, 1280×800, or 390×844.
- Stop cancels the UI request and does not leave a permanent “Reading live model data…” state.
- Keyboard-only operation covers composer, send, stop, copy, and new chat.

---

## 4. Increment 3 — Provenance envelope for every answer

**Goal:** Make every weather answer traceable and distinguish observation, forecast, model output, reanalysis, estimate, and official warning.

### Add

- `backend/app/services/provenance.py`
  - `build_provenance(weather, *, source, data_type, model, valid_time, retrieved_at, freshness, limitations) -> dict`
  - Helpers for `FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`.
  - A `source_url` allowlist mapping provider names to documentation/source pages.
- `backend/app/agent/__init__.py`
- `backend/app/agent/response_builder.py` (small first version)
  - Assembles the deterministic answer plus provenance and source list.

### Modify

- `backend/app/models.py`
  - Add additive fields to `ChatResponse`:
    - `provenance: Optional[Dict[str, Any]]`
    - `sources: List[Dict[str, str]]`
    - `data_type: str = "MODEL_FORECAST"`
    - `freshness: str = "UNKNOWN"`
    - `limitations: List[str]`
    - `tool_trace: List[Dict[str, Any]]` (names/status/duration only; no secrets)
  - Keep every existing field unchanged.
- `backend/app/services/chat.py`
  - Populate the envelope from `get_weather()` metadata; do not re-derive values.
  - Explicitly label AQI as `MODELLED` when not live, UV as `ESTIMATED` when fallback, and alerts as `OFFICIAL` only when from IMD RSS.
  - Include the existing model-forecast-not-observation note in `limitations`.
- `backend/app/services/weather.py`
  - Expose the model name, model run time when available, retrieval timestamp, and source URL in the payload already returned to chat.
- `frontend/src/components/ModuleProvenance.jsx`
  - Reuse if its props fit; otherwise add a chat-specific wrapper without changing the existing component.
- `frontend/src/components/WeatherChat.jsx`
  - Render a compact provenance strip above each answer: data kind · source · valid time · freshness.
  - Add an expandable “Evidence” section listing sources, model, retrieval time, and limitations.

### Add tests

- `backend/tests/test_chat_provenance.py` (new): every weather answer has a non-empty source and data type; greeting answers have none.
- `backend/tests/test_chat_grounding.py` — extend to assert no fabricated source names or URLs.
- `frontend/tests/assistant_workspace.py` — provenance strip appears for weather answers and is absent for greetings.

### Acceptance

- A forecast answer says “model forecast”, not “observation”.
- An unavailable AQI is not rendered as a live number.
- A source link is either verified or omitted; never invented.

---

## 5. Increment 4 — Intent gate and honest location handling

**Goal:** Stop answering every input with weather, remove arbitrary comparison defaults, and make ambiguity explicit.

### Modify

- `backend/app/services/chat.py`
  - Add `classify_intent(query, language) -> str` with at least: `greeting`, `help`, `weather`, `forecast`, `comparison`, `official_alert`, `risk`, `specialist`, `meta`.
  - Run intent classification before `geo.resolve()` / `get_weather()`.
  - Greeting/help/meta return a short, useful reply with suggested prompts and no weather card.
  - `extract_pair()` must return `None` when no pair is found; comparison intent asks for two places instead of defaulting to Mumbai/Delhi.
  - Keep follow-up handling (“what about tomorrow?”) dependent on the caller’s `location_name`; never silently change the active location.
- `backend/app/services/geo.py`
  - Add `resolve_candidates(place, limit=5) -> list[dict]` returning name, state, country, lat, lon, and a confidence/rank.
  - Keep `resolve()` behavior for existing callers, but make `resolved=False` explicit in the reply.
  - Prefer exact gazetteer matches; for live results, return multiple Indian candidates instead of silently picking the first.
- `backend/app/models.py`
  - Add optional `location_candidates: List[Dict[str, Any]]` and `needs_location_confirmation: bool = False`.
- `frontend/src/components/WeatherChat.jsx`
  - When `needs_location_confirmation`, render candidate buttons; selecting one resends with the chosen name/coordinates.
  - When `location_resolved=false`, show a clear “I could not resolve X; this answer is about the default location” notice, never a normal card alone.

### Add tests

- `backend/tests/test_intents.py` — greeting, help, weather, comparison, follow-up, official warning.
- `backend/tests/test_unknown_location_fails_closed.py` — unknown place does not silently answer as Pune.
- `backend/tests/test_geo.py` — candidates for a duplicate name include state/country.
- `frontend/tests/assistant_conversation.py` — candidate selection updates the location and the next answer.

### Acceptance

- “hello” returns no weather card.
- “Compare” without two places asks for clarification.
- “What about tomorrow?” keeps the previous location.
- An unresolved place is named and never silently replaced.

---

## 6. Increment 5 — Official warnings, separated from computed risk

**Goal:** Answer “What is the official warning?” with the official IMD feed or an honest unavailability message.

### Modify

- `backend/app/services/imd_rss.py`
  - Add `filter_warnings(items, *, state=None, district=None, keywords=None)` that only matches text present in the official item.
  - Preserve title, description, link, published, issuer, and `official: true` unchanged.
  - Do not synthesize severity or affected areas that the feed does not provide.
- `backend/app/services/chat.py`
  - On `official_alert` intent, call `get_imd_rss_warnings()`.
  - If items match the active state/district, list them with source and published time.
  - If the feed is unavailable, say so and link the official source; do not substitute computed alerts.
  - If items exist but do not match the location, say “no matching official item found” rather than showing unrelated states.
  - Keep computed `risk_engine` output in a separate “Computed risk (not official)” section.
- `backend/app/models.py`
  - Add `official_alerts: Optional[List[Dict[str, Any]]]` and `official_alert_status: str = "NOT_REQUESTED"`.
- `frontend/src/components/AlertCenter.jsx`
  - Show official items with an `OFFICIAL · IMD` badge and source link; computed items with an `ESTIMATED` badge.
- `frontend/src/components/WeatherChat.jsx`
  - Render official and computed sections separately; never merge counts.

### Add tests

- `backend/tests/test_official_warnings.py` (new):
  - Mocked feed with a matching item → returned as official.
  - Mocked feed with unrelated items → no false location match.
  - Mocked failure → `UNAVAILABLE`, no computed substitution.
- `backend/tests/test_alerts_trust.py` — extend to assert official/computed separation.
- `frontend/tests/alerts_safety.py` — badge and source link visible.

### Acceptance

- The phrase “official warning” never returns a computed risk as the answer.
- Feed failure is explicit.
- No alert from an unrelated state is shown as local.

---

## 7. Increment 6 — Executable, validated tool registry

**Goal:** Turn the metadata-only registry into a controlled tool layer that the deterministic engine (and later an LLM) can call safely.

### Add

- `backend/app/agent/tool_registry.py`
  - Pydantic input/output models per tool.
  - Tools backed by existing services: current weather, forecast, history, alerts, AQI, marine, aviation, flood, climate, risk, travel, location, provider health.
  - Each entry: name, description, input schema, output schema, handler, timeout, cache policy, source.
- `backend/app/agent/tool_executor.py`
  - Allowlist-only dispatch; reject unknown tools.
  - Validate inputs; enforce timeout; map exceptions to typed `ToolResult(status, error_code, message)`.
  - Record name, status, duration, and source in `tool_trace`; never record secrets or full provider payloads.
- `backend/app/agent/context.py`
  - Conversation-scoped location/persona/language; no global mutable state.

### Modify

- `backend/app/services/agent_tools.py`
  - Re-export the executable registry for compatibility; keep existing names.
- `backend/app/services/chat.py`
  - Route weather/forecast/history/alert/AQI calls through the executor one tool at a time (no multi-tool planner yet).
- `backend/app/main.py`
  - Optional internal endpoint for tool introspection, disabled by default or restricted to localhost.

### Add tests

- `backend/tests/test_tool_registry.py` (new): schema validation, unknown tool rejection, timeout mapping, no arbitrary URL/shell execution.
- `backend/tests/test_chat_grounding.py` — tool trace matches the rendered data.

### Acceptance

- Every tool call is validated and attributed.
- Unknown tool names fail closed.
- No LLM-supplied URL or command can reach the network/shell.

---

## 8. Increment 7 — Local-first AI runtime and grounding

**Goal:** Make the optional LLM observable, cancellable, and strictly explanatory.

### Modify

- `backend/app/services/llm.py`
  - Add `health_check()` with 2–3 s timeout per provider.
  - Add structured error classes: `NOT_CONFIGURED`, `TIMEOUT`, `AUTH`, `RATE_LIMIT`, `BAD_RESPONSE`, `UNAVAILABLE`.
  - Return latency and token counts when the provider supplies them.
  - Default Ollama model from `OLLAMA_MODEL`; do not assume a model is installed. Document Qwen as an example, not a requirement.
  - Add `explain_grounded(topic, validated_facts)` that passes a delimited JSON fact block and rejects output containing numbers absent from the facts.
- `backend/app/services/chat.py`
  - Keep the deterministic answer as the source of truth.
  - Optionally append a short “Explanation” paragraph from the LLM; on any failure, keep the deterministic answer and add a non-blocking note.
  - Never let the LLM choose a location, alter an alert, or add a source.
- `backend/app/main.py`
  - `/api/assistant/explain` returns provider, status, latency, and grounded flag.
- `frontend/src/components/WeatherChat.jsx`
  - Show “Explanation by …” only when an LLM actually ran; otherwise show “Deterministic explanation”.

### Add tests

- `backend/tests/test_llm_runtime.py` (new): no key, timeout, 401, malformed JSON, numeric hallucination rejection.
- `backend/tests/test_gps_aviation_llm.py` — extend provider status expectations.
- `backend/tests/test_chat_grounding.py` — LLM cannot change the tool-derived values.

### Acceptance

- The app works identically with no LLM configured.
- A broken provider degrades to deterministic output with a visible status, not a silent failure.
- Any LLM explanation passes the numeric-grounding check or is discarded.

---

## 9. Increment 8 — Transparent risk and travel assessment

**Goal:** Replace bare scores with inputs, thresholds, time window, and limitations.

### Modify

- `backend/app/services/travel.py`
  - Add `assess_travel(weather, alerts) -> dict` returning `score`, `level`, `factors[]` (name, value, threshold, deduction), `time_window`, `limitations`, `data_type`, `source`.
  - Keep the existing score for compatibility; expose the breakdown alongside it.
- `backend/app/services/risk_engine.py`
  - Add `methodology()` metadata per hazard; keep documented thresholds.
  - Ensure flood remains labelled a rainfall proxy, and cyclone a wind/rain heuristic.
- `backend/app/services/chat.py`
  - Render a compact “Why this score” block for comparisons and travel intent; include the disclaimer that weather risk is not a road-safety assessment.
- `frontend/src/components/WeatherChat.jsx` or a new `ChatRiskBreakdown.jsx`
  - Expandable factor table with thresholds and limitations.
- `backend/app/models.py`
  - Add `risk_breakdown: Optional[Dict[str, Any]]` to `ChatResponse` and `CityComparisonData`.

### Add tests

- `backend/tests/test_risk_engine.py` — thresholds and labels unchanged; methodology present.
- `backend/tests/test_chat.py` — travel reply includes factors and limitations.
- `frontend/tests/assistant_workspace.py` — breakdown expands and is keyboard accessible.

### Acceptance

- No bare “95/100” without an explanation.
- Estimated risk is never called an official warning.
- The travel answer distinguishes weather risk from complete road safety.

---

## 10. Increment 9 — Assistant workspace UI and sidebar

**Goal:** Make the assistant feel like a premium intelligence workspace while preserving the existing visual system.

### Modify

- `frontend/src/components/WeatherChat.jsx`
  - Restructure the answer into: headline → key metrics → explanation → evidence/provenance → actions.
  - Add a compact message toolbar (copy, listen, regenerate) on hover/focus.
  - Keep `ModernWeatherCard` for structured weather; do not duplicate its values in prose.
  - Add contextual prompt suggestions based on active location, persona, and last intent; remove the hardcoded Vijayawada prompt.
- `frontend/src/components/ModernWeatherCard.jsx`
  - Add optional `compact` and `provenance` props; keep existing callers working.
- `frontend/src/components/ReferenceChrome.jsx`
  - Upgrade the context sidebar to show: active location, current conditions, active official warnings, forecast summary, selected language/persona, provider status, and shortcuts.
  - Hide empty cards; do not add permanent clutter.
- `frontend/src/components/ReferenceChrome.css`, `frontend/src/styles/module-cinematic.css`
  - Fix the clipping defect; define a stable grid for conversation + sidebar; collapse the sidebar below 1024 px.
  - Add reduced-motion handling for any new transition.
- `frontend/src/components/LiveWeatherChart.jsx` / `DeepCastCharts.jsx`
  - Reuse for hourly temperature/rain charts inside an expandable answer section; do not add a charting dependency.

### Add tests

- `frontend/tests/assistant_workspace.py` (new): desktop and mobile layout, sidebar collapse, no horizontal overflow, no clipped answer.
- `frontend/tests/responsive_accessibility.py` — extend the matrix to the assistant.
- `frontend/tests/chat_visibility.py` — extend for the new message structure.

### Acceptance

- The 1440 screenshot no longer cuts off the answer.
- At 390 px the composer, messages, and sidebar remain usable with no horizontal scroll.
- No empty “active warnings” card when there are no warnings.
- Keyboard focus order is logical; contrast meets the existing baseline.

---

## 11. Increment 10 — Multilingual consistency

**Goal:** Ensure every supported language gets a coherent answer, not English condition names inside a translated template.

### Modify

- `backend/app/services/chat.py`
  - Complete the condition translation table for bn/gu/pa/kn/ml/or, or fall back to a clearly labelled English condition term.
  - Keep units and numbers locale-stable; translate labels, not values.
  - Ensure `speech_text` matches the response language.
- `backend/app/services/langid.py`
  - Add tests for mixed-script and romanised inputs; do not auto-switch language on a single ambiguous token.
- `backend/tests/test_langid.py`, `backend/tests/test_chat.py`
  - Parameterise all supported languages; assert no untranslated template placeholder and no English-only condition label where a translation exists.

### Acceptance

- Each supported language returns a complete answer with consistent labels.
- A missing translation is labelled, not silently mixed.

---

## 12. Security and reliability checklist

Apply across the increments above; do not defer to the end.

- [ ] Strict Pydantic validation on every new request/response model.
- [ ] Request size limit for chat (e.g. 500 chars query, 8 KB body) and explicit 413/422 responses.
- [ ] Prompt-injection delimiters around user text; system prompt never includes secrets.
- [ ] Tool allowlist; no arbitrary URLs, shell, filesystem, or provider selection from user/LLM input.
- [ ] Output validation for LLM text; reject invented numbers/sources.
- [ ] Timeouts and bounded retries for every provider; no unbounded waits.
- [ ] Cache keys include location, model, and units; stale entries are labelled.
- [ ] No API keys in frontend, logs, error messages, or tool traces.
- [ ] Safe Markdown only; no raw HTML; links use `rel="noopener noreferrer"`.
- [ ] CORS remains restricted to the configured local origins.
- [ ] Session history stays client-side; no server conversation retention in this phase.
- [ ] Dependency audit before release; do not add packages without approval.

---

## 13. Regression test matrix

| # | Scenario | Expected | Test |
| --- | --- | --- | --- |
| 1 | “hello” | Greeting, no weather card | `test_intents.py` |
| 2 | “What about tomorrow?” after a Vijayawada answer | Vijayawada tomorrow | `test_chat.py`, `assistant_conversation.py` |
| 3 | “Compare Vijayawada and Hyderabad” | Those two cities, no defaults | `test_chat.py` |
| 4 | “Compare” with no pair | Clarification, no Mumbai/Delhi | `test_intents.py` |
| 5 | “What is the official warning?” | IMD official item or explicit unavailable | `test_official_warnings.py` |
| 6 | Open-Meteo failure | Explicit unavailable, no synthetic values | `test_weather_query_grounding.py` |
| 7 | AQI feed unavailable | No invented AQI; labelled modelled/unavailable | `test_chat_grounding.py` |
| 8 | Two models disagree | Disclose disagreement, no false certainty | new `test_model_comparison.py` (deferred until comparison ships) |
| 9 | Unknown city | Named as unresolved; no silent Pune | `test_unknown_location_fails_closed.py` |
| 10 | Stale forecast | `STALE` label, never “current” | `test_chat_provenance.py` |
| 11 | LLM timeout/401/bad JSON | Deterministic answer + visible status | `test_llm_runtime.py` |
| 12 | LLM invents a number | Output rejected | `test_llm_runtime.py` |
| 13 | All supported languages | Complete answer, consistent labels | `test_chat.py`, `test_langid.py` |
| 14 | Voice unsupported/denied | Accurate message, no stuck state | `assistant_conversation.py` |
| 15 | Stop generation | Request aborted; no error bubble | `assistant_conversation.py` |
| 16 | Reload conversation | Session history restored | `assistant_conversation.py` |
| 17 | 390 px / 768 px / 1440 px | No overflow, no clipped answer | `responsive_accessibility.py` |
| 18 | Keyboard-only | Composer, send, stop, copy reachable | `responsive_accessibility.py` |
| 19 | Provider health | UI, `/api/agent/engine`, `/api/providers/health` agree | `test_providers.py`, `assistant_workspace.py` |
| 20 | Malicious prompt | No tool/URL/shell escalation | `test_tool_registry.py` |

**Existing suites that must remain green:** `test_api.py`, `test_chat.py`, `test_chat_grounding.py`, `test_intents.py`, `test_weather_query_grounding.py`, `test_unknown_location_fails_closed.py`, `test_risk_engine.py`, `test_providers.py`, `test_hardening.py`, `test_cors_config.py`, `test_config_cors.py`, plus the Playwright suites listed above.

---

## 14. File action map

### Modify (existing)

| File | Change |
| --- | --- |
| `backend/app/services/chat.py` | Intent gate, pair handling, official alerts, provenance, tool routing, risk breakdown. |
| `backend/app/services/llm.py` | Provider health, structured errors, grounded explanation, Ollama model config. |
| `backend/app/services/providers.py` | Remove hardcoded LLM status; derive from runtime. |
| `backend/app/services/geo.py` | Candidate resolution and ambiguity handling. |
| `backend/app/services/imd_rss.py` | Warning filtering while preserving official fields. |
| `backend/app/services/travel.py` | Breakdown and limitations. |
| `backend/app/services/risk_engine.py` | Methodology metadata; keep thresholds. |
| `backend/app/services/weather.py` | Expose model/run/retrieval metadata; keep fail-closed behavior. |
| `backend/app/services/agent_tools.py` | Re-export executable registry; keep existing names. |
| `backend/app/models.py` | Additive response fields only. |
| `backend/app/main.py` | Engine detail, optional tool introspection, request limits. |
| `frontend/src/App.jsx` | Engine status, chat abort, session persistence, regenerate state. |
| `frontend/src/services/api.js` | Signal-aware chat call; engine status fallback. |
| `frontend/src/components/WeatherChat.jsx` | Composer, controls, message structure, provenance, warnings. |
| `frontend/src/components/ModernWeatherCard.jsx` | Optional compact/provenance props. |
| `frontend/src/components/ReferenceChrome.jsx` | Context sidebar upgrade. |
| `frontend/src/components/ReferenceChrome.css` | Layout/clipping fix, focus states, responsive rules. |
| `frontend/src/styles/module-cinematic.css` | Remove conflicting fixed heights; reduced motion. |
| `frontend/src/components/AlertCenter.jsx` | Official vs computed badges. |
| `backend/tests/test_chat.py` | Extend intent/provenance assertions. |
| `backend/tests/test_chat_grounding.py` | Grounding and source honesty. |
| `backend/tests/test_providers.py` | LLM status consistency. |
| `frontend/tests/responsive_accessibility.py` | Assistant breakpoints and keyboard. |
| `frontend/tests/chat_visibility.py` | New message structure. |

### Add (new)

| File | Purpose |
| --- | --- |
| `backend/app/services/provenance.py` | Provenance envelope and freshness helpers. |
| `backend/app/agent/__init__.py` | Agent package marker. |
| `backend/app/agent/response_builder.py` | Deterministic answer assembly. |
| `backend/app/agent/tool_registry.py` | Typed tool definitions. |
| `backend/app/agent/tool_executor.py` | Allowlisted validation/execution. |
| `backend/app/agent/context.py` | Conversation-scoped context. |
| `backend/tests/test_chat_provenance.py` | Provenance coverage. |
| `backend/tests/test_official_warnings.py` | Official feed behavior. |
| `backend/tests/test_tool_registry.py` | Tool safety. |
| `backend/tests/test_llm_runtime.py` | Provider failure/grounding. |
| `frontend/src/components/ChatProvenance.jsx` | Compact chat evidence strip (if `ModuleProvenance` is not reusable). |
| `frontend/src/components/ChatRiskBreakdown.jsx` | Expandable risk factors. |
| `frontend/tests/assistant_workspace.py` | Workspace layout/status. |
| `frontend/tests/assistant_conversation.py` | Lifecycle, stop, copy, persistence. |

### Do not touch

- The nine module routes/components and their data flows.
- `frontend/src/components/Earth3D.jsx`, `GISMap.jsx`, `RealIndiaMap.jsx`, chart components except for optional reuse.
- Existing API paths or response fields (additive changes only).
- `frontend/src/components/ModuleProvenance.jsx`, `ErrorBoundary.jsx`, `ModuleSkeleton.jsx` behavior for existing modules.
- Any deployment, CI, or environment configuration for hosted services.

---

## 15. Execution order and gates

1. **Baseline capture** — run current build, lint, backend focused tests, and the assistant Playwright smoke test; save output.
2. **Increment 1 (status)** — smallest truthfulness fix; build + lint + focused tests.
3. **Increment 2 (lifecycle)** — no backend contract change; Playwright lifecycle tests.
4. **Increment 3 (provenance)** — additive response fields; backend + UI tests.
5. **Increment 4 (intent/location)** — highest behavioral risk; full chat/intents/geo regression.
6. **Increment 5 (official warnings)** — official/computed separation tests.
7. **Increment 6 (tool registry)** — safety tests before any chat routing change.
8. **Increment 7 (LLM runtime)** — optional path; deterministic path must remain unchanged.
9. **Increment 8 (risk transparency)** — UI breakdown + backend methodology.
10. **Increment 9 (workspace UI)** — screenshot comparison at 1440/390; accessibility matrix.
11. **Increment 10 (languages)** — parameterised language suite.
12. **Final verification** — full backend suite, build, lint, assistant E2E, responsive matrix, manual screenshot review.

Each gate requires: `npm run build`, `npm run lint`, the focused pytest files, and the relevant Playwright script. Do not proceed on a failing gate.

---

## 16. Deliberately deferred (not claimed as complete)

These are valuable but should not block the truthful, working assistant:

- Full multi-tool agent planner (plan → execute → validate → explain) beyond the single-tool executor.
- Model-comparison workspace with ensemble spread; requires verified model metadata and a new UI surface.
- Cyclone track rendering from authoritative advisories.
- NDMA SACHET integration; requires a verified accessible feed and licence review.
- CWC river-gauge integration; no verified keyless feed selected yet.
- Dedicated aviation/marine briefings beyond the existing modules.
- Unit switching (metric/imperial) across all modules.
- City-to-city climate comparison beyond the existing weather comparison.
- Local Ollama/Qwen installation and benchmarking; the runtime must remain optional.
- Lighthouse/axe automation; manual accessibility matrix continues for now.
- MapLibre/Cesium migration; Leaflet remains.

---

## 17. Definition of done

- [ ] The assistant answers greetings without a weather card.
- [ ] Every weather answer has source, data type, valid time, retrieval time, freshness, and limitations.
- [ ] Official warnings come only from IMD RSS, with source links; computed risk is separate.
- [ ] No default comparison cities, no silent location substitution, no invented AQI.
- [ ] Engine status is truthful in the UI, `/api/agent/engine`, and `/api/providers/health`.
- [ ] Stop, regenerate, copy, export, new chat, and session persistence work.
- [ ] The answer is never clipped at 1440, 768, or 390 px.
- [ ] The app works with no LLM configured; a configured LLM can only explain validated values.
- [ ] All existing modules, routes, APIs, and tests remain intact.
- [ ] Full build, lint, backend suite, and assistant E2E pass.
- [ ] No commit, push, merge, or deployment without explicit approval.
