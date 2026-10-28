import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Loader2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

export default function StatusMessage({
  type = 'empty',
  message = '',
  onRetry = null,
}) {
  const { t } = useSettings();
  const rotatingTexts = [
    t('thinking'),
    t('findingWords'),
    t('organizingPoints'),
    t('almostThere'),
  ];
  const [textIndex, setTextIndex] = useState(0);

  // Rotate loading texts every 2 seconds unless user prefers reduced motion
  useEffect(() => {
    if (type !== 'loading') return;
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [type]);

  if (type === 'loading') {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 dark:border-indigo-950/60 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 absolute" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {message || rotatingTexts[textIndex]}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('tailoringResponse')}
          </p>
        </div>

        {/* Skeleton animation lines */}
        <div className="w-full max-w-md space-y-2 pt-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-3/4 mx-auto" />
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-5/6 mx-auto" />
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div
        className="p-5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200 space-y-3 shadow-sm"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold">{t('somethingWrong')}</h4>
            <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
              {message || t('errorGeneric')}
            </p>
          </div>
        </div>

        {onRetry && (
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('tryAgain')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // type === 'empty'
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 dark:text-gray-400 space-y-3 rounded-2xl border border-dashed border-[#E5E3DA] dark:border-[#2C3140] bg-white/40 dark:bg-[#181B24]/40">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <Sparkles className="w-6 h-6" />
      </div>
      <div className="max-w-sm space-y-1">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('readyToLearn')}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {message || t('fillForm')}
        </p>
      </div>
    </div>
  );
}
