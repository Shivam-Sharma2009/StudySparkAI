import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { explainTopic } from '../services/api';
import StatusMessage, { HistoryStorageNotice } from './StatusMessage';
import { Sparkles, Copy, Check, ArrowRight } from 'lucide-react';

const EXAMPLE_CHIPS = ["Photosynthesis", "Newton's third law", "Ohm's law"];

export function ExplainResult({ result, onQuizMe, language = 'en' }) {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  const handleCopy = async () => {
    try {
      const text = `${result.title}\n\n${result.explanation}\n\nExample:\n${result.example}\n\nKey Points:\n${result.key_points.map(p => `- ${p}`).join('\n')}\n\nQuick Recap:\n${result.quick_recap}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  const paragraphs = result.explanation ? result.explanation.split('\n\n') : [];

  return (
    <article
      lang={language || result?.language || 'en'}
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-6 transition-all"
      aria-labelledby="explain-result-title"
    >
      {/* Header & Title */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            {t('explanation')}
          </span>
          <h2
            id="explain-result-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 outline-none"
          >
            {result.title}
          </h2>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition"
          aria-label="Copy explanation to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">{t('copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{t('copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Explanation Paragraphs */}
      <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>

      {/* Worked / Real-life Example Card */}
      {result.example && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span>💡 {t('realLifeExample')}</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">{result.example}</p>
        </div>
      )}

      {/* Key Points Bullet List */}
      {result.key_points && result.key_points.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('keyTakeaways')}
          </h3>
          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {result.key_points.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 mt-1">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Recap Strip */}
      {result.quick_recap && (
        <div className="p-3 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            {t('oneLine')}
          </span>
          <span className="italic">{result.quick_recap}</span>
        </div>
      )}

      {/* Action Row */}
      {onQuizMe && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => onQuizMe(result.title)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>{t('quizOnTopic')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </article>
  );
}

export default function ExplainPanel({ onQuizMe, initialTopic = '' }) {
  const { language, t, formatError } = useSettings();
  const { addEntry, storageWarning } = useStudyHistory();
  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState('beginner'); // beginner | intermediate | advanced
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await explainTopic({
        topic: cleanTopic,
        level,
        language,
      });
      setResult(response.data);
      setStatus('success');
      addEntry({
        type: 'explain',
        language,
        result: response.data,
      });
    } catch (err) {
      setErrorMessage(formatError(err) || t('couldNotExplain'));
      setStatus('error');
    }
  };

  const handleChipClick = (sampleTopic) => {
    setTopic(sampleTopic);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>💡</span>
          <span>{t('explain')}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('explainDescription')}
        </p>
      </div>

      {/* Form Input Card */}
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="explain-topic-input"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400"
          >
            {t('topicOrConcept')}
          </label>
          <textarea
            id="explain-topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('topicPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-400 transition"
            required
          />
          <div className="flex justify-between items-center text-[11px] text-gray-400">
            <span>{t('minimum3')}</span>
            <span className={topic.length > 450 ? 'text-amber-500 font-semibold' : ''}>
              {topic.length} / 500
            </span>
          </div>
        </div>

        {/* Level Segmented Control */}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            {t('studentLevel')}
          </span>
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140]"
            role="radiogroup"
            aria-label={t('studentLevel')}
          >
            {[
              { id: 'beginner', label: t('beginner'), desc: 'Simple analogies' },
              { id: 'intermediate', label: t('intermediate'), desc: 'School basics' },
              { id: 'advanced', label: t('advanced'), desc: 'Deep terminology' },
            ].map((lvl) => (
              <button
                type="button"
                key={lvl.id}
                role="radio"
                aria-checked={level === lvl.id}
                onClick={() => setLevel(lvl.id)}
                className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition ${
                  level === lvl.id
                    ? 'bg-white dark:bg-[#181B24] text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div>{lvl.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading' || topic.trim().length < 3}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:opacity-100 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{status === 'loading' ? t('explaining') : t('explainIt')}</span>
        </button>

        {/* Example chips if idle & empty */}
        {status === 'idle' && !result && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">{t('tryExample')}</span>
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-600 dark:text-gray-300 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Results / Status Area */}
      <div className="pt-2">
        {status === 'loading' && <StatusMessage type="loading" message={t('craftingExplanation')} />}
        {status === 'error' && (
          <StatusMessage type="error" message={errorMessage} onRetry={handleSubmit} />
        )}
        {status === 'success' && result && (
          <ExplainResult result={result} onQuizMe={onQuizMe} language={language} />
        )}
        {status === 'idle' && !result && (
          <StatusMessage type="empty" message={t('enterTopic')} />
        )}
        {status === 'success' && <HistoryStorageNotice warning={storageWarning} />}
      </div>
    </div>
  );
}
