# API Specification — StudySpark AI

**This is the contract between frontend and backend.** Both sides build against it; the frontend's mock fixtures are copied from the examples below.

Base URL: `VITE_API_BASE_URL` (default `http://localhost:8000`). All AI endpoints are `POST` with `Content-Type: application/json`.

---

## 1. Conventions

**Success envelope**
```json
{ "ok": true, "data": { }, "meta": { "model": "gemma-4-26b-a4b-it", "language": "en", "latency_ms": 4210, "attempts": 1 } }
```

**Error envelope**
```json
{ "ok": false, "error": { "code": "MODEL_OUTPUT_INVALID", "message": "We couldn't format that answer. Please try again.", "retryable": true } }
```

**Shared enums**

| Name | Values | Default |
|---|---|---|
| `language` | `en`, `hi` | `en` |
| `level` | `beginner`, `intermediate`, `advanced` | `beginner` |
| `length` | `short`, `medium` | `short` |
| `difficulty` | `easy`, `medium`, `hard` | `medium` |
| `activity` | `learn`, `practice`, `revise`, `test` | — |

Strings are trimmed server-side. Unknown request fields are ignored. All limits are in `02-TRD.md §6`.

## 2. Error codes

| Code | HTTP | Retryable | When |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | no | Request fails validation (include `field` in `error.details`) |
| `UNSUITABLE_INPUT` | 422 | no | Model reports the input isn't a usable study topic/notes |
| `RATE_LIMITED` | 429 | yes | Per-IP limit or upstream 429 |
| `MODEL_OUTPUT_INVALID` | 502 | yes | Output still invalid after retry |
| `MODEL_UNAVAILABLE` | 503 | yes | Key missing/invalid, upstream 5xx, network |
| `MODEL_TIMEOUT` | 504 | yes | Model call exceeded the timeout |
| `INTERNAL_ERROR` | 500 | yes | Anything unexpected |

