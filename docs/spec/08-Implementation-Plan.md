# Implementation Plan — StudySpark AI

Checkbox backlog for an agentic build (Antigravity) or a human team. Work top to bottom; tick tasks as you finish; **stop and verify at every Gate**. Time estimates assume an agent-assisted build of roughly 16–24 hours in total; adjust to your event.

Spec references: API → `05`, prompts → `06`, design → `03`, UI → `07`, tests/deploy → `09`.

---

## Phase 0 — Scaffold and smoke test (≈ 1–2 h)

- [x] 0.1 Create the repo structure from `03 §6` (empty stubs for additive files too). Add `.gitignore` (`.env`, `node_modules`, `.venv`, `__pycache__`, `dist`).
- [x] 0.2 Backend: virtualenv, `requirements.txt` (fastapi, uvicorn[standard], pydantic>=2, google-genai, python-dotenv, slowapi, pytest, pytest-asyncio, httpx), `.env.example` with the variables in `00-README §2`.
- [x] 0.3 `GET /api/health` returns the payload in `05 §3`, even without an API key (`ai_configured:false`).
- [x] 0.4 **Gemma smoke test:** a throwaway script that sends one English and one Hindi prompt to `GEMMA_MODEL` through `google-genai` and prints text and latency.
- [x] 0.5 Frontend: Vite + React scaffold, Tailwind, react-router-dom, lucide-react; `.env.example`; "Hello StudySpark" page that calls `/api/health` (or mock).

**Gate 0:** health endpoint works; Gemma returns sensible English **and Hindi** text; note the latency. If Hindi is poor or the model ID fails, fix key/model/quota before continuing. Do not build around a broken model.

---

## Phase 1 — Backend core (≈ 3–4 h) · can run in parallel with Phase 2

- [x] 1.1 `schemas.py`: enums, request models with the limits in `02 §6`, model-facing output models (`ExplainOutput`, `SummaryOutput`, `QuizOutput`, `PlanOutput`), response/meta models, `ErrorCode`, `AppError`.
- [x] 1.2 `config.py`: settings from env with defaults.
- [x] 1.3 `gemma_service.py`: client, `generate_json` with system-instruction fallback, timeout, JSON extraction, `{"error": …}` handling, validation, single retry with repair instruction, 429/5xx handling (`03 §3.2`, `04 §3`).
- [x] 1.4 `prompts.py`: `SYSTEM_BASE` and the four builders exactly as in `06`.
- [x] 1.5 `main.py`: app, CORS allow-list, slowapi limiter, request-id middleware, one log line per request, exception handlers that produce the error envelope (including FastAPI validation errors → `VALIDATION_ERROR`).
- [x] 1.6 `POST /api/explain` + unit tests (mocked service).
- [x] 1.7 `POST /api/summarize` + tests.
- [x] 1.8 `POST /api/quiz` + tests: exactly 5 questions, 4 distinct options, shuffle with correct remap, ids `q1–q5`.
- [x] 1.9 `POST /api/study-plan` + tests: horizon computation, day→date mapping, deadline guard, rest-day fill, minute clamping, ids, `truncated`.
- [x] 1.10 Prompt snapshot tests; JSON-extraction tests (fenced, extra text, trailing commas rejected).

**Gate 1:** `pytest` passes. Using real Gemma, all four endpoints return valid envelopes for the golden inputs in `09 §3`, in English and Hindi. Error cases return the right codes.

---

## Phase 2 — Frontend shell (≈ 2–3 h) · can run in parallel with Phase 1 using mocks

- [x] 2.1 `services/api.js`: `apiRequest`, four feature functions, `checkHealth`, `ApiError`, 70 s timeout, envelope parsing, network/timeouts mapped to `NETWORK_ERROR` / `CLIENT_TIMEOUT`.
- [x] 2.2 `services/mocks.js`: fixtures copied from `05` plus per-error mocks; `VITE_USE_MOCKS` and `?mockError=` support.
- [x] 2.3 `SettingsContext` + `useLocalStorage`: theme (light/dark/system) and language, persisted.
- [x] 2.4 `Sidebar`, `Header`, `Home`, `App` routing (`/`, `/history`), responsive layout with bottom tab bar on mobile (`07 §2`).
- [x] 2.5 `StatusMessage` (loading / error / empty).
- [x] 2.6 Health ping on load, status dot, "waking up" banner after 3 s (`04 §7`).
- [x] 2.7 Design tokens in `index.css`, fonts (Inter + Noto Sans Devanagari), dark-mode variant.

**Gate 2:** app shell works at 360 px and 1280 px; theme toggle works; health states display correctly.

---

## Phase 3 — The four features (≈ 4–6 h)

- [x] 3.1 `ExplainPanel` + exported `ExplainResult`: form, validation, status machine, result card, Copy, example chips.
- [x] 3.2 `SummaryPanel` + `SummaryResult`: char counter 50–8000, length control, key terms list.
- [x] 3.3 `QuizPanel` + `QuizResult`: state machine from `04 §4`, A–D options, check/next, results screen, retake/new quiz.
- [x] 3.4 `StudyPlanPanel` + `StudyPlanResult`: dynamic subject rows (max 6), validation, day cards with sessions, tips, truncated note, Copy as text.
- [x] 3.5 Hook every panel into `api.js`; "Try again" re-submits the same payload.

**Gate 3:** each tool works against mocks **and** against the real backend. Every panel has loading, error and empty states. No console errors.

---

