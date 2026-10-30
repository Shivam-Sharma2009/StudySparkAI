const DIFFICULTIES = ['easy', 'medium', 'hard'];
const COMPLETION_REASONS = ['question_limit', 'user_stopped', 'provider_error'];

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export function isValidAdaptiveQuestion(question, sessionId, expectedNumber) {
  return (
    isRecord(question) &&
    question.id === `${sessionId}-q${expectedNumber}` &&
    question.number === expectedNumber &&
    isNonEmptyString(question.question) &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every(isNonEmptyString) &&
    new Set(question.options.map((option) => option.toLocaleLowerCase())).size === 4 &&
    Number.isInteger(question.correct_index) &&
    question.correct_index >= 0 &&
    question.correct_index < 4 &&
    isNonEmptyString(question.explanation) &&
    Array.isArray(question.concept_tags) &&
    question.concept_tags.length >= 1 &&
    question.concept_tags.length <= 3 &&
    question.concept_tags.every(isNonEmptyString) &&
    new Set(question.concept_tags.map((tag) => tag.trim().toLocaleLowerCase())).size ===
      question.concept_tags.length &&
    isNonEmptyString(question.source_anchor) &&
    DIFFICULTIES.includes(question.difficulty) &&
    typeof question.is_practice === 'boolean'
  );
}

export function isValidAdaptiveStartData(data) {
  return (
    isRecord(data) &&
    typeof data.session_id === 'string' &&
    /^aq_[0-9a-f]{32}$/.test(data.session_id) &&
    isNonEmptyString(data.topic) &&
    data.question_limit === 10 &&
    data.answered_count === 0 &&
    data.score === 0 &&
    Array.isArray(data.difficulty_history) &&
    data.difficulty_history.length === 0 &&
    Array.isArray(data.weak_concepts) &&
    data.weak_concepts.length === 0 &&
    data.next_action === 'continue' &&
    data.practice_reason === null &&
    isValidAdaptiveQuestion(data.question, data.session_id, 1)
  );
}

export function isValidAdaptiveAnswerData(data) {
  if (
    !isRecord(data) ||
    typeof data.session_id !== 'string' ||
    !/^aq_[0-9a-f]{32}$/.test(data.session_id) ||
    !isNonEmptyString(data.topic) ||
    data.question_limit !== 10 ||
    !Number.isInteger(data.answered_count) ||
    data.answered_count < 1 ||
    data.answered_count > 10 ||
    !Number.isInteger(data.score) ||
    data.score < 0 ||
    data.score > data.answered_count ||
    !Array.isArray(data.difficulty_history) ||
    data.difficulty_history.length !== data.answered_count ||
    !data.difficulty_history.every((level) => DIFFICULTIES.includes(level)) ||
    !Array.isArray(data.weak_concepts) ||
    !data.weak_concepts.every(isNonEmptyString) ||
    !['continue', 'practice', 'complete'].includes(data.next_action)
  ) {
    return false;
  }

  if (data.next_action === 'complete') {
    return (
      data.question === null &&
      data.practice_reason === null &&
      COMPLETION_REASONS.includes(data.completion_reason)
    );
  }

  return (
    data.completion_reason === null &&
    isValidAdaptiveQuestion(data.question, data.session_id, data.answered_count + 1) &&
    (data.next_action === 'practice'
      ? data.question.is_practice && isNonEmptyString(data.practice_reason)
      : !data.question.is_practice && data.practice_reason === null)
  );
}

export function sanitizeAdaptiveSummary(value) {
  if (
    !isRecord(value) ||
    typeof value.session_id !== 'string' ||
    !/^aq_[0-9a-f]{32}$/.test(value.session_id) ||
    !Number.isInteger(value.score) ||
    !Number.isInteger(value.answered_count) ||
    value.answered_count < 1 ||
    value.answered_count > 10 ||
    value.score < 0 ||
    value.score > value.answered_count ||
    !Array.isArray(value.difficulty_history) ||
    value.difficulty_history.length !== value.answered_count ||
    !value.difficulty_history.every((level) => DIFFICULTIES.includes(level)) ||
    !Array.isArray(value.weak_concepts) ||
    value.weak_concepts.length > 5 ||
    !value.weak_concepts.every(isNonEmptyString) ||
    !value.weak_concepts.every((concept) => concept.trim().length <= 60) ||
    !COMPLETION_REASONS.includes(value.completion_reason)
  ) {
    return null;
  }

  return {
    session_id: value.session_id,
    score: value.score,
    answered_count: value.answered_count,
    difficulty_history: [...value.difficulty_history],
    weak_concepts: value.weak_concepts.map((concept) => concept.trim()),
    completion_reason: value.completion_reason,
  };
}
