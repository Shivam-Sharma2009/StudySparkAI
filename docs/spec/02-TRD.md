# Technical Requirements Document (TRD) — StudySpark AI

Companion to `01-PRD.md`. Defines the constraints, technology choices and non-functional requirements.

---

## 1. Engineering principles

1. **Thin backend, strict contract.** The backend validates input, builds prompts, calls the model, validates output, and returns a clean envelope. `05-API-Spec.md` is the contract.
2. **Never trust the model.** Everything it returns is parsed, schema-validated and post-processed before the UI sees it.
3. **No secrets in the client.** The API key exists only on the server.
4. **Fail gracefully.** Every failure becomes a friendly, retryable message; nothing crashes the UI.
5. **Simple beats clever.** One model, one provider, no database, no auth.

## 2. Technology stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Vite + React (JavaScript, `.jsx`) | Matches the approved structure |
| Routing | react-router-dom | Routes: `/` (Home), `/history` |
| Styling | Tailwind CSS | v4 via the `@tailwindcss/vite` plugin is preferred; v3 is acceptable if used consistently |
| Icons | lucide-react | Plus emoji for tool identity (💡 📝 🎯 📅) |
| Backend | Python 3.11+, FastAPI, Uvicorn | Async endpoints |
| Validation | Pydantic v2 | Request, model-output and response schemas |
| AI SDK | `google-genai` | Official SDK; async client (`client.aio`) |
| Rate limiting | slowapi | In-memory, per IP |
| Config | python-dotenv or pydantic-settings | Reads `backend/.env` |
| Tests | pytest + pytest-asyncio + httpx (backend); Vitest + React Testing Library (frontend, optional) | |
| Client storage | Browser `localStorage` | History, settings, scores, progress |
| Hosting | Vercel (frontend) + any Python host (Render / Railway / Fly.io / Cloud Run) | |

## 3. Model access — Gemma 4

- Gemma 4 is an open-weights model family (Apache 2.0) that is also served through the **Gemini API** and Google AI Studio. The Gemini API exposes two Gemma 4 models: `gemma-4-26b-a4b-it` and `gemma-4-31b-it`, used through the same `google-genai` SDK and a `GEMINI_API_KEY`.
- **Default:** `gemma-4-26b-a4b-it` (mixture-of-experts, faster and cheaper). **Quality option:** `gemma-4-31b-it`. Selected with `GEMMA_MODEL`; no code change to switch.
- All model access is isolated in `gemma_service.py` behind one method (`generate_json`). Swapping provider later (Vertex AI, a self-hosted server, Ollama) touches only that file.
- **System instruction:** pass the system prompt through the SDK's system-instruction config. If the API rejects it for the chosen model, fall back automatically to prepending the system text to the user message.
- **Do not depend on native JSON mode or response schemas.** Ask for JSON in the prompt and parse defensively (`06-Prompt-Spec.md`, `04-Flows.md`). An optional `USE_NATIVE_JSON` flag may be added later, default off.
- Use only the final answer text from the response; ignore any reasoning/thought parts if present.
- **Optional offline path (Phase 7, stretch):** an Ollama or OpenAI-compatible adapter for demos without internet. Verify the exact local model tag at build time; do not guess it.
- Quota/pricing change over time: check the current Gemini API limits before the demo and handle 429 responses gracefully.

