import {
  isValidAdaptiveAnswerData,
  isValidAdaptiveStartData,
} from './adaptiveQuiz.js';

export class ApiError extends Error {
  constructor(code, message, retryable = true, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function invalidResponse() {
  return new ApiError(
    'INVALID_RESPONSE',
    'The study engine returned an invalid response. Please try again.',
    false
  );
}

export async function parseApiResponse(response, { allowZeroAttempts = false } = {}) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw invalidResponse();
  }

  if (isRecord(payload) && payload.ok === false && isRecord(payload.error)) {
    const error = payload.error;
    if (typeof error.code === 'string' && typeof error.message === 'string') {
      throw new ApiError(
        error.code,
        error.message,
        error.retryable !== false,
        error.details ?? null
      );
    }
  }

  if (!response.ok || !isRecord(payload) || payload.ok !== true) {
    throw invalidResponse();
  }

  const { data, meta } = payload;
  if (
    !isRecord(data) ||
    !isRecord(meta) ||
    typeof meta.model !== 'string' ||
    !['en', 'hi'].includes(meta.language) ||
    !Number.isFinite(meta.latency_ms) ||
    meta.latency_ms < 0 ||
    !Number.isInteger(meta.attempts) ||
    meta.attempts < (allowZeroAttempts ? 0 : 1) ||
    (meta.attempts === 0 && data.next_action !== 'complete') ||
    meta.attempts > 2
  ) {
    throw invalidResponse();
  }

  return payload;
}

const isString = (value) => typeof value === 'string' && value.trim().length > 0;
const hasStringFields = (value, fields) =>
  isRecord(value) && fields.every((field) => isString(value[field]));
const isStringArray = (value, minimumLength = 1) =>
  Array.isArray(value) && value.length >= minimumLength && value.every(isString);

export function isValidFeatureData(feature, data) {
  switch (feature) {
    case 'adaptive-start':
      return isValidAdaptiveStartData(data);
    case 'adaptive-answer':
      return isValidAdaptiveAnswerData(data);
    case 'explain':
      return (
        hasStringFields(data, ['title', 'explanation', 'example', 'quick_recap']) &&
        isStringArray(data.key_points)
      );
    case 'summary':
      return (
        hasStringFields(data, ['summary']) &&
        isStringArray(data.key_points) &&
        Array.isArray(data.key_terms) &&
        data.key_terms.every((term) => hasStringFields(term, ['term', 'meaning']))
      );
    case 'quiz':
      return (
        hasStringFields(data, ['topic']) &&
        Array.isArray(data.questions) &&
        data.questions.length >= 5 &&
        data.questions.every(
          (question) =>
            hasStringFields(question, ['id', 'question', 'explanation']) &&
            Array.isArray(question.options) &&
            question.options.length === 4 &&
            question.options.every(isString) &&
            Number.isInteger(question.correct_index) &&
            question.correct_index >= 0 &&
            question.correct_index <= 3
        )
      );
    case 'study-plan':
      return (
        hasStringFields(data, ['summary']) &&
        Number.isInteger(data.horizon_days) &&
        typeof data.truncated === 'boolean' &&
        Array.isArray(data.days) &&
        isStringArray(data.tips, 0) &&
        data.days.every(
          (day) =>
            Number.isInteger(day.day) &&
            day.day >= 1 &&
            isString(day.date) &&
            Array.isArray(day.sessions) &&
            day.sessions.every(
              (session) =>
                hasStringFields(session, ['id', 'subject', 'topic', 'activity']) &&
                Number.isInteger(session.minutes) &&
                session.minutes > 0 &&
                ['learn', 'practice', 'revise', 'test'].includes(session.activity)
            )
        )
      );
    default:
      return false;
  }
}

export async function parseHealthResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw invalidResponse();
  }

  if (
    !response.ok ||
    !isRecord(payload) ||
    payload.status !== 'ok' ||
    typeof payload.ai_configured !== 'boolean' ||
    typeof payload.model !== 'string' ||
    typeof payload.version !== 'string'
  ) {
    throw invalidResponse();
  }

  return payload;
}

export function shouldUseMocks(isDevelopment, mocksConfigured) {
  return isDevelopment && mocksConfigured;
}
