import React, { useState } from 'react';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { ExplainResult } from '../components/ExplainPanel';
import { SummaryResult } from '../components/SummaryPanel';
import { QuizResult } from '../components/QuizPanel';
import { StudyPlanResult } from '../components/StudyPlanPanel';
import {
  History,
  BookOpen,
  FileText,
  CheckCircle2,
  Calendar,
  Trash2,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  X,
  Languages,
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'explain', label: 'Explain' },
  { id: 'summary', label: 'Summary' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'plan', label: 'Plan' },
];

const TYPE_CONFIG = {
  explain: {
    icon: BookOpen,
    label: 'Explanation',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
  },
  summary: {
    icon: FileText,
    label: 'Summary',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
  },
  quiz: {
    icon: CheckCircle2,
    label: 'Quiz',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
  },
  plan: {
    icon: Calendar,
    label: 'Study Plan',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
  },
};

export default function StudyHistory({ onNavigateToTool }) {
  const { history, removeEntry, clearHistory, stats, seedDemoData } = useStudyHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [viewingItem, setViewingItem] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredItems =
    activeTab === 'all'
      ? history
      : history.filter((item) => item.type === activeTab);

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>🕘</span>
            <span>Study History</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review your previously generated explanations, summaries, quiz scores, and roadmaps.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {history.length === 0 && (
            <button
              onClick={seedDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>
          )}

          {history.length > 0 && !showClearConfirm && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          )}

          {showClearConfirm && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Delete all {history.length} items?
              </span>
              <button
                onClick={() => {
                  clearHistory();
                  setShowClearConfirm(false);
                  setViewingItem(null);
                }}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded transition"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Quizzes Taken
          </span>
          <span className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.quizzesTaken}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Best Score
          </span>
          <span className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.bestScore}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Average Score
          </span>
          <span className="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.avgScore}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Roadmaps
          </span>
          <span className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400">
            {stats.savedPlans}
          </span>
        </div>
      </div>

      {/* Viewing Single Item Detail Modal / Section */}
      {viewingItem && (
        <div className="space-y-3 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border-2 border-indigo-500/40 dark:border-indigo-500/30 shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Viewing Saved {TYPE_CONFIG[viewingItem.type]?.label || 'Result'}
              </span>
              <span className="text-xs text-gray-400">
                • {formatDate(viewingItem.createdAt)}
              </span>
              {viewingItem.language === 'hi' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  हिन्दी (HI)
                </span>
              )}
            </div>
            <button
              onClick={() => setViewingItem(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Close view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2" lang={viewingItem.language || 'en'}>
            {viewingItem.type === 'explain' && viewingItem.result && (
              <ExplainResult
                result={viewingItem.result}
                onQuizMe={(topic) => onNavigateToTool && onNavigateToTool('quiz', topic)}
              />
            )}
            {viewingItem.type === 'summary' && viewingItem.result && (
              <SummaryResult
                result={viewingItem.result}
                onQuizMe={(content) => onNavigateToTool && onNavigateToTool('quiz', content)}
              />
            )}
            {viewingItem.type === 'quiz' && viewingItem.result && (
              <QuizResult quiz={viewingItem.result} onNewQuiz={() => setViewingItem(null)} />
            )}
            {viewingItem.type === 'plan' && viewingItem.result && (
              <StudyPlanResult plan={viewingItem.result} planId={viewingItem.id} />
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E5E3DA] dark:border-[#2C3140] gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === 'all'
              ? history.length
              : history.filter((i) => i.type === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* History Items List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.explain;
            const Icon = config.icon;
            const isViewing = viewingItem?.id === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-white dark:bg-[#181B24] border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md ${
                  isViewing
                    ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-[#E5E3DA] dark:border-[#2C3140]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {config.label}
                      </span>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                      {item.language === 'hi' && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          हिन्दी
                        </span>
                      )}
                    </div>

                    <p
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2"
                      lang={item.language || 'en'}
                    >
                      {item.result?.title || item.inputPreview || 'Saved study session'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => setViewingItem(isViewing ? null : item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isViewing ? 'Hide' : 'Open'}</span>
                  </button>

                  <button
                    onClick={() => {
                      removeEntry(item.id);
                      if (viewingItem?.id === item.id) setViewingItem(null);
                    }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Delete item"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Nothing saved yet in {activeTab === 'all' ? 'history' : activeTab}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Your generated study explanations, notes summaries, quiz scores, and roadmaps will appear here automatically.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {onNavigateToTool && (
              <button
                onClick={() => onNavigateToTool('explain')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>Start learning now</span>
              </button>
            )}
            <button
              onClick={seedDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load sample data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
