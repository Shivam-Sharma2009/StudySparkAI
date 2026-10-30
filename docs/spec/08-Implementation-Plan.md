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
- [x] 4.4 **(E4, Could)** Quiz scores stored; History stats strip (taken, best, average).
- [x] 4.5 **(E5, Could)** Study-plan session check-offs persisted in `studyspark:planProgress:v1`; progress bar.
- [x] 4.6 **(E6, Could)** "Quiz me on this" button on Explain/Summary results → switches to Quiz with the content prefilled.
- [x] 4.7 **(Could)** `?demo=1` seeds localStorage with sample history entries for the demo.

**Gate 4:** Hindi flow works end to end; history survives refresh; dark mode has no unreadable elements.

---

## Phase 5 — Harden and verify locally (≈ 2–3 h)

- [x] 5.1 Run the edge-case list in `09 §3–4`; fix failures (local resilience cases verified; live provider cases blocked).
- [ ] 5.2 Accessibility pass from `07 §7` (keyboard-only run of all four tools, focus management, contrast).
- [x] 5.3 Verify production settings, environment templates, secret handling, and CORS configuration locally without deploying.
- [x] 5.4 Complete the README with verified features, screenshots, quickstart, environment variables, and architecture diagram.

**Gate 5:** local backend/frontend tests, production build, dependency audits, and the feasible local edge-case/accessibility checks pass. Record live-provider or browser/device checks that cannot be completed locally as blocked; deployment is explicitly deferred to the final phase.

**Verified progress (2026-10-30):**

- Backend hardening is committed as `eaa2385`; the backend suite passes **47 tests**. Production CORS validation, request-size limits, rate limiting, and safe provider logging are covered by tests. The placeholder-only environment templates and ignored local `.env` files were checked.
- Frontend API envelope/health validation, production mock gating, and duplicate-submit guards are committed as `5913747`; **6 frontend tests** and the production build pass.
- Vite and React Router upgrades are committed as `295f144`; `npm audit` reports **0 vulnerabilities**. `pip-audit` reports no known vulnerabilities in declared requirements or installed backend packages after upgrading the local virtualenv's pip to 26.2.2 (the virtualenv is ignored and not committed).
- Mock-mode browser checks exercised all four feature views, local history, saved plan-progress persistence after reload, language and theme persistence, keyboard focus visibility, the mobile navigation, and layouts at 360/768/1280 CSS pixels without horizontal overflow or browser console errors.
- Additional browser resilience checks on 2026-10-29 injected malformed history/progress/settings JSON, denied localStorage access, and a simulated quota failure. The app recovered from malformed data; successful results remained visible when writes failed and a history-save warning was shown. A rapid double-click produced one saved activity. These are local mock-mode checks, not live API or deployed checks.
- Additional local mock checks completed a five-question quiz with a **5/5** score, verified its score and saved result in History, reopened the saved quiz read-only, and cleared the history with confirmation.
- Production CORS configuration was loaded with `APP_ENV=production` and an explicit HTTPS origin; the app had debug disabled and docs/OpenAPI routes disabled. Local CORS allowed `http://localhost:5173` and omitted `http://127.0.0.1:5173`, as configured.
- The production build succeeded with `VITE_USE_MOCKS=true` in the build environment. A production-preview browser submission attempted the backend and showed the expected friendly network error when the preview origin was not in the local backend CORS allowlist; it did not substitute mock content.
- Live inference was attempted once for each endpoint in English on 2026-10-29. Explain returned `MODEL_UNAVAILABLE` (503), summarize returned `MODEL_OUTPUT_INVALID` (502), quiz returned `MODEL_UNAVAILABLE` (503), and study plan returned `MODEL_TIMEOUT` (504). The health endpoint reported a configured key, but that does not verify provider inference. Real inference acceptance is therefore **BLOCKED**; no successful live feature result is claimed.
- Accessibility review is partial: keyboard-visible focus, input labels, result-heading focus, mobile navigation, and 360 CSS-pixel layout were checked. Targeted fixes provide reduced-motion loading behavior, arrow-key radio navigation, and 44 × 44 px targets for the measured mobile controls. Sampled muted-text contrast on Home and Quiz now exceeds 4.5:1 in both themes (minimum 5.05:1 light, 5.91:1 dark), and a 640 CSS-pixel reflow check had no horizontal overflow. A full app contrast audit, true browser 200% zoom check, and assistive-technology announcement test remain open.
- README quickstart, environment configuration, hosting guidance, architecture diagram, and desktop/mobile project screenshots are present.
- Deployment is **NOT RUN** and is deferred; no hosting or publication has been performed.
- Phase 5 remains in progress; Gate 5 is not passed.

