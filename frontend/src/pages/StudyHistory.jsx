import React, { useState } from 'react';
import { History, BookOpen, FileText, CheckCircle2, Calendar, Trash2, ArrowLeft } from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'explain', label: 'Explain' },
  { id: 'summary', label: 'Summary' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'plan', label: 'Plan' },
];

export default function StudyHistory({ onNavigateToTool }) {
  const [activeTab, setActiveTab] = useState('all');
  const [historyItems, setHistoryItems] = useState([]); // placeholder ready for Phase 4

  const filteredItems =
    activeTab === 'all'
      ? historyItems
      : historyItems.filter((item) => item.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>🕘</span>
            <span>Study History</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review your previously generated explanations, summaries, quiz scores, and study plans.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={() => setHistoryItems([])}
            className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 transition"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Quizzes Taken
          </span>
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            0
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Best Score
          </span>
          <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            —
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Saved Roadmaps
          </span>
          <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
            0
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E3DA] dark:border-[#2C3140] gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State placeholder */}
      {filteredItems.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Nothing saved yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Your generated study explanations, notes summaries, quiz scores, and roadmaps will appear here automatically.
            </p>
          </div>
          {onNavigateToTool && (
            <button
              onClick={() => onNavigateToTool('explain')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              Start learning now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
