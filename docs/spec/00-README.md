# StudySpark AI — Antigravity Build Pack
**Tagline:** Learn Smarter, Not Harder. 📚

One frontend (Vite + React) + one backend (FastAPI) + one AI model (Gemma 4) + four features: **Explain a Topic · Summarize Notes · Generate Quiz · Generate Study Plan.**

This pack turns your architecture note into a spec-driven build: everything Antigravity needs to build the MVP without re-explaining the project in every chat.

---

## 1. What's in the pack

| File | Purpose |
|---|---|
| `AGENTS.md` | Short always-on rules. **Copy to the repo root** — Antigravity reads it automatically. |
| `00-README.md` | This file: setup, kickoff prompts, decisions log |
| `01-PRD.md` | What and why: users, features, acceptance criteria, scope |
| `02-TRD.md` | Stack, model access, non-functional requirements, security, limits |
| `03-System-Design.md` | Architecture, backend/frontend module design, localStorage model, project structure |
| `04-Flows.md` | User flows, request lifecycle, retry logic, quiz state machine (Mermaid) |
| `05-API-Spec.md` | Endpoints, request/response schemas, errors, mock fixtures — **the contract** |
| `06-Prompt-Spec.md` | System + per-feature prompts, output schemas, language rules, guardrails |
| `07-UI-UX-Spec.md` | Screens, components, design tokens, states, accessibility |
| `08-Implementation-Plan.md` | Phased checkbox backlog with gates — the agent's task list |
| `09-Testing-Deployment.md` | Test plan, golden inputs, Vercel + backend deployment |
| `10-Demo-Pitch.md` | 3-minute demo script, pitch outline, backup plan |

---

## 2. Setup (10 minutes)

1. Create the repo `studyspark-ai/`. Copy `AGENTS.md` to the root and the numbered docs into `docs/spec/`.
2. Get a Gemini API key from Google AI Studio. Gemma 4 is served through the Gemini API under the model IDs `gemma-4-26b-a4b-it` (faster, default) and `gemma-4-31b-it` (higher quality).
3. Open the repo in Antigravity. Create `backend/.env` from the template below.
4. Paste the kickoff prompt (§3) into the Manager.

### Environment variables

**`backend/.env`** (never commit; commit `.env.example` with blank values)

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | — | Required |
| `GEMMA_MODEL` | `gemma-4-26b-a4b-it` | Or `gemma-4-31b-it` |
| `INFERENCE_PROVIDER` | `gemini_api` | Only value implemented in the MVP |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated; add the Vercel URL in production |
| `RATE_LIMIT` | `20/minute` | Per IP |
| `MODEL_TIMEOUT_SECONDS` | `30` | Per model call |
| `LOG_LEVEL` | `INFO` | |

**`frontend/.env`** (public values only — anything `VITE_*` ships to the browser)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend URL |
| `VITE_USE_MOCKS` | `false` | `true` = fixtures from `05-API-Spec`, no backend needed |

---

## 3. Ready-to-paste prompts for Antigravity

**Kickoff (one agent, safest):**
> Read `AGENTS.md` and everything in `docs/spec/`. Execute `08-Implementation-Plan.md` from Phase 0 to Phase 3, ticking each task as you finish it. Stop at every Gate and show me how you verified it. Do not deviate from the stack, API contract or project structure; if you think the spec is wrong, stop and tell me.

**Parallel (Manager view, two agents):**
> **Agent A (backend):** Execute Phase 0.1–0.4 then Phase 1 of `08-Implementation-Plan.md`. Contract: `05-API-Spec.md`. Prompts: `06-Prompt-Spec.md`.
> **Agent B (frontend):** Execute Phase 0.5 then Phases 2–3 of `08-Implementation-Plan.md` using `VITE_USE_MOCKS=true`. Contract: `05-API-Spec.md`. UI: `07-UI-UX-Spec.md`.
> Do not edit each other's folders. When both finish, I will ask for the integration pass.

**Integration + review:**
> Switch the frontend to the real backend (`VITE_USE_MOCKS=false`). Run the golden inputs in `09-Testing-Deployment.md §3` in English and Hindi. Fix mismatches against `05-API-Spec.md`. Report anything that still fails.

**Enhancements:** Phase 4 → "Execute Phase 4 of `08-Implementation-Plan.md`; skip tasks marked *Could* unless time remains."

---

## 4. Decisions I made where your architecture note was open

| # | Decision | Why |
|---|---|---|
| 1 | "Results page" = results render **inline** under each form. History is the only extra page. | Matches your structure (only `Home` + `StudyHistory`); simpler and faster to demo |
| 2 | All four endpoints return **structured JSON**, validated by Pydantic | Needed for interactive quizzes and plan check-offs; prevents broken UI from free-text output |
| 3 | The **backend** adds ids and real dates; the model never does | Models are unreliable at dates and stable ids |
| 4 | Backend **shuffles quiz options** and remaps the answer | Removes the model's habit of favouring one option position |
| 5 | Model text is **plain text, no markdown** | Safe rendering, no extra dependency, no XSS surface |
| 6 | Gemma 4 accessed via the **Gemini API** (`google-genai`) | Simplest hosted path; open weights keep a local/Ollama option for later |
| 7 | No reliance on native JSON mode; parse defensively and retry once | Not guaranteed for Gemma models; defensive parsing works everywhere |
| 8 | Study plans cap at **14 days** per generation | Keeps output reliable and fast |
| 9 | Additive files (mocks, hooks, context, config) are allowed and listed in `03 §6` | Your tree stays intact; these only support it |
| 10 | Flashcards fully excluded | As you specified |

## 5. Please confirm (defaults are used if you don't)
- **Which hackathon / time limit?** Plan assumes roughly 16–24 focused hours.
- **UI language:** only AI *output* switches to Hindi by default; button labels stay English. Say so if you want a translated UI too.
- **Backend host:** the docs default to Render; Railway, Fly.io or Cloud Run work identically.
- **Hindi quality:** verify it at Gate 0 before building around it.
