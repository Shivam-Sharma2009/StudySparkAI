const HISTORY_KEY = 'studyspark:history:v1';
const DEMO_TYPES = new Set(['explain', 'summary', 'quiz', 'plan']);

function isValidDemoEntry(entry) {
  if (
    !entry ||
    typeof entry !== 'object' ||
    typeof entry.id !== 'string' ||
    !entry.id ||
    !DEMO_TYPES.has(entry.type) ||
    !entry.result ||
    typeof entry.result !== 'object' ||
    Array.isArray(entry.result)
  ) {
    return false;
  }

  const { result } = entry;
  if (entry.type === 'explain') {
    return typeof result.title === 'string' &&
      typeof result.explanation === 'string' &&
      Array.isArray(result.key_points);
  }
  if (entry.type === 'summary') {
    return typeof result.summary === 'string' &&
      Array.isArray(result.key_points) &&
      Array.isArray(result.key_terms);
  }
  if (entry.type === 'quiz') {
    return Array.isArray(result.questions) &&
      result.questions.length >= 5 &&
      result.questions.every((question) =>
        question &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        Number.isInteger(question.correct_index) &&
        question.correct_index >= 0 &&
        question.correct_index < 4
      );
  }
  return Array.isArray(result.days) &&
    result.days.every((day) =>
      day &&
      typeof day.date === 'string' &&
      Array.isArray(day.sessions)
    );
}

function hasExpectedDemoEntries(entries) {
  return (
    Array.isArray(entries) &&
    entries.length === DEMO_TYPES.size &&
    entries.every(isValidDemoEntry) &&
    new Set(entries.map((entry) => entry.id)).size === entries.length &&
    new Set(entries.map((entry) => entry.type)).size === DEMO_TYPES.size &&
    [...DEMO_TYPES].every((type) => entries.some((entry) => entry.type === type))
  );
}

export function isDemoMode(search) {
  return new URLSearchParams(search).get('demo') === '1';
}

export function getDemoPlanDates(now = new Date()) {
  return [0, 1, 2].map((offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

export function seedDemoHistory(storage, entries, normalizeEntries) {
  if (typeof normalizeEntries !== 'function') {
    return { status: 'invalid' };
  }

  let normalizedEntries;
  try {
    normalizedEntries = normalizeEntries(entries);
  } catch {
    return { status: 'invalid' };
  }
  if (!hasExpectedDemoEntries(normalizedEntries)) {
    return { status: 'invalid' };
  }

  try {
    const localStorage = storage.localStorage || storage;
    const existing = localStorage.getItem(HISTORY_KEY);
    if (existing !== null) {
      try {
        const parsed = JSON.parse(existing);
        if (!Array.isArray(parsed) || parsed.length > 0) {
          return { status: 'preserved' };
        }
      } catch {
        return { status: 'preserved' };
      }
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(normalizedEntries));
    return { status: 'seeded', entries: normalizedEntries };
  } catch {
    return { status: 'unavailable' };
  }
}
