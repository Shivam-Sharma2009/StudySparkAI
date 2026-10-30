# UI/UX Specification — StudySpark AI

---

## 1. Design principles

1. **Friendly and calm.** Feels like a clean study notebook, not an enterprise dashboard.
2. **One task at a time.** One panel visible; a clear primary action in each.
3. **Fast feedback.** Loading appears instantly; results are scrolled into view.
4. **Never a dead end.** Every error offers *Try again*; every empty state tells the student what to do.
5. **Readable first.** Generous type size and spacing; works for both English and Devanagari.

## 2. Layout

| Breakpoint | Layout |
|---|---|
| ≥ 1024 px | Fixed left sidebar (240 px) + header + main column (content max-width 768 px, centered) |
| 640–1023 px | Collapsible sidebar (drawer from a menu button) + header + main |
| < 640 px | Header + main + **bottom tab bar** with 4 tools; History in the header menu |

**Header:** logo "StudySpark AI ⚡" with the tagline "Learn Smarter, Not Harder. 📚" (hidden below 640 px), language toggle `EN | हिं`, theme toggle (sun/moon), backend status dot (green / amber / red, with tooltip text).

**Sidebar items:** 💡 Explain a Topic · 📝 Summarize Notes · 🎯 Generate Quiz · 📅 Study Plan · 🕘 History. Active item has a filled background and a left accent bar.

**Footer (small, muted):** "AI can be wrong — verify important facts. Don't enter personal or sensitive information."

## 3. Design tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAF7` (warm paper) | `#0F1117` |
| `--surface` | `#FFFFFF` | `#181B24` |
| `--surface-2` | `#F1F0EA` | `#20242F` |
| `--border` | `#E5E3DA` | `#2C3140` |
| `--text` | `#1B1B1F` | `#ECEDF2` |
| `--text-muted` | `#5F6068` | `#A0A4B2` |
| `--primary` (Spark Indigo) | `#4F46E5` | `#8B85FF` |
| `--primary-contrast` | `#FFFFFF` | `#0F1117` |
| `--accent` (Spark Amber) | `#F59E0B` | `#FBBF24` |
| `--success` | `#059669` | `#34D399` |
| `--danger` | `#DC2626` | `#F87171` |

- Contrast must meet WCAG AA in both themes (check primary text on buttons and muted text on surfaces).
- Radius: cards `rounded-2xl`, inputs/buttons `rounded-xl`. Shadow: very subtle in light mode; border-only in dark.
- Font: **Inter** for Latin, **Noto Sans Devanagari** for Hindi (both from Google Fonts, `font-display: swap`). Base 16 px, line-height 1.6 (1.75 for Devanagari paragraphs).
- Dark mode (Tailwind v4): class strategy with `@custom-variant dark (&:where(.dark, .dark *));`. Add `.dark` on `<html>`; default follows `prefers-color-scheme` until the user chooses.
- Motion: short fades/slides (≤ 200 ms); disabled under `prefers-reduced-motion`.

## 4. Shared components

| Component | Behaviour |
|---|---|
| `StatusMessage` | Variants: `loading` (spinner + skeleton lines + text like "Thinking…"), `error` (message + **Try again**), `empty` (icon + hint). `aria-live="polite"` |
| Result card | Surface card with a heading (focus target), body, and action row (**Copy**, optional **Quiz me on this**) |
| Segmented control | Used for level, length, difficulty; radio semantics, keyboard arrows |
| Primary button | Full width on mobile; disabled + spinner while loading |
| Char counter | `123 / 8000`, turns amber at 90%, red when over |

## 5. Screens

### 5.1 Home (default tool: Explain)
Top of main: tool title + one-line description. Below: input card, then result area.

### 5.2 ExplainPanel
- **Input card:** topic text input (multi-line, 2 rows, 500 max) with placeholder "e.g. Photosynthesis, Newton's third law, Bernoulli's principle"; segmented control Beginner / Intermediate / Advanced; button **Explain it**.
- **Result card:** title (h2), explanation paragraphs, "Example" callout (accent-tinted background), "Key points" list, "In one line" recap strip. Actions: Copy, Quiz me on this.
- **Empty (before first use):** three clickable example chips that fill the input.

### 5.3 SummaryPanel
- **Input card:** textarea (8 rows) "Paste your notes here…", live char counter (50–8000), Short / Medium control, button **Summarize**.
- **Result card:** summary paragraph, key points list, "Key terms" as a definition list (term bold, meaning below). Actions: Copy, Quiz me on this.
- Over-limit: counter red, button disabled, helper text "Please shorten your notes to 8000 characters."

