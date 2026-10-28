import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { summarizeNotes } from '../services/api';
import StatusMessage, { HistoryStorageNotice } from './StatusMessage';
import { FileText, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';

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

export function SummaryResult({ result, onQuizMe, language = 'en' }) {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  const handleCopy = async () => {
    try {
      const termsText =
        result.key_terms && result.key_terms.length > 0
          ? `\n\nKey Terms:\n${result.key_terms.map(t => `${t.term}: ${t.meaning}`).join('\n')}`
          : '';
      const text = `Summary:\n${result.summary}\n\nKey Points:\n${result.key_points.map(p => `- ${p}`).join('\n')}${termsText}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  return (
    <article
      lang={language || result?.language || 'en'}
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-6 transition-all"
      aria-labelledby="summary-result-title"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            {t('summaryType')}
          </span>
          <h2
            id="summary-result-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 outline-none"
          >
            {t('notesSummary')}
          </h2>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition"
          aria-label="Copy summary to clipboard"
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

      {/* Summary paragraph */}
      <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-[#FAFAF7] dark:bg-[#141720] p-4 rounded-xl border border-[#E5E3DA] dark:border-[#2C3140]">
        <p>{result.summary}</p>
      </div>

      {/* Key points list */}
      {result.key_points && result.key_points.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('corePoints')}
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

      {/* Key terms definition list */}
      {result.key_terms && result.key_terms.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('keyVocabulary')}
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {result.key_terms.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] space-y-1"
              >
                <dt className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {t.term}
                </dt>
                <dd className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                  {t.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Action Row */}
      {onQuizMe && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => onQuizMe(result.summary)}
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>{t('quizFromSummary')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </article>
  );
}

export default function SummaryPanel({ onQuizMe }) {
  const { language, t, formatError } = useSettings();
  const { addEntry, storageWarning } = useStudyHistory();
  const [notes, setNotes] = useState('');
  const [length, setLength] = useState('short'); // short | medium
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const charCount = notes.length;
  const isTooShort = charCount > 0 && charCount < 50;
  const isTooLong = charCount > 8000;
  const isValid = charCount >= 50 && charCount <= 8000;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (status === 'loading') return;
    if (!isValid) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await summarizeNotes({
        notes: notes.trim(),
        length,
        language,
      });
      setResult(response.data);
      setStatus('success');
      addEntry({
        type: 'summary',
        language,
        title: t('notesSummary'),
        result: response.data,
      });
    } catch (err) {
      setErrorMessage(formatError(err) || t('couldNotSummarize'));
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>📝</span>
          <span>{t('summary')}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('summarizeDescription')}
        </p>
      </div>

      {/* Input Form Card */}
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label
            htmlFor="summary-notes-input"
            className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400"
          >
            {t('studyNotes')}
          </label>
          <textarea
            id="summary-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder={t('notesPlaceholder')}
            className={`w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-2 transition ${
              isTooLong
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-600 dark:focus:ring-indigo-400'
            }`}
            required
          />

          <div className="flex justify-between items-center text-[11px]">
            <span className={isTooShort ? 'text-amber-500 font-semibold' : 'text-gray-400'}>
              {isTooShort ? t('needs50') : isTooLong ? t('over8000') : t('charRange')}
            </span>
            <span
              className={
                isTooLong
                  ? 'text-red-500 font-bold'
                  : charCount > 7200
                  ? 'text-amber-500 font-semibold'
                  : 'text-gray-400'
              }
            >
              {charCount} / 8000
            </span>
          </div>

          {isTooLong && (
            <p className="text-xs text-red-500">
              {t('shortenNotes')}
            </p>
          )}
        </div>

        {/* Summary Length Control */}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            {t('summaryDepth')}
          </span>
          <div
            className="grid grid-cols-2 gap-1 p-1 max-w-sm rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140]"
            role="radiogroup"
            aria-label={t('summaryDepth')}
            onKeyDown={handleRadioGroupKeyDown}
          >
            {[
              { id: 'short', label: t('shortRecap'), desc: '3-4 sentences' },
              { id: 'medium', label: t('mediumDetailed'), desc: '1-2 paragraphs' },
            ].map((len) => (
              <button
                type="button"
                key={len.id}
                role="radio"
                aria-checked={length === len.id}
                tabIndex={length === len.id ? 0 : -1}
                onClick={() => setLength(len.id)}
                className={`min-h-11 min-w-11 py-2 px-2 rounded-lg text-xs font-medium text-center transition ${
                  length === len.id
                    ? 'bg-white dark:bg-[#181B24] text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div>{len.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === 'loading' || !isValid}
          className="w-full min-h-11 sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:opacity-100 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{status === 'loading' ? t('summarizing') : t('summarize')}</span>
        </button>
      </form>

      {/* Results / Status Area */}
      <div className="pt-2">
        {status === 'loading' && <StatusMessage type="loading" message={t('synthesizing')} />}
        {status === 'error' && (
          <StatusMessage type="error" message={errorMessage} onRetry={handleSubmit} />
        )}
        {status === 'success' && result && (
          <SummaryResult result={result} onQuizMe={onQuizMe} language={language} />
        )}
        {status === 'idle' && !result && (
          <StatusMessage type="empty" message={t('pasteNotes')} />
        )}
        {status === 'success' && <HistoryStorageNotice warning={storageWarning} />}
      </div>
    </div>
  );
}
