# AGENTS.md — StudySpark AI

You are building **StudySpark AI**, a hackathon MVP: one Vite + React frontend, one FastAPI backend, Gemma 4 as the AI model, four features (Explain a Topic, Summarize Notes, Generate Quiz, Generate Study Plan). Keep it simple, demo-able and correct. Flashcards were deliberately removed — do not add them.

## Source of truth
Specs live in `docs/spec/`. Read in this order before coding: `05-API-Spec` → `06-Prompt-Spec` → `03-System-Design` → `07-UI-UX-Spec` → `08-Implementation-Plan`.
If code and spec disagree, the spec wins. If the spec is wrong or ambiguous, stop, flag it, and update the spec in the same change.

## Stack (do not change without asking)
- Frontend: Vite + React (JavaScript, `.jsx` — not TypeScript), Tailwind CSS, react-router-dom, lucide-react
- Backend: Python 3.11+, FastAPI, Pydantic v2, `google-genai` SDK, slowapi
- Model: Gemma 4 via the Gemini API (`GEMMA_MODEL`, default `gemma-4-26b-a4b-it`)
- Storage: browser `localStorage` only. No database, no accounts.

## Commands
- Backend: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`
- Frontend: `cd frontend && npm install && npm run dev` (port 5173)
- Backend tests: `cd backend && pytest`
- Frontend with fake data: set `VITE_USE_MOCKS=true`

## Non-negotiable rules
1. The Gemini API key lives only in `backend/.env`. Never in frontend code, never in a `VITE_*` variable, never committed. Commit `.env.example` only.
2. The frontend talks to the backend only through `frontend/src/services/api.js`.
3. Never trust model output: parse → validate with Pydantic → post-process → retry once → otherwise return a clean error envelope.
4. Every response uses the envelope in `05-API-Spec`: `{ok, data, meta}` or `{ok:false, error}`.
5. Model output is plain text. Never use `dangerouslySetInnerHTML`.
6. Every async UI has loading, error and empty states. Errors are human-readable, never stack traces.
7. Stay inside the project structure in `03-System-Design §6`. Only the additive files listed there are allowed.
8. Use Tailwind utilities and the design tokens in `07-UI-UX-Spec`. No extra UI component libraries.
9. Do not log raw user notes or topics at INFO level.

## Working style
- Work through `08-Implementation-Plan.md` top to bottom; tick each task when done; stop at each **Gate** and verify it.
- Small commits, one task per commit.
- Backend and frontend can be built in parallel once `05-API-Spec` is read: the frontend uses `VITE_USE_MOCKS=true` fixtures until the backend is ready.
- After each phase, produce a short walkthrough (what works, how to run it, screenshots for UI).

## Definition of done (every task)
Runs locally with no console errors · matches the spec · edge cases from `09-Testing-Deployment` handled · no secrets in the diff · tests added or updated where the plan says so.
