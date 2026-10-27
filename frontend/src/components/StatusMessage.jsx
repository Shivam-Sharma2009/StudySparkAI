import React from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function StatusMessage({ type = 'empty', message = '', onRetry = null }) {
  if (type === 'loading') {
    return (
      <div 
        className="flex flex-col items-center justify-center p-8 text-center space-y-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {message || 'StudySpark is thinking…'}
        </p>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div 
        className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 text-red-800 dark:text-red-300 space-y-3"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            {message || 'Something went wrong. Please try again.'}
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // type === 'empty'
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 dark:text-gray-400 space-y-2">
      <Sparkles className="w-8 h-8 text-amber-500/70" />
      <p className="text-sm">{message || 'Ready when you are! Choose a tool to get started.'}</p>
    </div>
  );
}
