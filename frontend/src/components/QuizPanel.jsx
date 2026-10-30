import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { generateQuiz } from '../services/api';
import StatusMessage, { HistoryStorageNotice } from './StatusMessage';
import { CheckCircle2, Check, X, RotateCcw, Plus, Sparkles, HelpCircle } from 'lucide-react';

function handleRadioGroupKeyDown(event) {
  const movement = {
    ArrowDown: 1,
    ArrowRight: 1,
    ArrowUp: -1,
    ArrowLeft: -1,
  }[event.key];
  if (!movement) return;

  const radios = Array.from(event.currentTarget.querySelectorAll('[role="radio"]:not(:disabled)'));
  const currentIndex = radios.indexOf(event.target);
  if (currentIndex < 0 || radios.length === 0) return;

  event.preventDefault();
  const nextIndex = (currentIndex + movement + radios.length) % radios.length;
  radios[nextIndex].focus();
  radios[nextIndex].click();
}

export function QuizResult({ quiz, onNewQuiz, language = 'en', onCompleteQuiz }) {
  const { t } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState([]); // [{ questionId, selectedIndex, isCorrect }]
  const [completed, setCompleted] = useState(false);
  const headingRef = useRef(null);

  const questions = quiz.questions || [];
  const currentQ = questions[currentIndex];

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentIndex, completed]);

  const handleSelectOption = (idx) => {
    if (checked) return;
    setSelectedOption(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || checked) return;
    const isCorrect = selectedOption === currentQ.correct_index;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        selectedIndex: selectedOption,
        isCorrect,
      },
    ]);
    setChecked(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setChecked(false);
    } else {
      const finalScore =
        answers.filter((a) => a.isCorrect).length +
        (selectedOption === currentQ.correct_index ? 1 : 0);
      setCompleted(true);
      if (onCompleteQuiz) {
        onCompleteQuiz({
          score: finalScore,
          total: questions.length,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
        });
      }
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setChecked(false);
    setAnswers([]);
    setCompleted(false);
  };

  const score = answers.filter((a) => a.isCorrect).length;

  if (completed) {
    return (
      <article
        lang={language || quiz?.language || 'en'}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-6"
        aria-labelledby="quiz-result-summary"
      >
        <div className="text-center space-y-2 py-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {t('quizCompleted')}
          </span>
          <h2
            id="quiz-result-summary"
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 outline-none"
          >
            {score} / {questions.length}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {score === questions.length
              ? t('outstanding')
              : score >= 3
              ? t('solidWork')
              : t('reviewAnswers')}
          </p>

          <div className="pt-3 flex justify-center gap-3">
            <button
              onClick={handleRetake}
              className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('retakeQuiz')}
            </button>
            {onNewQuiz && (
              <button
                onClick={onNewQuiz}
                className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('newQuiz')}
              </button>
            )}
          </div>
        </div>

        {/* Review list */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('questionReview')}
          </h3>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const record = answers[idx] || {};
              const userSelected = record.selectedIndex;
              const isCorrect = record.isCorrect;

              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    isCorrect
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2 font-semibold text-gray-800 dark:text-gray-200">
                    <span className="mt-0.5">
                      {isCorrect ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </span>
                    <span>
                      {idx + 1}. {q.question}
                    </span>
                  </div>

                  <div className="pl-6 space-y-1 text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {t('correctAnswer')}
                      </span>{' '}
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        {q.options[q.correct_index]}
                      </span>
                    </div>
                    {!isCorrect && userSelected !== undefined && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {t('yourAnswer')}
                        </span>{' '}
                        <span className="text-red-700 dark:text-red-300">
                          {q.options[userSelected]}
                        </span>
                      </div>
                    )}
                    <div className="pt-1 italic text-gray-500 dark:text-gray-400">
                      {t('why')} {q.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>
    );
  }

  // Active question card
  if (!currentQ) return null;
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <article
      lang={language || quiz?.language || 'en'}
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-5"
      aria-labelledby="quiz-active-question"
    >
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {t('question')} {currentIndex + 1} {t('of')} {questions.length}
          </span>
          <span>Topic: {quiz.topic}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question text */}
      <h2
        id="quiz-active-question"
        ref={headingRef}
        tabIndex={-1}
        className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 outline-none"
      >
        {currentQ.question}
      </h2>

      {/* 4 Options */}
      <div
        className="space-y-2.5"
        role="radiogroup"
        aria-label={`Options for question ${currentIndex + 1}`}
        onKeyDown={handleRadioGroupKeyDown}
      >
        {currentQ.options.map((opt, oIdx) => {
          const isSelected = selectedOption === oIdx;
          const isCorrect = currentQ.correct_index === oIdx;

          let optionStyle =
            'border-gray-200 dark:border-gray-700 bg-[#FAFAF7] dark:bg-[#1C202B] hover:border-indigo-400 dark:hover:border-indigo-500';

          if (checked) {
            if (isCorrect) {
              optionStyle =
                'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
            } else if (isSelected && !isCorrect) {
              optionStyle =
                'border-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-semibold';
            } else {
              optionStyle = 'opacity-60 border-gray-200 dark:border-gray-700';
            }
          } else if (isSelected) {
            optionStyle =
              'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100 font-medium ring-2 ring-indigo-600/30';
          }

          return (
            <button
              key={oIdx}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={
                selectedOption === null
                  ? oIdx === 0
                    ? 0
                    : -1
                  : isSelected
                  ? 0
                  : -1
              }
              disabled={checked}
              onClick={() => handleSelectOption(oIdx)}
              className={`w-full min-h-[50px] p-3 rounded-xl border text-left text-xs sm:text-sm flex items-center justify-between transition-all ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#181B24] border border-inherit flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {optionLetters[oIdx]}
                </span>
                <span>{opt}</span>
              </div>

              {checked && isCorrect && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex-shrink-0">
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Correct</span>
                </div>
              )}
              {checked && isSelected && !isCorrect && (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs flex-shrink-0">
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Incorrect</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner after Checking */}
      {checked && (
        <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-xs leading-relaxed space-y-1 animate-fadeIn">
          <span className="font-bold text-indigo-700 dark:text-indigo-300 block">
            {t('explanationLabel')}
          </span>
          <p className="text-gray-700 dark:text-gray-300">{currentQ.explanation}</p>
        </div>
      )}

      {/* Action Button: Check Answer or Next Question */}
      <div className="pt-2 flex justify-end">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheckAnswer}
            disabled={selectedOption === null}
            className="w-full min-h-11 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:opacity-100 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
          >
            {t('checkAnswer')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="w-full min-h-11 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
          >
            {currentIndex < questions.length - 1 ? t('nextQuestion') : t('seeResults')}
          </button>
        )}
      </div>
    </article>
  );
}

export default function QuizPanel({ initialContent = '' }) {
  const { language, t, formatError } = useSettings();
  const { addEntry, saveQuizScore, updateEntryScore, storageWarning } = useStudyHistory();
  const [content, setContent] = useState(initialContent);
  const [difficulty, setDifficulty] = useState('medium'); // easy | medium | hard
  const [status, setStatus] = useState('idle');
  const [quiz, setQuiz] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastEntryId, setLastEntryId] = useState(null);

  const isValid = content.trim().length >= 3 && content.trim().length <= 6000;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (status === 'loading') return;
    if (!isValid) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await generateQuiz({
        content: content.trim(),
        difficulty,
        language,
      });
      setQuiz(response.data);
      setStatus('success');
      const entry = addEntry({
        type: 'quiz',
        language,
        result: response.data,
      });
      setLastEntryId(entry?.id);
    } catch (err) {
      setErrorMessage(formatError(err) || t('couldNotGenerateQuiz'));
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>🎯</span>
          <span>{t('quiz')}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('quizDescription')}
        </p>
      </div>

      {/* Input Card */}
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="quiz-content-input"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400"
          >
            {t('topicOrMaterial')}
          </label>
          <textarea
            id="quiz-content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={6000}
            placeholder={t('quizPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 transition"
            required
          />
          <div className="flex justify-between items-center text-[11px] text-gray-400">
            <span>{t('quizChars')}</span>
            <span>{content.length} / 6000</span>
          </div>
        </div>

        {/* Difficulty Control */}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            {t('difficulty')}
          </span>
          <div
            className="grid grid-cols-3 gap-1 p-1 max-w-md rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140]"
            role="radiogroup"
            aria-label={t('difficulty')}
            onKeyDown={handleRadioGroupKeyDown}
          >
            {[
              { id: 'easy', label: t('easy'), desc: 'Direct recall' },
              { id: 'medium', label: t('medium'), desc: 'Application' },
              { id: 'hard', label: t('hard'), desc: 'Deep reasoning' },
            ].map((diff) => (
              <button
                type="button"
                key={diff.id}
                role="radio"
                aria-checked={difficulty === diff.id}
                tabIndex={difficulty === diff.id ? 0 : -1}
                onClick={() => setDifficulty(diff.id)}
                className={`min-h-11 min-w-11 py-2 px-2 rounded-lg text-xs font-medium text-center transition ${
                  difficulty === diff.id
                    ? 'bg-white dark:bg-[#181B24] text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div>{diff.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={status === 'loading' || !isValid}
          className="w-full min-h-11 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:opacity-100 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{status === 'loading' ? t('generatingQuiz') : t('generateQuiz')}</span>
        </button>
      </form>

      {/* Quiz Area */}
      <div className="pt-2">
        {status === 'loading' && <StatusMessage type="loading" message={t('draftingQuestions')} />}
        {status === 'error' && (
          <StatusMessage type="error" message={errorMessage} onRetry={handleSubmit} />
        )}
        {status === 'success' && quiz && (
          <QuizResult
            quiz={quiz}
            onNewQuiz={() => setStatus('idle')}
            language={language}
            onCompleteQuiz={({ score, total }) =>
              {
                updateEntryScore(lastEntryId, score, total);
                saveQuizScore({
                  entryId: lastEntryId,
                  topic: quiz.topic,
                  score,
                  total,
                  difficulty,
                });
              }
            }
          />
        )}
        {status === 'idle' && !quiz && (
          <StatusMessage type="empty" message={t('launchQuiz')} />
        )}
        {status === 'success' && <HistoryStorageNotice warning={storageWarning} />}
      </div>
    </div>
  );
}