**Gate 5 verification update (2026-10-30):**

- Backend tests: **47 passed**, with dependency deprecation warnings on Python 3.14.7. Coverage includes request/schema limits, health response, standardized validation/provider errors, timeout mapping, missing API key behavior, safe provider-error logging, rate limiting, and CORS.
- Frontend tests: **12 passed**. Production build: **passed**; mock responses remain development-only. Frontend source inspection confirms real request failures return user-visible errors rather than mock fixtures.
- Dependency audits: `npm audit --audit-level=low` found **0 vulnerabilities**. `pip-audit` found no known vulnerabilities in declared requirements or the installed backend environment. The audit utility was installed only in the ignored backend virtualenv; dependency manifests and lockfiles were not changed.
- Local production-config smoke check: Uvicorn started with `APP_ENV=production` and a single explicit HTTPS origin; `/api/health` returned 200, the configured CORS origin was allowed and an unlisted origin was rejected, and `/docs` plus `/openapi.json` returned 404. No model requests were made.
- Secret handling: `backend/.env` is ignored and not tracked; only `.env.example` templates are tracked. A local scan of 55 tracked files found no common API-key, token, or private-key signatures; values were not emitted.
- Feature review: the four panels still use their respective `api.js` endpoints; successful results alone are saved to local history, quiz scoring remains connected, and plan progress remains keyed by plan. No feature source changes were needed.
- The dedicated `RATE_LIMIT=20/minute` 21st-request `429` test now passes. No live model calls were made during this verification; real inference remains **BLOCKED** based on the earlier provider failures.
- Dashboard tool cards are now keyboard-operable semantic buttons, and quiz completion includes the final answer when persisting the score.
- Gate 5 remains **not passed**: remaining accessibility checks (full-app contrast, screen-reader announcements, and 200% zoom) are still open. Deployment is **NOT RUN** and remains deferred to Phase 9.

---

## Phase 6 — Demo polish (≈ 1–2 h)

- [ ] 6.1 Rehearse `10-Demo-Pitch.md` twice with a timer.
- [ ] 6.2 Record a 2-minute backup screen recording of the full flow.
- [ ] 6.3 Warm the backend 5 minutes before presenting; manually verify one successful live result per tool in History. `?demo=1` sample History is fallback material, not proof of live inference.
- [ ] 6.4 Check quota and API key validity the same day.
- [x] 6.5 Make `?demo=1` seed exactly one valid sample for each tool only when History is empty; preserve existing History, reject invalid seed data, handle unavailable storage safely, and use current consecutive plan dates. Focused tests and an isolated browser check pass.

### Demo-day checklist

**Live-ready — all checks must pass before presenting live AI:**

- [ ] Start the backend and verify `/api/health`; treat `ai_configured` as configuration only, not proof of inference.
- [ ] Run a real, successful smoke request for Explain, Summary, Quiz, and Study Plan; confirm the results render and are saved in History. Do not make paid calls during routine tests.
- [ ] Confirm provider quota and key validity without exposing the key.
- [ ] Confirm the browser points to the intended backend and `VITE_USE_MOCKS=false`; test the presentation browser, zoom, tabs, and notifications.
- [ ] Rehearse the full pitch twice and have a working two-minute offline recording.

**Fallback-ready — fixture/history fallback only:**

- [x] `?demo=1` safely seeds four sample History entries in an isolated empty browser profile; existing History is preserved, invalid seed data is rejected, and plan dates follow the current date.
- [ ] Verify the four saved samples are visible in the actual presentation browser before demo day.
- [ ] Record and test playback of the full-flow backup recording.
- Note: seeded History is static sample content. It does not enable API mocks, contact the model, or demonstrate that live inference works.

**Phase 6 gate: NOT PASSED.** Automated sample seeding is verified. Rehearsal, recording, day-of backend/quota checks, and live inference smoke tests remain manual; the last recorded live provider attempts failed, so live readiness remains **BLOCKED** until retested successfully.

**Phase 6 verification update (2026-10-30):**

