# Product Requirements Document (PRD) — StudySpark AI

| | |
|---|---|
| **Product** | StudySpark AI — *Learn Smarter, Not Harder.* |
| **Version** | 1.0 (hackathon MVP) |
| **Platform** | Responsive web app |
| **AI model** | Gemma 4 |

---

## 1. Overview

StudySpark AI is a single web app that helps students study actively instead of passively. A student types a topic or pastes notes, picks a tool, and gets a clear result: a simple explanation, a short summary, a 5-question quiz, or a day-by-day study plan.

## 2. Problem

- Textbooks and lectures explain things at one level; students get stuck on hard topics with nobody to ask.
- Long notes are hard to revise from, and students don't know what to focus on.
- Self-testing is the most effective way to learn, but making quizzes takes effort.
- Planning study time around deadlines is stressful and usually done badly.
- Many tools are English-only, which leaves out students who think and study in Hindi.

## 3. Target users

| Persona | Needs |
|---|---|
| **Ananya, Class 11 science student** | Plain-language explanations of tough concepts; quick self-tests before class tests |
| **Rohan, engineering undergrad** | Turn long lecture notes into revision points; a plan that fits exams in 10 days |
| **Meera, Hindi-medium learner** | Explanations and quizzes in Hindi without switching tools |

## 4. Goals and non-goals

**Goals**
1. Four tools that each work end-to-end in under ~15 seconds typical response.
2. One simple, friendly interface any student can use with no instructions.
3. Reliable, well-formed output — the UI never breaks because the model misbehaved.
4. A smooth live demo.

**Non-goals (MVP)**
Accounts or login · server-side database · file or PDF upload · streaming responses · flashcards (removed) · payments · teacher or parent features · native mobile apps.

## 5. Features and acceptance criteria

### F1 — AI Topic Explainer (Must)
*As a student, I want a difficult topic explained simply with an example so I can understand it quickly.*
- Input: topic (3–500 chars) and a level: Beginner (default) / Intermediate / Advanced.
- Output: title, explanation (2–4 short paragraphs), a concrete example, 3–5 key points, a one-line recap.
- Wording and depth match the chosen level. Hindi output when Hindi is selected.
- Submit is disabled for empty or too-short input; errors are friendly and retryable.

### F2 — Smart Note Summarizer (Must)
*As a student, I want my long notes condensed so I can revise faster.*
- Input: notes (50–8000 chars) and length: Short (default) / Medium.
- Output: summary, 3–7 key points, and up to 6 key terms with meanings.
- Summary is clearly shorter than the input and adds no facts that aren't in the notes.
- Live character counter; over-limit input is blocked with a clear message.

### F3 — AI Quiz Generator (Must)
*As a student, I want to test myself on a topic or my notes.*
- Input: a topic or pasted notes (3–6000 chars) and difficulty: Easy / Medium (default) / Hard.
- Output: **exactly 5** multiple-choice questions, 4 options each, one correct answer, and an explanation per question.
- Interactive: answer one question at a time, check it, read the explanation, see the final score and a review of all questions.
- Option order is randomized by the backend.

### F4 — AI Study Plan Generator (Must)
*As a student, I want a realistic schedule that respects my deadlines and time.*
- Input: 1–6 subjects (name, optional deadline, optional topics to cover), hours available per day (0.5–12), optional start date (defaults to today).
- Output: day-by-day sessions (subject, topic, minutes, activity: learn / practice / revise / test), a short summary and 3–5 tips.
- Every subject appears at least once; no session for a subject after its deadline; daily minutes stay within the available time (±10%); revision/test sessions land near deadlines.
- The plan covers at most 14 days per generation and says so when a deadline is further away.

### Enhancements
| # | Enhancement | Priority | Acceptance |
|---|---|---|---|
| E1 | Hindi / English language support | Should | A header toggle switches AI output language; Hindi renders correctly in Devanagari |
| E2 | Study history (localStorage) | Should | Last 50 results saved automatically, viewable and deletable on the History page |
| E3 | Dark mode | Should | Toggle plus system preference; persists across visits; no unreadable elements |
| E4 | Quiz score tracking | Could | Scores saved with history; History shows best and average |
| E5 | Study-plan progress tracking | Could | Sessions can be ticked off; progress bar persists after refresh |
| E6 | "Quiz me on this" from an explanation or summary | Could | Pre-fills the Quiz tool with that content |

## 6. Key user flow

Land on Home → pick a tool in the sidebar → enter input → submit → see a loading state → read the result inline → (optionally) copy it or continue to another tool → find it later in History.

## 7. Success metrics (demo and judging)

| Metric | Target |
|---|---|
| All four tools work end-to-end on the deployed URL | 4 / 4 |
| Typical response time | Explain/Summarize ≤ 10 s, Quiz/Plan ≤ 15 s |
| Schema-valid responses on the golden test set | 100% (after retry) |
| Hindi output readable and correct on spot-check | Yes |
| Unhandled UI errors during the demo | 0 |
| New user completes a first task without help | < 30 s |

## 8. Assumptions

- A Gemini API key with Gemma 4 access is available and within quota for the demo.
- Students use modern browsers on phones or laptops.
- Notes pasted by users are their own; the app does not process copyrighted books at scale.
- The model can make mistakes: the UI carries a short "AI can be wrong — verify important facts" notice.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Model returns malformed JSON | Defensive parsing, Pydantic validation, one automatic retry, clean error fallback |
| Hindi quality is weaker than expected | Verify at Gate 0; shorten prompts; fall back to simple Hindi with English technical terms |
| Slow or cold backend during the demo | Health ping on load with a "waking up" banner; warm the server before presenting |
| API rate limits or quota | Retry with backoff; friendly 429 message; backend rate limiting; pre-save demo results |
| Hallucinated facts in explanations | Prompt requires accuracy and admitting uncertainty; visible disclaimer |
| Scope creep | MoSCoW priorities above; Phase 4 items are cut first |

## 10. Open questions
1. Exact hackathon time limit and judging criteria?
2. Should the interface labels also be translated to Hindi?
3. Preferred backend host?
