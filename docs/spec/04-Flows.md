# User Flows and System Flows — StudySpark AI

---

## 1. Overall user journey

```mermaid
flowchart TD
    A["Open StudySpark AI"] --> B["Health ping runs silently"]
    B --> C["Home: pick a tool in the sidebar"]
    C --> D1["Explain a Topic"]
    C --> D2["Summarize Notes"]
    C --> D3["Generate Quiz"]
    C --> D4["Generate Study Plan"]
    C --> D5["History"]
    D1 --> E["Fill the form and submit"]
    D2 --> E
    D3 --> E
    D4 --> E
    E --> F["Loading state"]
    F -->|success| G["Result shown inline and saved to history"]
    F -->|error| H["Friendly message plus Try again"]
    H --> E
    G --> I{"Next step"}
    I -->|"Quiz me on this"| D3
    I -->|"Use another tool"| C
    I -->|"Copy result"| J["Copied to clipboard"]
    D5 --> K["Open a saved result, delete, or clear all"]
```

## 2. Request lifecycle (all AI features)

```mermaid
sequenceDiagram
    actor S as Student
    participant UI as React panel
    participant AP as api.js
    participant BE as FastAPI
    participant GS as gemma_service
    participant G as Gemma 4 via Gemini API
    S->>UI: Submit form
    UI->>UI: Client-side validation
    UI->>AP: call feature function with payload
    AP->>BE: POST /api/feature (JSON)
    BE->>BE: Rate limit and Pydantic validation
    BE->>GS: generate_json(system, user, output model)
    GS->>G: generate_content
    G-->>GS: text
    GS->>GS: Extract JSON and validate
    GS-->>BE: Validated output plus meta
    BE->>BE: Post-process (ids, dates, shuffle)
    BE-->>AP: ok true, data, meta
    AP-->>UI: data
    UI->>UI: Render result and save to history
```

## 3. Model call with parse, repair and retry

```mermaid
flowchart TD
    A["Build system and user prompt"] --> B["Call model with timeout"]
    B -->|"timeout"| T["Error MODEL_TIMEOUT"]
    B -->|"429"| R1{"Attempts left?"}
    B -->|"5xx or network"| R2{"Attempts left?"}
    B -->|"text received"| C["Strip fences, extract outer braces, json.loads"]
    R1 -->|yes| W["Wait about 1.5 s"] --> B
    R1 -->|no| E1["Error RATE_LIMITED"]
    R2 -->|yes| B
    R2 -->|no| E2["Error MODEL_UNAVAILABLE"]
    C -->|"parse failed"| V{"Attempts left?"}
    C -->|"parsed"| D{"Has error key?"}
    D -->|yes| U["Error UNSUITABLE_INPUT"]
    D -->|no| F["Validate with Pydantic output model"]
    F -->|valid| OK["Return validated output"]
    F -->|invalid| V
    V -->|"yes: add repair instruction"| B
    V -->|no| E3["Error MODEL_OUTPUT_INVALID"]
```
Maximum 2 attempts in total across all retry reasons.

## 4. Quiz interaction state machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Generating: submit
    Generating --> Error: failure
    Error --> Generating: try again
    Generating --> Answering: 5 questions received
    Answering --> Checked: select option, check answer
    Checked --> Answering: next question
    Checked --> Finished: last question checked
    Finished --> Idle: new quiz
    Finished --> Answering: retake same quiz
    Finished --> [*]
```
On `Finished`: show score, per-question review with explanations, and save the score (E4).

## 5. Study plan: generation and progress

```mermaid
flowchart TD
    A["Student enters subjects, deadlines, daily hours"] --> B["Client validation"]
    B --> C["POST /api/study-plan with start_date"]
    C --> D["Backend computes horizon_days, max 14"]
    D --> E["Model returns days numbered 1..N with sessions"]
    E --> F["Backend maps day numbers to real dates"]
    F --> G["Drop sessions after each subject deadline, fill rest days, add ids"]
    G --> H["Plan rendered as day cards"]
    H --> I["Student ticks sessions"]
    I --> J["Progress saved in localStorage by entry id"]
    J --> K["Progress bar updates, survives refresh"]
```

## 6. History and storage flow

```mermaid
flowchart TD
    A["Result received"] --> B["Build HistoryEntry"]
    B --> C["Prepend to list, cap at 50"]
    C --> D{"Write to localStorage succeeds?"}
    D -->|yes| E["Done"]
    D -->|"quota exceeded"| F["Evict oldest entries and retry"]
    F --> D
    G["Open History page"] --> H["Read and parse list safely"]
    H -->|"corrupt or missing"| I["Empty state, reset key"]
    H -->|ok| J["List entries, filter by type"]
    J --> K["Open entry: render with the same Result component, read-only"]
    J --> L["Delete one or clear all with confirmation"]
```

## 7. Cold start and health

```mermaid
flowchart TD
    A["App loads"] --> B["GET /api/health"]
    B -->|"answers within 3 s"| C["Status dot green"]
    B -->|"no answer after 3 s"| D["Show Waking up the study engine banner"]
    D --> E["Keep polling every 3 s, up to 60 s"]
    E -->|"answers"| C
    E -->|"gives up"| F["Status dot red, offer manual retry"]
    B -->|"ai_configured false"| G["Status dot amber, AI not configured notice"]
```

## 8. Error handling map

```mermaid
flowchart LR
    V["422 VALIDATION_ERROR"] --> VM["Highlight the field with the message"]
    U["422 UNSUITABLE_INPUT"] --> UM["Ask the student to rephrase as a study topic"]
    R["429 RATE_LIMITED"] --> RM["Please wait a moment, retry button after 10 s"]
    O["502 MODEL_OUTPUT_INVALID"] --> OM["Couldn't format that answer, Try again"]
    A["503 MODEL_UNAVAILABLE"] --> AM["Study engine is busy, Try again"]
    T["504 MODEL_TIMEOUT"] --> TM["Took too long, try shorter input"]
    N["NETWORK_ERROR or CLIENT_TIMEOUT"] --> NM["Check connection, Try again"]
    I["500 INTERNAL_ERROR"] --> IM["Something went wrong, Try again"]
```
