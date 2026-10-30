import {
  mockHealth,
  mockExplainData,
  mockSummaryData,
  mockQuizData,
  mockPlanData,
  mockAdaptiveStartData,
  createMockAdaptiveAnswer,
  mockErrors,
} from './mocks';
import {
  ApiError,
  isValidFeatureData,
  parseApiResponse,
  parseHealthResponse,
  shouldUseMocks,
} from './apiResponse';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const USE_MOCKS = shouldUseMocks(import.meta.env.DEV, import.meta.env.VITE_USE_MOCKS === 'true');
export { ApiError };

/**
 * Health check helper (GET /api/health)
 */
export async function checkHealth() {
  if (USE_MOCKS) {
    return {
      status: "ok",
      ai_configured: true,
      model: "gemma-4-26b-a4b-it (mock)",
      version: "1.0.0"
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal
    });
    return await parseHealthResponse(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('CLIENT_TIMEOUT', 'Health check took too long. Please try again.', true);
    }
    throw new ApiError('NETWORK_ERROR', 'Could not reach backend health check.', true);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generic API request wrapper
 */
export async function apiRequest(endpoint, payload, fixtureKey = null) {
  // Check URL query override for mock error testing: ?mockError=RATE_LIMITED
  const params = new URLSearchParams(window.location.search);
  const mockErrorKey = params.get('mockError');
  if (
    mockErrorKey &&
    mockErrors[mockErrorKey] &&
    !(fixtureKey === 'adaptive-answer' && payload?.finish)
  ) {
    const err = mockErrors[mockErrorKey].error;
    throw new ApiError(err.code, err.message, err.retryable, err.details);
  }

  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 800)); // artificial 800ms delay per spec

    let data;
    switch (fixtureKey) {
      case 'explain':
        data = mockExplainData;
        break;
      case 'summary':
        data = mockSummaryData;
        break;
      case 'quiz':
        data = mockQuizData;
        break;
      case 'study-plan':
        data = mockPlanData;
        break;
      case 'adaptive-start':
        data = {
          ...mockAdaptiveStartData,
          question: {
            ...mockAdaptiveStartData.question,
            source_anchor: payload?.content?.trim().slice(0, 100) || 'Study material',
          },
        };
        break;
      case 'adaptive-answer': {
        const answer = createMockAdaptiveAnswer(payload);
        data = answer.data;
        if (!isValidFeatureData(fixtureKey, data)) {
          throw new ApiError(
            'INVALID_RESPONSE',
            'The study engine returned an invalid response. Please try again.',
            false
          );
        }
        return {
          ok: true,
          data,
          meta: {
            model: 'gemma-4-26b-a4b-it',
            language: payload?.language || 'en',
            latency_ms: answer.attempts ? 820 : 0,
            attempts: answer.attempts,
          },
        };
      }
      default:
        data = {};
    }

    if (fixtureKey && !isValidFeatureData(fixtureKey, data)) {
      throw new ApiError(
        'INVALID_RESPONSE',
        'The study engine returned an invalid response. Please try again.',
        false
      );
    }

    return {
      ok: true,
      data,
      meta: {
        model: "gemma-4-26b-a4b-it",
        language: payload?.language || "en",
        latency_ms: 820,
        attempts: 1
      }
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 70000); // 70s timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await parseApiResponse(response, {
      allowZeroAttempts: fixtureKey === 'adaptive-answer',
    });
    if (!isValidFeatureData(fixtureKey, result.data)) {
      throw new ApiError(
        'INVALID_RESPONSE',
        'The study engine returned an invalid response. Please try again.',
        false
      );
    }
    return result;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new ApiError('CLIENT_TIMEOUT', 'Request took too long. Please try again.', true);
    }
    throw new ApiError('NETWORK_ERROR', 'Cannot connect to StudySpark server. Please check your connection.', true);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Feature 1: Explain a Topic
 * @param {{ topic: string, level?: string, language?: string }} payload
 * @returns {Promise<{ data: Object, meta: Object }>}
 */
export async function explainTopic(payload) {
  const res = await apiRequest('/api/explain', payload, 'explain');
  return { data: res.data, meta: res.meta };
}

/**
 * Feature 2: Summarize Notes
 * @param {{ notes: string, length?: string, language?: string }} payload
 * @returns {Promise<{ data: Object, meta: Object }>}
 */
export async function summarizeNotes(payload) {
  const res = await apiRequest('/api/summarize', payload, 'summary');
  return { data: res.data, meta: res.meta };
}

/**
 * Feature 3: Generate Quiz
 * @param {{ content: string, difficulty?: string, language?: string }} payload
 * @returns {Promise<{ data: Object, meta: Object }>}
 */
export async function generateQuiz(payload) {
  const res = await apiRequest('/api/quiz', payload, 'quiz');
  return { data: res.data, meta: res.meta };
}

export async function startAdaptiveQuiz(payload) {
  const res = await apiRequest('/api/adaptive-quiz/start', payload, 'adaptive-start');
  return { data: res.data, meta: res.meta };
}

export async function answerAdaptiveQuiz(payload) {
  const res = await apiRequest('/api/adaptive-quiz/answer', payload, 'adaptive-answer');
  return { data: res.data, meta: res.meta };
}

/**
 * Feature 4: Generate Study Plan
 * @param {{ subjects: Array, daily_hours: number, start_date?: string, language?: string }} payload
 * @returns {Promise<{ data: Object, meta: Object }>}
 */
export async function generateStudyPlan(payload) {
  const res = await apiRequest('/api/study-plan', payload, 'study-plan');
  return { data: res.data, meta: res.meta };
}
