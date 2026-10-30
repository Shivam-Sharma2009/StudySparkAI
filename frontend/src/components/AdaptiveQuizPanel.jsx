import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { answerAdaptiveQuiz, startAdaptiveQuiz } from '../services/api';
import { sanitizeAdaptiveSummary } from '../services/adaptiveQuiz';
import StatusMessage, { HistoryStorageNotice } from './StatusMessage';
import { RotateCcw, Sparkles } from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function handleOptionKeyDown(event) {
  const movement = {
    ArrowDown: 1,
    ArrowRight: 1,
    ArrowUp: -1,
    ArrowLeft: -1,
  }[event.key];
  if (!movement) return;

  const options = Array.from(event.currentTarget.querySelectorAll('[role="radio"]'));
  const currentIndex = options.indexOf(event.target);
  if (currentIndex < 0 || options.length === 0) return;
  event.preventDefault();
  const nextIndex = (currentIndex + movement + options.length) % options.length;
  options[nextIndex].focus();
  options[nextIndex].click();
}

export function AdaptiveQuizSummary({ summary }) {
  const { t } = useSettings();
  const safeSummary = sanitizeAdaptiveSummary(summary);
  if (!safeSummary) return null;

  return (
    <section className="space-y-3 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">{t('adaptiveSummary')}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {t('adaptiveScore', {
          score: safeSummary.score,
          total: safeSummary.answered_count,
        })}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {t('adaptiveCompletionReason', {
          reason: t(`adaptiveReason_${safeSummary.completion_reason}`),
        })}
      </p>
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {t('difficultyHistory')}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {safeSummary.difficulty_history.map((level) => t(level)).join(' → ')}
        </p>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {t('weakConcepts')}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {safeSummary.weak_concepts.length
            ? safeSummary.weak_concepts.join(', ')
            : t('noWeakConcepts')}
        </p>
      </div>
    </section>
  );
}