`VALIDATION_ERROR` example (FastAPI's default 422 body must be replaced by this):
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Topic must be between 3 and 500 characters.", "retryable": false, "details": { "field": "topic" } } }
```

---

## 3. `GET /api/health`

No model call. Always fast.
```json
{ "status": "ok", "ai_configured": true, "model": "gemma-4-26b-a4b-it", "version": "1.0.0" }
```

---

## 4. `POST /api/explain`

**Request**
```json
{ "topic": "Ohm's law", "level": "beginner", "language": "en" }
```
| Field | Type | Rules |
|---|---|---|
| `topic` | string | required, 3–500 |
| `level` | enum | optional |
| `language` | enum | optional |

**`data`**
```json
{
  "title": "Ohm's Law",
  "explanation": "Ohm's law tells us how voltage, current and resistance are connected in a simple circuit.\n\nThink of voltage as the push that moves electric charge, current as the flow of that charge, and resistance as how hard it is for the charge to move. If you push harder, more flows. If the path is narrower, less flows.",
  "example": "A 6 V battery connected to a 3 ohm bulb gives a current of 2 amperes, because 6 divided by 3 is 2.",
  "key_points": [
    "The formula is V = I x R",
    "Voltage is measured in volts, current in amperes, resistance in ohms",
    "For a fixed resistance, more voltage means more current",
    "It applies to ohmic materials such as most metal wires at constant temperature"
  ],
  "quick_recap": "Voltage equals current times resistance."
}
```
Validation: `title`, `explanation`, `example`, `quick_recap` non-empty strings; `key_points` 3–5 non-empty strings (clamped to 5).

---

## 5. `POST /api/summarize`

**Request**
```json
{ "notes": "Photosynthesis is the process by which green plants make food using sunlight ...", "length": "short", "language": "en" }
```
| Field | Type | Rules |
|---|---|---|
| `notes` | string | required, 50–8000 |
| `length` | enum | optional |
| `language` | enum | optional |

**`data`**
```json
{
  "summary": "Plants use sunlight, water and carbon dioxide to make glucose in their chloroplasts, releasing oxygen as a by-product.",
  "key_points": [
    "Happens mainly in chloroplasts",
    "Chlorophyll absorbs sunlight",
    "Inputs: water, carbon dioxide, light",
    "Outputs: glucose and oxygen"
  ],
  "key_terms": [
    { "term": "Chlorophyll", "meaning": "The green pigment that captures light energy" },
    { "term": "Chloroplast", "meaning": "The cell part where photosynthesis takes place" }
  ]
}
```
Validation: `summary` non-empty; `key_points` 3–7 (clamped to 7); `key_terms` 0–6 objects with non-empty `term` and `meaning` (clamped to 6). The summary must contain only information from the notes (enforced by prompt).

---

## 6. `POST /api/quiz`

**Request**
```json
{ "content": "Photosynthesis", "difficulty": "easy", "language": "en" }
```
| Field | Type | Rules |
|---|---|---|
| `content` | string | required, 3–6000 (a topic **or** pasted notes) |
| `difficulty` | enum | optional |
| `language` | enum | optional |

**`data`** — exactly 5 questions; options already shuffled by the backend; `correct_index` is 0-based and refers to the shuffled `options`.
```json
{
  "topic": "Photosynthesis",
  "questions": [
    { "id": "q1", "question": "Which pigment absorbs sunlight during photosynthesis?",
      "options": ["Chlorophyll", "Haemoglobin", "Melanin", "Keratin"], "correct_index": 0,
      "explanation": "Chlorophyll is the green pigment in chloroplasts that captures light energy." },
    { "id": "q2", "question": "Which gas is released as a by-product of photosynthesis?",
      "options": ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"], "correct_index": 2,
      "explanation": "Water is split during the light reactions and oxygen is released." },
    { "id": "q3", "question": "Where in a plant cell does photosynthesis mainly take place?",
      "options": ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], "correct_index": 3,
      "explanation": "Chloroplasts contain chlorophyll and the machinery for photosynthesis." },
    { "id": "q4", "question": "Which raw materials do plants need for photosynthesis?",
      "options": ["Oxygen and glucose", "Water and carbon dioxide", "Nitrogen and water", "Glucose and oxygen"], "correct_index": 1,
      "explanation": "Plants take in water through roots and carbon dioxide through leaves." },
    { "id": "q5", "question": "What food does the plant make during photosynthesis?",
      "options": ["Glucose", "Lactose", "Protein", "Cholesterol"], "correct_index": 0,
      "explanation": "The plant builds glucose, which it uses for energy or stores as starch." }
  ]
}
```
Validation: exactly 5 questions; each has non-empty `question`, **4 distinct non-empty options**, `correct_index` 0–3, non-empty `explanation`. Extras are truncated to 5; fewer than 5 triggers the retry path.

---

## 7. `POST /api/study-plan`

**Request**
```json
{
  "subjects": [
    { "name": "Physics", "deadline": "2026-10-30", "topics": "Electricity, magnetism" },
    { "name": "Maths", "deadline": "2026-11-02" }
  ],
  "daily_hours": 3,
  "start_date": "2026-10-27",
  "language": "en"
}
```
| Field | Type | Rules |
|---|---|---|
| `subjects` | array | 1–6 items |
| `subjects[].name` | string | required, 1–80 |
| `subjects[].deadline` | `YYYY-MM-DD` | optional; ≥ `start_date`, ≤ `start_date` + 30 days |
| `subjects[].topics` | string | optional, ≤ 300 |
| `daily_hours` | number | 0.5–12, step 0.5 |
| `start_date` | `YYYY-MM-DD` | optional; client sends its local date; default server date |
| `language` | enum | optional |

**Horizon:** `horizon_days = min(14, (latest_deadline − start_date).days + 1)`; if no deadlines, 7. `truncated` is true when the latest deadline is beyond the 14-day cap.

**`data`** (3-day example shown; a real response has `horizon_days` days)
```json
{
  "summary": "Physics gets priority because its deadline is first; Maths fills the remaining time and revision happens near each deadline.",
  "horizon_days": 3,
  "truncated": false,
  "days": [
    { "day": 1, "date": "2026-10-27", "sessions": [
      { "id": "d1-s1", "subject": "Physics", "topic": "Electricity basics", "minutes": 90, "activity": "learn" },
      { "id": "d1-s2", "subject": "Maths", "topic": "Chapter overview", "minutes": 60, "activity": "learn" },
      { "id": "d1-s3", "subject": "Physics", "topic": "Practice numericals", "minutes": 30, "activity": "practice" } ] },
    { "day": 2, "date": "2026-10-28", "sessions": [
      { "id": "d2-s1", "subject": "Physics", "topic": "Magnetism", "minutes": 90, "activity": "learn" },
      { "id": "d2-s2", "subject": "Maths", "topic": "Problem practice", "minutes": 90, "activity": "practice" } ] },
    { "day": 3, "date": "2026-10-29", "sessions": [
      { "id": "d3-s1", "subject": "Physics", "topic": "Full revision", "minutes": 90, "activity": "revise" },
      { "id": "d3-s2", "subject": "Physics", "topic": "Mini test", "minutes": 60, "activity": "test" },
      { "id": "d3-s3", "subject": "Maths", "topic": "Revision", "minutes": 30, "activity": "revise" } ] }
  ],
  "tips": [
    "Start with the hardest topic while your energy is high.",
    "Take a 5-minute break after every 45 minutes.",
    "Test yourself at the end of each day for 10 minutes."
  ]
}
```

**Validation and post-processing (backend)**
- The model returns `day` as an integer 1…N; the **backend** adds `date` and `id`s.
- Drop days outside 1…`horizon_days`; fill missing days with `sessions: []` (rest day); sort by `day`.
- Drop any session whose subject has a deadline earlier than that day's date (match subject names case-insensitively; unmatched names are kept).
- Clamp `minutes` to 5–240. If a day's total exceeds `daily_hours × 60 × 1.1`, log a warning (no failure).
- Each requested subject must appear at least once; if not, retry once; if still missing, return the plan as is and add a note in `tips`.
- `tips`: 3–5 strings (clamped).

---

## 8. Frontend mock mode

`services/mocks.js` exports one fixture per endpoint, copied from the examples above (the quiz fixture contains all 5 questions). With `VITE_USE_MOCKS=true`, `api.js` returns them wrapped in the success envelope after an artificial ~800 ms delay. Add one fixture per error code for UI testing, selectable with `?mockError=RATE_LIMITED` in the URL.

## 9. CORS and headers

Allowed origins from `ALLOWED_ORIGINS`; allowed methods `GET, POST, OPTIONS`; allowed headers `Content-Type`. Each response includes `X-Request-Id`.
