import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'studyspark:history:v1';
const QUIZ_SCORES_KEY = 'studyspark:quizScores:v1';
const PLAN_PROGRESS_KEY = 'studyspark:planProgress:v1';
const MAX_ENTRIES = 50;
const HISTORY_TYPES = new Set(['explain', 'summary', 'quiz', 'plan']);

function isValidResult(type, result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
  if (type === 'explain') {
    return typeof result.title === 'string' &&
      typeof result.explanation === 'string' &&
      Array.isArray(result.key_points);
  }
  if (type === 'summary') {
    return typeof result.summary === 'string' &&
      Array.isArray(result.key_points) &&
      (!result.key_terms || Array.isArray(result.key_terms));
  }
  if (type === 'quiz') {
    return Array.isArray(result.questions) && result.questions.every((question) =>
      question &&
      typeof question.question === 'string' &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      Number.isInteger(question.correct_index) &&
      question.correct_index >= 0 &&
      question.correct_index < 4
    );
  }
  if (type === 'plan') {
    return Array.isArray(result.days) && result.days.every((day) =>
      day && Array.isArray(day.sessions)
    );
  }
  return false;
}

function normalizeHistory(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      HISTORY_TYPES.has(item.type) &&
      isValidResult(item.type, item.result)
    )
    .map((item) => {
      const timestamp = Date.parse(item.createdAt);
      const titleCandidate = item.title || item.result.title || item.result.topic ||
        (item.type === 'summary' ? 'Notes Summary' : 'Study Plan');
      return {
        id: item.id,
        type: item.type,
        title: typeof titleCandidate === 'string' && titleCandidate.trim()
          ? titleCandidate.trim().slice(0, 100)
          : 'Study Activity',
        createdAt: Number.isFinite(timestamp)
          ? new Date(timestamp).toISOString()
          : new Date(0).toISOString(),
        language: item.language === 'hi' ? 'hi' : 'en',
        result: item.result,
        ...(Number.isFinite(item.score) && Number.isFinite(item.total) && item.total > 0
          ? { score: item.score, total: item.total }
          : {}),
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_ENTRIES);
}

function normalizeQuizScores(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) =>
    item &&
    typeof item === 'object' &&
    typeof item.entryId === 'string' &&
    Number.isFinite(item.score) &&
    Number.isFinite(item.total) &&
    item.total > 0
  );
}

function normalizePlanProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, sessions]) => sessions && typeof sessions === 'object' && !Array.isArray(sessions))
      .map(([planId, sessions]) => [
        planId,
        Object.fromEntries(
          Object.entries(sessions).filter(([, completed]) => typeof completed === 'boolean')
        ),
      ])
  );
}

function safeGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (key === HISTORY_KEY) return normalizeHistory(parsed);
    if (key === QUIZ_SCORES_KEY) return normalizeQuizScores(parsed);
    if (key === PLAN_PROGRESS_KEY) return normalizePlanProgress(parsed);
    return parsed;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}":`, err);
    return fallback;
  }
}

function safeSet(key, value, logError = true) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { saved: true, error: null };
  } catch (err) {
    if (logError) console.warn(`Error writing localStorage key "${key}":`, err);
    return { saved: false, error: err };
  }
}

function isQuotaError(error) {
  return error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014;
}