## 4. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-1 | Performance | Typical latency: Explain/Summarize ≤ 10 s, Quiz/Plan ≤ 15 s. Frontend shows progress immediately (< 100 ms) |
| NFR-2 | Timeouts | Model call timeout 30 s, max 2 attempts; frontend request timeout 70 s |
| NFR-3 | Reliability | Malformed model output is retried once; upstream 429/503 retried once with short backoff |
| NFR-4 | Availability | Backend cold start tolerated: frontend pings `/api/health` on load and shows a "waking up" banner after 3 s |
| NFR-5 | Security | Key server-side only; CORS allow-list; rate limiting; input length limits; no `dangerouslySetInnerHTML` |
| NFR-6 | Privacy | No accounts, no server-side storage of user content, no raw content in INFO logs. UI notice: don't enter personal or sensitive data. Submitted text goes to the model provider; check the current Gemini API terms for how content is handled on your tier |
| NFR-7 | Accessibility | WCAG 2.1 AA contrast, full keyboard operation, visible focus, `aria-live` for loading and results, respects `prefers-reduced-motion` |
| NFR-8 | i18n | AI output in English or Hindi (Devanagari). Fonts: Inter + Noto Sans Devanagari |
| NFR-9 | Responsiveness | 360 px phones to 1440 px desktops; no horizontal scroll |
| NFR-10 | Compatibility | Latest Chrome, Edge, Safari (iOS) and Chrome (Android) |
| NFR-11 | Maintainability | Files stay in the approved structure; prompts live only in `prompts.py`; all fetches only in `api.js` |
| NFR-12 | Observability | One structured log line per request: request id, endpoint, status, latency, attempts, model |

## 5. Security details

- **CORS:** `ALLOWED_ORIGINS` allow-list. Never `*` in production.
- **Rate limit:** default `20/minute` per IP via slowapi (configurable); respond `429` in the standard envelope.
- **Input validation:** Pydantic length/enum/range checks; strip whitespace; reject control characters.
- **Prompt injection:** user content is wrapped in delimiter tags and declared to be data, never instructions (`06-Prompt-Spec.md`). Outputs are schema-validated, so injected instructions cannot change the response shape.
- **XSS:** React escapes by default; model output is rendered as text; no HTML injection.
- **Secrets:** `.env` is git-ignored; `.env.example` has blanks; the key never appears in logs.
- **Dependencies:** pin versions in `requirements.txt` and `package.json` lockfiles.

## 6. Limits (single source of truth)

| Item | Limit |
|---|---|
| Explain topic | 3–500 chars |
| Summarize notes | 50–8000 chars |
| Quiz content (topic or notes) | 3–6000 chars |
| Study plan subjects | 1–6; name 1–80 chars; topics ≤ 300 chars |
| Daily hours | 0.5–12 (steps of 0.5) |
| Deadline | ≥ start date and ≤ start date + 30 days |
| Plan horizon | ≤ 14 days per generation |
| Quiz questions | exactly 5, 4 options each |
| History entries | 50 (oldest evicted) |
| Rate limit | 20 requests / minute / IP |

## 7. Error policy

Every error uses the envelope `{ok:false, error:{code, message, retryable}}` with a matching HTTP status. Codes: `VALIDATION_ERROR` (422), `UNSUITABLE_INPUT` (422), `RATE_LIMITED` (429), `MODEL_OUTPUT_INVALID` (502), `MODEL_UNAVAILABLE` (503), `MODEL_TIMEOUT` (504), `INTERNAL_ERROR` (500). Messages shown to users are friendly; technical detail goes to server logs only. Full table in `05-API-Spec.md`.

## 8. Logging

JSON or key=value lines. Fields: `request_id`, `endpoint`, `status`, `latency_ms`, `attempts`, `model`, `error_code`. Never log the API key, notes or topics at INFO. DEBUG may log prompts locally only.

## 9. Configuration

See the environment tables in `00-README.md §2`. The app must start (health check works) even if `GEMINI_API_KEY` is missing, and report `ai_configured: false` instead of crashing.

## 10. Constraints

- Hackathon timeline: prefer working and polished over broad.
- Free-tier hosting may sleep; design for cold starts.
- No streaming, no uploads, no accounts in the MVP.

## 11. Definition of done (MVP)

1. All four endpoints return schema-valid envelopes for the golden inputs in English and Hindi.
2. All four panels work against the real backend on deployed URLs.
3. Error, loading and empty states exist for every panel.
4. No secrets in the repo; `.env.example` present.
5. README quickstart works from a clean clone.
6. The demo script in `10-Demo-Pitch.md` runs end to end without errors.