- Local `/api/health` returned 200 with the configured model. Live English UI requests reached the provider, but none produced a valid saved result: Explain returned 504 after 58.4 s (invalid first output, then retry timeout); Summarize returned 502 after 44.8 s (both outputs failed validation); Quiz returned 504 after 30.0 s; Study Plan returned 504 after 30.0 s.
- Failed requests were not saved to History. Loading the documented fallback in the current isolated browser produced four visible sample entries, one per feature; verify them again in the actual presentation browser before demo day.
- Provider requests received HTTP 200 responses, indicating the configured key was accepted for those requests. Account quota was not independently verified. Rehearsal, recording, presentation-browser checks, and quota verification remain outstanding. Live readiness is **BLOCKED**.
- For the local development CORS allow-list, open the frontend at `http://localhost:5173` (not `http://127.0.0.1:5173`).

---

## Phase 7 — Adaptive AI Quiz (post-Phase-6 enhancement)

**Scope decision:** keep the existing fixed five-question quiz unchanged and add Adaptive Quiz as a separate opt-in flow. The adaptive flow is sequential: the client submits the completed answer and answer history, the backend validates it, and Gemma returns the next question or a targeted practice question. No client-side difficulty decisions or unvalidated model output are trusted.

### Planning and contract

- [ ] 7.1 Update `05-API-Spec.md`, `06-Prompt-Spec.md`, and `09-Testing-Deployment.md` with the adaptive quiz contract, limits, fallback behavior, and golden cases before implementation.
- [ ] 7.2 Define the adaptive session model: maximum 10 questions, difficulty levels `easy | medium | hard`, weak-concept tracking, stop conditions, and a deterministic session identifier.
- [ ] 7.3 Define privacy and persistence rules: keep only the adaptive session summary, score, difficulty history, and weak concepts in `localStorage`; do not persist raw notes or full answer text.

### Backend

- [ ] 7.4 Add request/output schemas for starting and advancing an adaptive quiz, including validated answer history, selected option, correct answer, concept tags, difficulty, and `next_action` (`continue | practice | complete`).
- [ ] 7.5 Add `POST /api/adaptive-quiz/start` and `POST /api/adaptive-quiz/answer` using the existing envelope, request limits, rate limiting, request IDs, and human-readable errors.
- [ ] 7.6 Add adaptive prompt builders that require one question at a time, preserve the original topic/material boundary, increase difficulty after correct answers, decrease or hold difficulty after incorrect answers, and target weak concepts with additional practice questions.
- [ ] 7.7 Reuse the existing Gemma parse → Pydantic validation → post-processing → one repair retry pipeline; reject duplicate options, invalid indices, unsupported difficulty jumps, prompt leakage, and questions unrelated to the supplied content.
- [ ] 7.8 Add deterministic post-processing for question IDs, difficulty transitions, score updates, weak-concept aggregation, the 10-question cap, and graceful completion when the provider fails.

### Frontend

- [ ] 7.9 Add an Adaptive Quiz entry point without changing the existing Quiz flow; include a clear “adaptive” mode label and an explanation of how difficulty changes.
- [ ] 7.10 Implement the adaptive state machine: start, answer, feedback, targeted practice, completion, retry, and provider-error states; prevent duplicate answer submissions.
- [ ] 7.11 Show current difficulty, progress, score, weak concepts, and why a practice question was generated; keep keyboard navigation, focus management, reduced-motion behavior, Hindi rendering, and screen-reader announcements consistent with the existing quiz.
- [ ] 7.12 Save and reopen an adaptive session summary through Study History; support retake/new session and safe recovery from malformed or unavailable `localStorage`.

### Verification gate

- [ ] 7.13 Add backend tests for difficulty transitions, incorrect-answer practice targeting, concept aggregation, answer-history validation, caps, retries, provider errors, rate limits, and envelope consistency.
- [ ] 7.14 Add frontend tests for the adaptive state machine, duplicate-submit guard, score persistence including the final answer, history reopen, malformed storage, and Hindi/keyboard states.
- [ ] 7.15 Run the adaptive mock-browser flow at 360/768/1280 CSS pixels and verify no console errors, no horizontal overflow, accessible focus, and correct local persistence.
- [ ] 7.16 Run one manual English and Hindi live adaptive session only after provider inference is healthy; record latency, output validity, difficulty changes, and targeted practice behavior in the task log.

