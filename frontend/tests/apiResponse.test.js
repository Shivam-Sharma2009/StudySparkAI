import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  isValidFeatureData,
  parseApiResponse,
  parseHealthResponse,
  shouldUseMocks,
} from '../src/services/apiResponse.js';

const response = (payload, ok = true) => ({
  ok,
  json: async () => payload,
});

const validEnvelope = {
  ok: true,
  data: { title: 'Topic', explanation: 'Text', example: 'Example', key_points: ['Point'], quick_recap: 'Recap' },
  meta: { model: 'gemma', language: 'en', latency_ms: 20, attempts: 1 },
};

test('accepts a valid API envelope', async () => {
  assert.deepEqual(await parseApiResponse(response(validEnvelope)), validEnvelope);
});

test('returns a safe error for malformed JSON and success envelopes', async () => {
  await assert.rejects(
    parseApiResponse({ ok: true, json: async () => { throw new SyntaxError('invalid'); } }),
    (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE'
  );
  await assert.rejects(
    parseApiResponse(response({ ok: true, data: {} })),
    (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE'
  );
});

test('preserves a valid backend error envelope', async () => {
  await assert.rejects(
    parseApiResponse(response({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Please retry', retryable: true },
    }, false)),
    (error) => error.code === 'RATE_LIMITED' && error.retryable
  );
});

test('validates health check payloads', async () => {
  const health = {
    status: 'ok',
    ai_configured: false,
    model: 'gemma',
    version: '1.0.0',
  };
  assert.deepEqual(await parseHealthResponse(response(health)), health);
  await assert.rejects(
    parseHealthResponse(response({ status: 'ok' })),
    (error) => error.code === 'INVALID_RESPONSE'
  );
});

test('validates feature data shape', () => {
  assert.equal(isValidFeatureData('explain', validEnvelope.data), true);
  assert.equal(isValidFeatureData('explain', {}), false);
  assert.equal(isValidFeatureData('summary', {
    summary: 'Summary',
    key_points: ['Point'],
    key_terms: [{ term: 'Term', meaning: 'Meaning' }],
  }), true);
  assert.equal(isValidFeatureData('quiz', {
    topic: 'Topic',
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index}`,
      question: 'Question',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 0,
      explanation: 'Explanation',
    })),
  }), true);
  assert.equal(isValidFeatureData('study-plan', {
    summary: 'Plan',
    horizon_days: 0,
    truncated: false,
    days: [],
    tips: [],
  }), true);
  assert.equal(isValidFeatureData('study-plan', {
    summary: 'Plan',
    horizon_days: 1,
    truncated: false,
    days: [{
      day: 1,
      date: '2026-01-01',
      sessions: [{ id: 's1', subject: 'Math', topic: 'Algebra', minutes: 30, activity: 'learn' }],
    }],
    tips: [],
  }), true);
  assert.equal(isValidFeatureData('unknown', validEnvelope.data), false);
});

test('enables mock responses only when explicitly configured in development', () => {
  assert.equal(shouldUseMocks(true, true), true);
  assert.equal(shouldUseMocks(true, false), false);
  assert.equal(shouldUseMocks(false, true), false);
});
