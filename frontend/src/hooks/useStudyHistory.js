import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'studyspark:history:v1';
const QUIZ_SCORES_KEY = 'studyspark:quizScores:v1';
const PLAN_PROGRESS_KEY = 'studyspark:planProgress:v1';
const MAX_ENTRIES = 50;

function safeGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Error reading localStorage key "${key}":`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Error writing localStorage key "${key}":`, err);
    return false;
  }
}

export function useStudyHistory() {
  const [history, setHistory] = useState(() => safeGet(HISTORY_KEY, []));
  const [quizScores, setQuizScores] = useState(() => safeGet(QUIZ_SCORES_KEY, []));
  const [planProgress, setPlanProgress] = useState(() => safeGet(PLAN_PROGRESS_KEY, {}));

  // Sync state to localStorage with quota-safe eviction
  const persistHistory = useCallback((items) => {
    let toSave = items.slice(0, MAX_ENTRIES);
    let success = safeSet(HISTORY_KEY, toSave);
    while (!success && toSave.length > 1) {
      toSave.pop(); // Evict oldest
      success = safeSet(HISTORY_KEY, toSave);
    }
    setHistory(toSave);
    window.dispatchEvent(new Event('studyspark:history_updated'));
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
    ({ type, language = 'en', inputPreview = '', request = {}, result = {} }) => {
      const id = `h_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newEntry = {
        id,
        type,
        createdAt: new Date().toISOString(),
        language,
        inputPreview: (inputPreview || '').slice(0, 120),
        request,
        result,
      };

      setHistory((prev) => {
        const next = [newEntry, ...prev.filter((i) => i.id !== id)].slice(0, MAX_ENTRIES);
        persistHistory(next);
        return next;
      });

      return newEntry;
    },
    [persistHistory]
  );

  const removeEntry = useCallback(
    (id) => {
      setHistory((prev) => {
        const next = prev.filter((item) => item.id !== id);
        safeSet(HISTORY_KEY, next);
        window.dispatchEvent(new Event('studyspark:history_updated'));
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    safeSet(HISTORY_KEY, []);
    window.dispatchEvent(new Event('studyspark:history_updated'));
  }, []);

  const saveQuizScore = useCallback(({ entryId, topic, score, total, difficulty }) => {
    const scoreRecord = {
      entryId: entryId || `q_${Date.now()}`,
      topic: topic || 'Quiz',
      score,
      total,
      difficulty: difficulty || 'medium',
      takenAt: new Date().toISOString(),
    };
    setQuizScores((prev) => {
      const next = [scoreRecord, ...prev].slice(0, 100);
      safeSet(QUIZ_SCORES_KEY, next);
      window.dispatchEvent(new Event('studyspark:history_updated'));
      return next;
    });
  }, []);

  const updatePlanProgress = useCallback((planId, sessionId, completed) => {
    setPlanProgress((prev) => {
      const next = {
        ...prev,
        [planId]: {
          ...(prev[planId] || {}),
          [sessionId]: completed,
        },
      };
      safeSet(PLAN_PROGRESS_KEY, next);
      window.dispatchEvent(new Event('studyspark:history_updated'));
      return next;
    });
  }, []);

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
      total: 2,
      difficulty: 'medium',
    });
  }, [persistHistory, saveQuizScore]);

  // Check URL param ?demo=1 on load
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('demo') === '1' && history.length === 0) {
        seedDemoData();
      }
    } catch {
      // ignore in non-browser env
    }
  }, [history.length, seedDemoData]);

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