**Phase 7 gate:** fixed quizzes remain unchanged; adaptive sessions pass backend/frontend tests and mock-browser checks; live provider behavior is either verified in both languages or explicitly recorded as blocked.

---

## Phase 8 — Stretch (only if time remains; not part of the MVP)

- [ ] 7.1 Streaming explanations (plain-text streaming for Explain only).
- [ ] 7.2 PDF/image notes upload (Gemma 4 supports image input via the Gemini API; verify limits first).
- [ ] 7.3 Offline demo provider via Ollama or another OpenAI-compatible local server behind `INFERENCE_PROVIDER`.
- [ ] 7.4 Translate UI labels to Hindi via a `strings.js` dictionary.
- [ ] 7.5 Export results/plan to PDF or calendar (.ics).

---

## Phase 9 — Final deployment and production verification (last phase; only after approval)

- [ ] 9.1 Confirm deployment target, publication authorization, production secrets, and hosting costs with the user. Never request or commit secrets in the repository.
- [ ] 9.2 Deploy the backend using `09 §6`; configure `APP_ENV=production`, backend-only `GEMINI_API_KEY`, and an explicit production `ALLOWED_ORIGINS`; verify `/api/health`.
- [ ] 9.3 Deploy the frontend using `VITE_API_BASE_URL`, `VITE_USE_MOCKS=false`, and the existing SPA rewrite; verify production requests never silently use mocks.
- [ ] 9.4 Restrict CORS to the exact deployed frontend origin and verify the browser's health/API calls.
- [ ] 9.5 After real provider inference is available, smoke-test all five feature flows in English and Hindi on a phone and laptop; check responsive layout, errors, and browser console.

**Final deployment gate:** only declare deployment complete when the approved deployed URL passes health, CORS, all eight live feature/language smoke tests, and phone/laptop checks. If provider inference or deployment approval is unavailable, report the gate as blocked/not run.

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
| 2026-10-28 | Phase 4.5 | Persisted session check-offs under each plan's local history ID, added an accessible percentage progress bar, and surfaced storage failures without hiding current changes. Verified toggling, keyboard activation, reload, independent plans, empty plans, malformed progress, and quota failure with mock data. | No |
| 2026-10-28 | Phase 4.4, 4.6, 4.7 | Verified quiz score persistence and History statistics, fixed quiz-from-saved-result prefill, and moved `?demo=1` seeding to app startup. Expanded the demo quiz to five questions and removed a React warning from score persistence. Mock-browser checks covered all four tools, history prefill, score stats across reload, and demo seeding; the production build passed. Live Hindi model output remains unverified because no backend API key is configured. | No |
| 2026-10-29 | Phase 5 (partial) | Hardened backend and frontend API handling, upgraded vulnerable frontend dependencies, audited Python packages, and updated deployment guidance. Backend tests 46/46, frontend tests 6/6, production build passed, npm audit 0 findings, pip-audit 0 findings after updating ignored virtualenv pip. Mock-browser acceptance passed for the listed flows. Four live endpoint attempts failed with safe provider/model error envelopes; real inference and deployment remain blocked/not run. | Yes |
| 2026-10-29 | Phase 5 accessibility follow-up | Added reduced-motion handling for loading status, arrow-key/roving-tabindex behavior to the Explain, Summary, and Quiz radio groups, and 44 × 44 px targets to the header, segmented controls, and compact result actions. Mock-browser checks verified arrow-key selection, reduced-motion animation suppression, and visible mobile button sizes at 360 CSS pixels; the complete accessibility checklist remains open. | Yes |
| 2026-10-30 | Phase 5 verification follow-up | Confirmed the dedicated 21st-request rate-limit test, updated the checklist for the current 47 backend and 12 frontend tests, converted dashboard tool cards to keyboard-operable buttons, and fixed final-answer omission in quiz score persistence. Full contrast, screen-reader, 200% zoom, live-provider, and deployment checks remain blocked or manual. | Yes |
| 2026-10-30 | Adaptive Quiz planning | Added a post-Phase-6 Phase 7 for an opt-in sequential adaptive quiz, with separate API contracts, validated difficulty/weak-concept transitions, local summary persistence, accessibility requirements, mock/live verification, and explicit limits. Renumbered stretch and deployment to Phases 8 and 9. | Yes |