### 5.4 QuizPanel
- **Input card:** textarea (4 rows) "Enter a topic or paste notes", difficulty control, button **Generate quiz**.
- **Quiz card (one question at a time):** progress "Question 2 of 5" + progress bar; question text; four options as large radio-style buttons (min height 48 px, letter badges A–D); **Check answer** (disabled until an option is chosen).
- After checking: correct option turns green with ✓, a wrong choice turns red with ✕ (always paired with an icon and text, never color alone); explanation panel appears; button becomes **Next** (or **See results** on question 5).
- **Results screen:** big score "4 / 5" with a short message (e.g. "Great job!"), review list of all questions with correct answer and explanation, buttons **Retake quiz**, **New quiz**. Score saved (E4).
- Keyboard: arrow keys move between options, Enter/Space selects, Enter on the primary button continues.

### 5.5 StudyPlanPanel
- **Input card:** subject rows (name, deadline date picker, optional topics). **+ Add subject** (max 6), remove button per row. Hours per day (number stepper, 0.5 step, 0.5–12). Start date (default today). Button **Create my plan**.
- Inline validation: name required; deadline not before start date and within 30 days.
- **Result card:** summary text; progress bar "6 of 14 sessions done (43%)" (E5); day cards in a vertical timeline: header "Day 2 · Wed, 28 Oct" + total time; sessions as rows with a checkbox, subject chip, topic, minutes, and an activity badge (learn / practice / revise / test, distinct icon each). Rest days show "Rest day 🌿". Tips list at the bottom. If `truncated`: note "Showing the first 14 days. Generate again later for the rest."
- Actions: Copy as text.

### 5.6 StudyHistory
- Tabs: All · Explain · Summary · Quiz · Plan. Each row: type icon, input preview, relative time, delete (trash) button. Click opens the saved result in a read-only view using the same `*Result` components (with a back link).
- Quiz rows show the score badge. A stats strip at the top (E4): quizzes taken, best score, average.
- **Clear all** (with confirm dialog). Empty state: "Nothing here yet — try a tool and your results will appear here."

### 5.7 Status states for backend wake-up
After 3 s without a health response, show a slim banner under the header: "Waking up the study engine… this can take up to a minute the first time." It disappears when health responds.

### 5.8 AdaptiveQuizPanel
- The existing five-question QuizPanel remains unchanged. Offer a separate, clearly labeled **Adaptive quiz** mode from the Quiz screen.
- Explain before starting: the first question uses the selected difficulty; correct non-practice answers raise difficulty, incorrect answers lower it and trigger targeted practice; each session stops after 10 answers.
- Input and difficulty controls use the existing Quiz styles and limits. Show loading, retryable provider errors, and a **Finish with current score** action after a provider failure; finishing submits the current selected answer without requesting another generated question.
- In the active flow, show question number/10, current difficulty, question/options as an accessible radio group, feedback/explanation, score, and weak concepts. Announce question/feedback changes and move focus to the new question heading.
- Practice questions display why the concept is being revisited. Provide a clear completion screen, **Start another** action, and a back path to the fixed quiz.
- Save only completed session summaries to Study History: score, answered count, difficulty history, weak concepts, and completion reason. Never save topic text, notes, question/option text, explanations, or answer text. Reopening History shows the summary only, not a replay of questions.
- All labels, status messages, and explanations are available in English and Hindi; preserve `lang`, keyboard operation, visible focus, reduced motion, and 44 × 44 px touch targets.

## 6. Copy and microcopy

- Tool buttons use action verbs: *Explain it, Summarize, Generate quiz, Create my plan.*
- Loading texts rotate: "Thinking…", "Finding simple words…", "Almost there…" (stop rotating under reduced motion).
- Error tone: calm, no blame. Example: "The study engine is busy right now. Please try again." Never show raw error codes or stack traces.
- Language toggle affects **AI output language**. (If the UI labels are translated later, keep a `strings.js` dictionary.)

## 7. Accessibility checklist

- All interactive elements are reachable and operable by keyboard with a visible focus ring (2 px primary, offset 2 px).
- Inputs have visible labels (or `aria-label`), error text linked with `aria-describedby`.
- After results render, move focus to the result heading; announce loading and results via `aria-live`.
- Quiz options use a `radiogroup` pattern with proper roles.
- Colour is never the only signal (icons + text for correct/wrong, status dot has a text tooltip).
- Touch targets ≥ 44 × 44 px; zoom to 200% works without loss.
- `lang` attribute on the result container (`en` or `hi`) so screen readers pronounce correctly.

## 8. Responsive details

- Inputs and buttons full width on mobile; result cards use `p-4` on mobile, `p-6` on desktop.
- Long words and Devanagari text wrap (`overflow-wrap: anywhere`); no horizontal scroll at 360 px.
- Bottom tab bar respects safe-area insets on iOS.