export function useStudyHistory() {
  const [history, setHistory] = useState(() => safeGet(HISTORY_KEY, []));
  const [quizScores, setQuizScores] = useState(() => safeGet(QUIZ_SCORES_KEY, []));
  const [planProgress, setPlanProgress] = useState(() => safeGet(PLAN_PROGRESS_KEY, {}));
  const [storageWarning, setStorageWarning] = useState('');

  // Sync state to localStorage with quota-safe eviction
  const persistHistory = useCallback((items) => {
    const toSave = normalizeHistory(items);
    let write = safeSet(HISTORY_KEY, toSave);
    let evicted = false;
    while (!write.saved && isQuotaError(write.error) && toSave.length > 1) {
      toSave.pop();
      evicted = true;
      write = safeSet(HISTORY_KEY, toSave, false);
    }
    const success = write.saved;
    setHistory(success ? toSave : normalizeHistory(items));
    setStorageWarning(success ? (evicted ? 'evicted' : '') : 'unavailable');
    if (success) {
      window.dispatchEvent(new Event('studyspark:history_updated'));
    }
    return success;
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw);
      const normalized = normalizeHistory(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(normalized) && !safeSet(HISTORY_KEY, normalized).saved) {
        setStorageWarning('unavailable');
      }
    } catch (err) {
      console.warn('Error migrating local study history:', err);
      if (!safeSet(HISTORY_KEY, []).saved) setStorageWarning('unavailable');
    }
  }, []);

  // Listen for storage / custom sync events
  useEffect(() => {
    const handleSync = () => {
      setHistory(safeGet(HISTORY_KEY, []));
      setQuizScores(safeGet(QUIZ_SCORES_KEY, []));
      setPlanProgress(safeGet(PLAN_PROGRESS_KEY, {}));
    };
    window.addEventListener('studyspark:history_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('studyspark:history_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const addEntry = useCallback(
    ({ type, language = 'en', title, result = {} }) => {
      if (!HISTORY_TYPES.has(type) || !isValidResult(type, result)) {
        console.warn('Skipped saving invalid study history entry.');
        return null;
      }
      const id = `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newEntry = {
        id,
        type,
        title: (title || result.title || result.topic || (type === 'summary' ? 'Notes Summary' : 'Study Plan'))
          .toString()
          .slice(0, 100),
        createdAt: new Date().toISOString(),
        language: language === 'hi' ? 'hi' : 'en',
        result,
      };

      persistHistory([newEntry, ...history.filter((item) => item.id !== id)]);

      return newEntry;
    },
    [history, persistHistory]
  );

  const removeEntry = useCallback(
    (id) => {
      persistHistory(history.filter((item) => item.id !== id));
      setQuizScores((previous) => {
        const next = previous.filter((score) => score.entryId !== id);
        if (!safeSet(QUIZ_SCORES_KEY, next).saved) setStorageWarning('unavailable');
        return next;
      });
      setPlanProgress((previous) => {
        const next = { ...previous };
        delete next[id];
        if (!safeSet(PLAN_PROGRESS_KEY, next).saved) setStorageWarning('unavailable');
        return next;
      });
      window.dispatchEvent(new Event('studyspark:history_updated'));
    },
    [history, persistHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setQuizScores([]);
    setPlanProgress({});
    const historySaved = safeSet(HISTORY_KEY, []).saved;
    const scoresSaved = safeSet(QUIZ_SCORES_KEY, []).saved;
    const progressSaved = safeSet(PLAN_PROGRESS_KEY, {}).saved;
    setStorageWarning(historySaved && scoresSaved && progressSaved ? '' : 'unavailable');
    window.dispatchEvent(new Event('studyspark:history_updated'));
  }, []);

  const updateEntryScore = useCallback((entryId, score, total) => {
    if (!entryId || !Number.isFinite(score) || !Number.isFinite(total) || total < 1) return;
    const next = history.map((entry) =>
      entry.id === entryId ? { ...entry, score, total } : entry
    );
    persistHistory(next);
  }, [history, persistHistory]);

  const saveQuizScore = useCallback(({ entryId, topic, score, total, difficulty }) => {
    if (!Number.isFinite(score) || !Number.isFinite(total) || total < 1) return;
    const scoreRecord = {
      entryId: entryId || `q_${Date.now()}`,
      topic: topic || 'Quiz',
      score,
      total,
      difficulty: difficulty || 'medium',
      takenAt: new Date().toISOString(),
    };
    const next = [scoreRecord, ...quizScores].slice(0, 100);
    const saved = safeSet(QUIZ_SCORES_KEY, next).saved;
    setQuizScores(next);
    setStorageWarning(saved ? '' : 'unavailable');
    if (saved) window.dispatchEvent(new Event('studyspark:history_updated'));
  }, [quizScores]);

  const updatePlanProgress = useCallback((planId, sessionId, completed) => {
    if (!planId || !sessionId || typeof completed !== 'boolean') return;
    const next = {
      ...planProgress,
      [planId]: {
        ...(planProgress[planId] || {}),
        [sessionId]: completed,
      },
    };
    const saved = safeSet(PLAN_PROGRESS_KEY, next).saved;
    setPlanProgress(next);
    setStorageWarning(saved ? '' : 'progressUnavailable');
    if (saved) window.dispatchEvent(new Event('studyspark:history_updated'));
  }, [planProgress]);

  // Demo seeding helper (?demo=1)
  const seedDemoData = useCallback(() => {
    const demoEntries = [
      {
        id: 'h_demo_explain',
        type: 'explain',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        language: 'en',
        inputPreview: "Ohm's Law in electric circuits",
        request: { topic: "Ohm's Law", level: 'beginner', language: 'en' },
        result: {
          topic: "Ohm's Law",
          level: 'beginner',
          title: "Understanding Ohm's Law: The Heartbeat of Electronics",
          explanation:
            "Ohm's Law explains the fundamental relationship between voltage, current, and resistance in an electrical circuit.\n\nImagine water flowing through a garden pipe: voltage is the water pressure pushing the water, current is the volume of water flowing through, and resistance is the width of the pipe restricting flow.",
          example:
            'A 9V battery powering a 3Ω flashlight bulb produces 3 Amperes of electric current (I = V / R).',
          key_points: [
            'Current (I) is directly proportional to voltage (V).',
            'Current is inversely proportional to resistance (R).',
            'Formula: V = I × R.',
          ],
          quick_recap: 'Voltage pushes current through a circuit against resistance: V = I × R.',
        },
      },
      {
        id: 'h_demo_summary',
        type: 'summary',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        language: 'en',
        inputPreview: 'Cellular Respiration and ATP Production lecture notes',
        request: { notes: 'Cellular respiration notes...', length: 'short', language: 'en' },
        result: {
          summary:
            'Cellular respiration converts glucose and oxygen into ATP, carbon dioxide, and water across three main stages: glycolysis, the Krebs cycle, and oxidative phosphorylation.',
          key_points: [
            'Glycolysis occurs in the cytoplasm yielding 2 ATP.',
            'The Krebs cycle in mitochondria yields electron carriers NADH and FADH2.',
            'The electron transport chain produces the bulk of ATP (around 30-32).',
          ],
          key_terms: [
            { term: 'ATP', meaning: 'Adenosine triphosphate, the cellular energy currency.' },
            { term: 'Glycolysis', meaning: 'The breakdown of glucose into pyruvate without oxygen.' },
            { term: 'Mitochondria', meaning: 'The powerhouse organelle where aerobic respiration occurs.' },
          ],
        },
      },
      {
        id: 'h_demo_quiz',
        type: 'quiz',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        language: 'en',
        inputPreview: 'Physics: Mechanics and Forces quiz',
        request: { content: 'Mechanics and Newton laws', difficulty: 'medium', language: 'en' },
        score: 2,
        total: 5,
        result: {
          topic: 'Newtonian Mechanics',
          difficulty: 'medium',
          questions: [
            {
              id: 'q1',
              question: "What does Newton's first law describe?",
              options: ['Inertia', 'Acceleration', 'Action-Reaction', 'Gravitation'],
              correct_index: 0,
              explanation: "Newton's first law states that an object at rest remains at rest unless acted on by an external net force (inertia).",
            },
            {
              id: 'q2',
              question: 'Which formula represents the second law of motion?',
              options: ['E = mc²', 'F = m × a', 'P = V × I', 'V = I × R'],
              correct_index: 1,
              explanation: 'Force equals mass times acceleration (F = ma).',
            },
            {
              id: 'q3',
              question: "Which statement describes Newton's third law?",
              options: [
                'For every action, there is an equal and opposite reaction.',
                'An object keeps moving unless acted on by a net force.',
                'Force equals mass multiplied by acceleration.',
                'Energy cannot be created or destroyed.',
              ],
              correct_index: 0,
              explanation: 'Forces occur in equal and opposite pairs between interacting objects.',
            },
            {
              id: 'q4',
              question: 'What is the SI unit of force?',
              options: ['Joule', 'Newton', 'Watt', 'Pascal'],
              correct_index: 1,
              explanation: 'Force is measured in newtons, named after Isaac Newton.',
            },
            {
              id: 'q5',
              question: 'If the same net force acts on a larger mass, what happens to its acceleration?',
              options: ['It increases.', 'It stays the same.', 'It decreases.', 'It becomes zero.'],
              correct_index: 2,
              explanation: 'From F = ma, acceleration decreases as mass increases for a fixed force.',
            },
          ],
        },
      },
      {
        id: 'h_demo_plan',
        type: 'plan',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        language: 'en',
        inputPreview: '3-Day Physics and Chemistry Study Plan',
        request: { subjects: [{ name: 'Physics', target_hours: 6 }, { name: 'Chemistry', target_hours: 4 }], horizon_days: 3, daily_hours: 4, language: 'en' },
        result: {
          horizon_days: 3,
          daily_hours: 4,
          summary: 'A balanced 3-day roadmap alternating theory and problem-solving across Physics and Chemistry.',
          days: [
            {
              day: 1,
              date: '2026-10-28',
              sessions: [
                { id: 's1', subject: 'Physics', topic: 'Kinematics & Newton Laws', minutes: 120, activity: 'learn' },
                { id: 's2', subject: 'Chemistry', topic: 'Atomic Structure', minutes: 120, activity: 'practice' },
              ],
            },
            {
              day: 2,
              date: '2026-10-29',
              sessions: [
                { id: 's3', subject: 'Physics', topic: 'Work, Energy & Power', minutes: 120, activity: 'practice' },
                { id: 's4', subject: 'Chemistry', topic: 'Chemical Bonding', minutes: 120, activity: 'learn' },
              ],
            },
            {
              day: 3,
              date: '2026-10-30',
              sessions: [
                { id: 's5', subject: 'Physics', topic: 'Mock Test & Formula Revision', minutes: 120, activity: 'test' },
                { id: 's6', subject: 'Chemistry', topic: 'Practice Questions & Recap', minutes: 120, activity: 'revise' },
              ],
            },
          ],
          tips: ['Take a 5-minute break every 25 minutes.', 'Review formulas right before sleeping.'],
        },
      },
    ];

    persistHistory(demoEntries);
    saveQuizScore({
      entryId: 'h_demo_quiz',
      topic: 'Newtonian Mechanics',
      score: 2,
      total: 5,
      difficulty: 'medium',
    });
  }, [persistHistory, saveQuizScore]);

  // Statistics
  const quizCount = quizScores.length;
  const bestScorePct = quizScores.reduce((max, s) => {
    const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
    return pct > max ? pct : max;
  }, 0);
  const avgScorePct = quizCount
    ? Math.round(
        quizScores.reduce((sum, s) => sum + (s.total > 0 ? (s.score / s.total) * 100 : 0), 0) /
          quizCount
      )
    : 0;
  const plansCount = history.filter((i) => i.type === 'plan').length;

  return {
    history,
    addEntry,
    removeEntry,
    clearHistory,
    updateEntryScore,
    storageWarning,
    quizScores,
    saveQuizScore,
    planProgress,
    updatePlanProgress,
    seedDemoData,
    stats: {
      quizzesTaken: quizCount,
      bestScore: quizCount > 0 ? `${bestScorePct}%` : '—',
      avgScore: quizCount > 0 ? `${avgScorePct}%` : '—',
      savedPlans: plansCount,
    },
  };
}
