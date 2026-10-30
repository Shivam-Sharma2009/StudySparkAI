import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeHistory, safeGet } from '../src/hooks/useStudyHistory.js';
import {
  createMockAdaptiveAnswer,
  mockAdaptiveStartData,
} from '../src/services/mocks.js';
import {
  isValidAdaptiveAnswerData,
  isValidAdaptiveStartData,
  sanitizeAdaptiveSummary,
} from '../src/services/adaptiveQuiz.js';

const sessionId = `aq_${'a'.repeat(32)}`;
const summary = {
  session_id: sessionId,
  score: 1,
  answered_count: 2,
  difficulty_history: ['medium', 'easy'],
  weak_concepts: ['photosynthesis'],
  completion_reason: 'user_stopped',
};

function question(number = 1) {
  return {
    id: `${sessionId}-q${number}`,
    number,
    question: 'Which pigment absorbs light?',
    options: ['Chlorophyll', 'Melanin', 'Keratin', 'Haemoglobin'],
    correct_index: 0,
    explanation: 'Chlorophyll captures light.',
    concept_tags: ['light absorption'],
    source_anchor: 'Plants absorb sunlight',
    difficulty: 'medium',
    is_practice: false,
  };
}

test('validates adaptive start and continuing answer responses', () => {
  assert.equal(isValidAdaptiveStartData({
    session_id: sessionId,
    topic: 'Photosynthesis',
    question_limit: 10,
    answered_count: 0,
    score: 0,
    difficulty_history: [],
    weak_concepts: [],
    next_action: 'continue',
    practice_reason: null,
    question: question(),
  }), true);
  assert.equal(isValidAdaptiveStartData({
    session_id: sessionId,
    topic: 'Photosynthesis',
    question_limit: 10,
    answered_count: 0,
    score: 0,
    difficulty_history: [],
    weak_concepts: [],
    next_action: 'continue',
    question: { ...question(), options: ['duplicate', 'duplicate', 'C', 'D'] },
  }), false);

  assert.equal(isValidAdaptiveAnswerData({
    session_id: sessionId,
    topic: 'Photosynthesis',
    question_limit: 10,
    answered_count: 1,
    score: 1,
    difficulty_history: ['medium'],
    weak_concepts: [],
    next_action: 'continue',
    practice_reason: null,
    completion_reason: null,
    question: { ...question(2), difficulty: 'hard' },
  }), true);
});

test('requires a completion reason and no next question when complete', () => {
  const completed = {
    session_id: sessionId,
    topic: 'Photosynthesis',
    question_limit: 10,
    answered_count: 1,
    score: 1,
    difficulty_history: ['medium'],
    weak_concepts: [],
    next_action: 'complete',
    practice_reason: null,
    completion_reason: 'user_stopped',
    question: null,
  };
  assert.equal(isValidAdaptiveAnswerData(completed), true);
  assert.equal(
    isValidAdaptiveAnswerData({ ...completed, completion_reason: null }),
    false
  );
  assert.equal(isValidAdaptiveAnswerData({ ...completed, question: question(2) }), false);
});

test('requires a targeted-practice reason when the next action is practice', () => {
  const practice = {
    session_id: sessionId,
    topic: 'Photosynthesis',
    question_limit: 10,
    answered_count: 1,
    score: 0,
    difficulty_history: ['medium'],
    weak_concepts: ['light absorption'],
    next_action: 'practice',
    practice_reason: 'Review light absorption.',
    completion_reason: null,
    question: { ...question(2), is_practice: true, difficulty: 'easy' },
  };
  assert.equal(isValidAdaptiveAnswerData(practice), true);
  assert.equal(
    isValidAdaptiveAnswerData({ ...practice, practice_reason: null }),
    false
  );
});

test('mock answers produce valid targeted practice and no-provider completion data', () => {
  const sessionId = mockAdaptiveStartData.session_id;
  const basePayload = {
    session_id: sessionId,
    topic: mockAdaptiveStartData.topic,
    content: 'Photosynthesis uses sunlight, water and carbon dioxide.',
    language: 'en',
    initial_difficulty: 'medium',
    current_question: mockAdaptiveStartData.question,
    selected_index: 1,
    answer_history: [],
  };
  const practice = createMockAdaptiveAnswer(basePayload);
  assert.equal(practice.data.next_action, 'practice');
  assert.equal(isValidAdaptiveAnswerData(practice.data), true);

  const completion = createMockAdaptiveAnswer({
    ...basePayload,
    finish: true,
    finish_reason: 'provider_error',
  });
  assert.equal(completion.attempts, 0);
  assert.equal(completion.data.completion_reason, 'provider_error');
  assert.equal(isValidAdaptiveAnswerData(completion.data), true);
});

test('sanitizes history to the approved summary fields only', () => {
  const sanitized = sanitizeAdaptiveSummary({
    ...summary,
    content: 'private source notes',
    topic: 'private topic',
    question_text: 'private generated question',
  });
  assert.deepEqual(sanitized, summary);
  assert.equal(sanitizeAdaptiveSummary({ ...summary, score: 3 }), null);
  assert.equal(sanitizeAdaptiveSummary({ ...summary, session_id: 'invalid' }), null);
});

test('normalizes malformed adaptive history and strips all unapproved fields', () => {
  const normalized = normalizeHistory([
    {
      id: 'adaptive-safe',
      type: 'adaptive',
      title: 'Private source material',
      createdAt: '2026-10-30T12:00:00.000Z',
      language: 'en',
      result: { ...summary, content: 'private source notes', question_text: 'private question' },
    },
    {
      id: 'adaptive-invalid',
      type: 'adaptive',
      result: { ...summary, score: 5 },
    },
  ]);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].title, 'Adaptive Quiz');
  assert.deepEqual(normalized[0].result, summary);
  assert.equal(normalized[0].score, 1);
  assert.equal(normalized[0].total, 2);
});

test('safe local history read returns its fallback for malformed storage', () => {
  const originalWindow = globalThis.window;
  const originalWarn = console.warn;
  globalThis.window = {
    localStorage: {
      getItem: () => '{malformed',
    },
  };
  console.warn = () => {};
  try {
    assert.deepEqual(safeGet('studyspark:history:v1', []), []);
  } finally {
    console.warn = originalWarn;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