## Phase 4 — Enhancements (≈ 3–4 h)

- [x] 4.1 **(E1, Should)** Language toggle wired into every request; Hindi text renders in Noto Sans Devanagari with correct line height; `lang` attribute on results.
- [x] 4.2 **(E2, Should)** `useStudyHistory` hook; auto-save on success; `StudyHistory` page with tabs, open read-only result (reuse `*Result` components), delete, clear all with confirm.
- [x] 4.3 **(E3, Should)** Dark mode polish across all components; verify contrast.
- [ ] 4.4 **(E4, Could)** Quiz scores stored; History stats strip (taken, best, average).
- [ ] 4.5 **(E5, Could)** Study-plan session check-offs persisted in `studyspark:planProgress:v1`; progress bar.
- [ ] 4.6 **(E6, Could)** "Quiz me on this" button on Explain/Summary results → switches to Quiz with the content prefilled.
- [ ] 4.7 **(Could)** `?demo=1` seeds localStorage with sample history entries for the demo.

**Gate 4:** Hindi flow works end to end; history survives refresh; dark mode has no unreadable elements.

---

## Phase 5 — Harden and deploy (≈ 2–3 h)

- [ ] 5.1 Run the edge-case list in `09 §3–4`; fix failures.
- [ ] 5.2 Accessibility pass from `07 §7` (keyboard-only run of all four tools, focus management, contrast).
- [ ] 5.3 Deploy the backend (`09 §6`); set env vars; confirm `/api/health`.
- [ ] 5.4 Deploy the frontend to Vercel with `VITE_API_BASE_URL`; add `vercel.json` SPA rewrite.
- [ ] 5.5 Tighten `ALLOWED_ORIGINS` to the Vercel URL; re-test CORS.
- [ ] 5.6 Production smoke test of all four tools in English and Hindi on a phone.
- [ ] 5.7 Final README: what it is, screenshots, quickstart, env vars, architecture diagram.

**Gate 5:** deployed URL passes the production smoke test on a real phone and a laptop.

---

## Phase 6 — Demo polish (≈ 1–2 h)

- [ ] 6.1 Rehearse `10-Demo-Pitch.md` twice with a timer.
- [ ] 6.2 Record a 2-minute backup screen recording of the full flow.
- [ ] 6.3 Warm the backend 5 minutes before presenting; keep one pre-generated result per tool in History (`?demo=1`).
- [ ] 6.4 Check quota and API key validity the same day.

---

## Phase 7 — Stretch (only if time remains; not part of the MVP)

- [ ] 7.1 Streaming explanations (plain-text streaming for Explain only).
- [ ] 7.2 PDF/image notes upload (Gemma 4 supports image input via the Gemini API; verify limits first).
- [ ] 7.3 Offline demo provider via Ollama or another OpenAI-compatible local server behind `INFERENCE_PROVIDER`.
- [ ] 7.4 Translate UI labels to Hindi via a `strings.js` dictionary.
- [ ] 7.5 Export results/plan to PDF or calendar (.ics).

---

## Parallelization map (Antigravity Manager view)

| Agent | Tasks | Needs |
|---|---|---|
| Agent A — Backend | 0.1–0.4, Phase 1 | `05`, `06`, `03 §3` |
| Agent B — Frontend | 0.5, Phases 2–3 | `05` (mocks), `07`, `03 §4` |
| Integration (after both) | Gates 1–3, Phase 4–5 | Everything |

## Task log

Record deviations and decisions here as you go so the specs stay truthful:

| Date | Task | Change / decision | Spec updated? |
|---|---|---|---|
| 2026-10-27 | Phase 0 | Normalized specs to `docs/spec/`; scaffolded backend & frontend; verified health endpoint & mock service; live Gemma smoke test blocked pending user GEMINI_API_KEY. | Yes (`docsspec/` -> `docs/spec/`) |
| 2026-10-28 | Phase 1 | Completed backend core: Pydantic schemas, prompt builders, async GemmaService with repair retry, all 5 endpoints with post-processing, and 42 unit/api tests. | No (Followed spec strictly) |
| 2026-10-28 | Phase 2 | Completed frontend shell: responsive Sidebar, Header, BottomTabBar, SettingsContext, feature panels with interactive state, mock mode services, and verified build. | No (Followed spec strictly) |
| 2026-10-28 | Phase 3 | All four feature panels (Explain, Summary, Quiz, Study Plan) were already built with full forms, validation, status machines, result cards, Copy, retry, and api.js integration during Phase 2. Switched frontend from mock mode to real backend mode. Frontend builds cleanly (1578 modules, 0 errors). Backend tests pass (42/42). | No (Followed spec strictly) |
| 2026-10-28 | Phase 4.1 | Centralized English/Hindi UI text, persisted and validated language settings, wired the selected language through all four API payloads, and set result language attributes. Verified both UI languages in the browser and the production build. Live Gemma Hindi generation was not exercised. | No |
| 2026-10-28 | Phase 4.2 | Saved successful outputs locally without API request payloads, added safe normalization/migration, quota-aware writes, score display, and history reopen/delete/clear. Browser checks covered all four mock features, reload, malformed storage, delete, clear, and quota failure. | No |
| 2026-10-28 | Phase 4.3 | Added an early theme restore to prevent a wrong-theme flash, global keyboard focus indicators, and readable disabled action styles in both themes. Verified light/dark/system persistence and OS changes, all feature/history views, 360 px layout, focus visibility, and no browser console errors. | No |
