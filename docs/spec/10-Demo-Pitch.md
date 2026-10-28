# Demo Script and Pitch Outline — StudySpark AI

*Learn Smarter, Not Harder.* 📚

---

## 1. 3-minute live demo script

| Time | Action | What to say |
|---|---|---|
| 0:00 | Open the deployed app on a laptop (phone mirrored if possible) | "Students don't lack content, they lack clear explanations, good revision and a plan. StudySpark AI gives all three in one place." |
| 0:15 | **Explain:** type "Ohm's law", level Beginner → Explain it | "Plain language, a real example, and key points — pitched to the student's level." |
| 0:45 | Toggle **हिं**, re-run the same topic | "Same tool in Hindi. Many students think and study in Hindi, and most tools ignore them." |
| 1:05 | **Summarize:** paste ~300 words of notes (your own text) → Summarize | "Long notes become a short summary, key points and key terms. It only uses what's in the notes." |
| 1:35 | Click **Quiz me on this** → answer two questions (one right, one wrong) | "Self-testing is the best way to learn. Each answer gets instant feedback and an explanation." |
| 2:05 | Jump to results (or use a pre-saved one): show the score | "Five questions, scored, with review." |
| 2:15 | **Study Plan:** Physics (3 days), Maths (6 days), 3 h/day → Create my plan; tick two sessions | "A realistic schedule that respects deadlines and daily time. Progress is saved." |
| 2:45 | Open **History**, then toggle dark mode | "Everything is saved on the device, no login needed." |
| 2:55 | Close | "Built with Gemma 4, an open model, FastAPI and React." |

### Demo-day checklist

**Live-ready** — use the live pitch only after each item is verified:

- [ ] Backend `/api/health` responds. `ai_configured` only confirms a non-empty key is configured; it does not prove inference.
- [ ] Real, successful smoke requests work for all four features and their results are saved in History.
- [ ] Provider key validity and quota are checked privately; never show or log the key.
- [ ] Presentation browser uses the intended backend with `VITE_USE_MOCKS=false`; zoom is 100%, notifications are off, and notes are ready locally.
- [ ] Rehearse twice and test the offline backup recording.

**Fallback-ready** — if live inference is blocked:

- [x] `?demo=1` seeds four static sample History records in an empty browser profile without overwriting existing History; invalid seed data is rejected and plan dates are current.
- [ ] Verify those samples in the presentation browser and have the tested backup recording ready.
- Seeded History is sample content only; it is not evidence that the backend or model is live.

## 2. Pitch outline (6–8 slides)

1. **Title.** StudySpark AI, tagline, team.
2. **Problem.** Hard topics, long notes, no self-testing, poor planning, English-only tools.
3. **Solution.** Four tools in one app: Explain · Summarize · Quiz · Study Plan, in English and Hindi.
4. **Live demo** (or the recording).
5. **How it works.** Architecture diagram: React → FastAPI → Gemma 4; structured JSON, validated output, retry; localStorage only.
6. **Why Gemma 4.** Open-weights model (Apache 2.0): can be self-hosted later for low-connectivity schools; served today through the Gemini API; strong enough for structured study tasks. *(Say "strong multilingual capability" only after you have verified Hindi quality at Gate 0.)*
7. **Impact and what's next.** Students get active study support at no cost; roadmap: PDF/image notes, streaming, offline mode with a local model, UI in Hindi, calendar export, teacher view.
8. **Ask / thank you.**

## 3. Engineering points worth mentioning (judges like these)

- Output is **validated** (schemas, retry, safe errors), so the UI never breaks on a bad model response.
- The backend **shuffles quiz answers and computes dates itself**, because models are unreliable at both.
- The API key stays **server-side**; CORS allow-list and rate limiting are in place.
- Graceful degradation: cold-start banner, friendly errors, history works offline.
- Spec-driven build: PRD, TRD, API contract and prompt spec drove the implementation.

## 4. Likely questions and answers

| Question | Answer |
|---|---|
| Does the AI make mistakes? | Yes. Prompts require accuracy and admitting uncertainty; the summarizer only uses the student's notes; the UI shows a verify-facts notice. |
| Why Gemma 4 and not another model? | Open weights give flexibility (hosted now, self-hosted later), good quality for study tasks, and it is available through a simple API. |
| What about privacy? | No accounts and no server-side storage of user content; history stays in the browser. Text is sent to the model provider, so the app warns against entering personal data. |
| Why no flashcards? | We cut scope to ship four polished tools; the quiz covers active recall for the MVP. |
| How does it scale? | The backend is stateless; add instances and caching. The model call is the bottleneck, so a larger quota or self-hosting handles growth. |
| What if the internet is bad? | History and saved results work offline; a local-model option is on the roadmap. |

## 5. Backup plan

1. Model or network failure → play the recorded demo and show the seeded History.
2. Backend asleep → keep the "waking up" banner visible and narrate it as a design decision.
3. Wrong output on stage → re-run once; if still wrong, switch to the pre-saved result in History.