export default function AdaptiveQuizPanel({ initialContent = '' }) {
  const { language, t, formatError } = useSettings();
  const { addEntry, storageWarning } = useStudyHistory();
  const [content, setContent] = useState(initialContent);
  const [difficulty, setDifficulty] = useState('medium');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState(null);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [practiceReason, setPracticeReason] = useState('');
  const [liveScore, setLiveScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summarySaved, setSummarySaved] = useState(false);
  const requestInFlight = useRef(false);
  const questionHeadingRef = useRef(null);
  const completionHeadingRef = useRef(null);

  const validContent = content.trim().length >= 3 && content.trim().length <= 6000;

  useEffect(() => {
    if (status === 'idle') setContent(initialContent);
  }, [initialContent, status]);

  useEffect(() => {
    if (status === 'active') questionHeadingRef.current?.focus();
    if (status === 'completed') completionHeadingRef.current?.focus();
  }, [status, question?.number]);

  const resetSession = () => {
    setStatus('idle');
    setErrorMessage('');
    setSessionId('');
    setTopic('');
    setQuestion(null);
    setAnswerHistory([]);
    setSelectedIndex(null);
    setFeedback(null);
    setPracticeReason('');
    setLiveScore(0);
    setAnsweredCount(0);
    setWeakConcepts([]);
    setSummary(null);
    setSummarySaved(false);
  };

  const handleStart = async (event) => {
    event.preventDefault();
    if (!validContent || requestInFlight.current) return;
    requestInFlight.current = true;
    setStatus('starting');
    setErrorMessage('');
    try {
      const sessionNonce = window.crypto?.randomUUID?.();
      if (!sessionNonce) {
        setErrorMessage(t('secureSessionUnavailable'));
        setStatus('start-error');
        return;
      }
      const response = await startAdaptiveQuiz({
        content: content.trim(),
        difficulty,
        language,
        session_nonce: sessionNonce,
      });
      setSessionId(response.data.session_id);
      setTopic(response.data.topic);
      setQuestion(response.data.question);
      setAnswerHistory([]);
      setSelectedIndex(null);
      setLiveScore(0);
      setAnsweredCount(0);
      setWeakConcepts([]);
      setStatus('active');
    } catch (error) {
      setErrorMessage(formatError(error) || t('couldNotGenerateQuiz'));
      setStatus('start-error');
    } finally {
      requestInFlight.current = false;
    }
  };

  const saveCompletion = (data) => {
    const safeSummary = sanitizeAdaptiveSummary({
      session_id: data.session_id,
      score: data.score,
      answered_count: data.answered_count,
      difficulty_history: data.difficulty_history,
      weak_concepts: data.weak_concepts,
      completion_reason: data.completion_reason,
    });
    if (!safeSummary) {
      setErrorMessage(t('invalidAdaptiveSummary'));
      setStatus('error');
      return;
    }
    setSummary(safeSummary);
    setStatus('completed');
    if (!summarySaved) {
      addEntry({
        type: 'adaptive',
        language,
        title: t('adaptiveQuiz'),
        result: safeSummary,
      });
      setSummarySaved(true);
    }
  };

  const submitAnswer = async ({ finish = false, finishReason = null } = {}) => {
    if (
      !question ||
      selectedIndex === null ||
      requestInFlight.current ||
      !['active', 'answer-error'].includes(status)
    ) return;

    requestInFlight.current = true;
    setStatus('submitting');
    setErrorMessage('');
    try {
      const response = await answerAdaptiveQuiz({
        session_id: sessionId,
        topic,
        content: content.trim(),
        language,
        initial_difficulty: difficulty,
        current_question: question,
        selected_index: selectedIndex,
        answer_history: answerHistory,
        finish,
        ...(finishReason ? { finish_reason: finishReason } : {}),
      });
      const record = {
        question_id: question.id,
        number: question.number,
        difficulty: question.difficulty,
        concept_tags: question.concept_tags,
        selected_index: selectedIndex,
        correct_index: question.correct_index,
        is_practice: question.is_practice,
      };
      setAnswerHistory((previous) => [...previous, record]);
      setLiveScore(response.data.score);
      setAnsweredCount(response.data.answered_count);
      setWeakConcepts(response.data.weak_concepts);
      if (response.data.next_action === 'complete') {
        saveCompletion(response.data);
        return;
      }

      setFeedback({
        correct: selectedIndex === question.correct_index,
        explanation: question.explanation,
      });
      setPracticeReason(response.data.practice_reason || '');
      setQuestion(response.data.question);
      setSelectedIndex(null);
      setStatus('active');
    } catch (error) {
      setErrorMessage(formatError(error) || t('errorGeneric'));
      setStatus('answer-error');
    } finally {
      requestInFlight.current = false;
    }
  };

  return (
    <section
      lang={language}
      className="space-y-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 sm:p-5"
      aria-labelledby="adaptive-quiz-heading"
    >
      <div>
        <h3
          id="adaptive-quiz-heading"
          className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 outline-none"
        >
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          {t('adaptiveQuiz')}
        </h3>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {t('adaptiveQuizDescription')}
        </p>
      </div>

      {['idle', 'starting', 'start-error'].includes(status) && (
        <form onSubmit={handleStart} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              {t('adaptiveInputLabel')}
            </span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              maxLength={6000}
              disabled={status === 'starting'}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400"
              placeholder={t('quizPlaceholder')}
            />
            <span className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>{t('quizChars')}</span>
              <span>{content.length} / 6000</span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('difficulty')}
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                disabled={status === 'starting'}
                className="min-h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] px-2"
              >
                {DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>{t(level)}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!validContent || status === 'starting'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {status === 'starting' ? t('adaptiveStarting') : t('startAdaptiveQuiz')}
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('adaptiveDifficultyHelp')}</p>
        </form>
      )}

      {status === 'start-error' && (
        <StatusMessage
          type="error"
          message={errorMessage}
          onRetry={handleStart}
        />
      )}

      {['active', 'submitting', 'answer-error'].includes(status) && question && (
        <div className="space-y-4" aria-labelledby="adaptive-current-question">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              {t('adaptiveQuestionProgress', {
                current: question.number,
                total: 10,
              })}
            </span>
            <span className="rounded-full bg-white dark:bg-[#181B24] px-3 py-1 font-semibold text-gray-700 dark:text-gray-300">
              {t('difficulty')}: {t(question.difficulty)}
              {question.is_practice ? ` · ${t('targetedPractice')}` : ''}
            </span>
          </div>
          <div
            aria-live="polite"
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300"
          >
            <span>{t('adaptiveLiveScore', { score: liveScore, answered: answeredCount })}</span>
            <span>
              {t('weakConcepts')}: {weakConcepts.length ? weakConcepts.join(', ') : t('noWeakConcepts')}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
            role="progressbar"
            aria-label={t('adaptiveProgress')}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={question.number}
          >
            <div
              className="h-full bg-indigo-600 motion-reduce:transition-none"
              style={{ width: `${(question.number / 10) * 100}%` }}
            />
          </div>
          {practiceReason && (
            <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
              {t('adaptivePracticeReason', { reason: practiceReason })}
            </p>
          )}
          {feedback && (
            <div aria-live="polite" className={`rounded-lg p-3 text-xs ${
              feedback.correct
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200'
            }`}>
              <strong>{feedback.correct ? t('adaptiveCorrect') : t('adaptiveIncorrect')}</strong>
              {' '}{feedback.explanation}
            </div>
          )}

          <fieldset
            disabled={status !== 'active'}
            onKeyDown={handleOptionKeyDown}
            className="space-y-3"
          >
            <legend
              ref={questionHeadingRef}
              id="adaptive-current-question"
              tabIndex={-1}
              className="text-sm font-bold text-gray-900 dark:text-gray-100"
            >
              {question.number}. {question.question}
            </legend>
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${index}`}
                type="button"
                role="radio"
                aria-checked={selectedIndex === index}
                tabIndex={selectedIndex === index || (selectedIndex === null && index === 0) ? 0 : -1}
                onClick={() => setSelectedIndex(index)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                  selectedIndex === index
                    ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] text-gray-800 dark:text-gray-200'
                }`}
              >
                <span className="font-bold">{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </button>
            ))}
          </fieldset>

          {status === 'answer-error' && (
            <div className="space-y-3" aria-live="polite">
              <StatusMessage type="error" message={errorMessage} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submitAnswer()}
                  className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {t('retryAdaptiveAnswer')}
                </button>
                <button
                  type="button"
                  onClick={() => submitAnswer({ finish: true, finishReason: 'provider_error' })}
                  className="min-h-11 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                >
                  {t('finishAfterAdaptiveError')}
                </button>
              </div>
            </div>
          )}

          {status === 'active' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={selectedIndex === null}
                onClick={() => submitAnswer()}
                className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {t('submitAdaptiveAnswer')}
              </button>
              {question.number < 10 && (
                <button
                  type="button"
                  disabled={selectedIndex === null}
                  onClick={() => submitAnswer({ finish: true, finishReason: 'user_stopped' })}
                  className="min-h-11 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  {t('finishAdaptiveQuiz')}
                </button>
              )}
            </div>
          )}
          {status === 'submitting' && (
            <StatusMessage type="loading" message={t('adaptiveSubmitting')} />
          )}
        </div>
      )}

      {status === 'completed' && summary && (
        <div className="space-y-4" aria-live="polite">
          <h4 tabIndex={-1} ref={completionHeadingRef} className="text-base font-bold text-gray-900 dark:text-gray-100">
            {t('adaptiveSessionComplete')}
          </h4>
          <AdaptiveQuizSummary summary={summary} />
          <HistoryStorageNotice warning={storageWarning} />
          <button
            type="button"
            onClick={resetSession}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
            {t('newAdaptiveSession')}
          </button>
        </div>
      )}

      {status === 'error' && (
        <StatusMessage type="error" message={errorMessage} />
      )}
    </section>
  );
}
