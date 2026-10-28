import React from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckCircle2,
  Calendar,
  History,
  Sparkles,
} from 'lucide-react';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    id: 'explain',
    labelKey: 'explain',
    icon: BookOpen,
    badge: 'Core',
  },
  {
    id: 'summary',
    labelKey: 'summary',
    icon: FileText,
    badge: 'Core',
  },
  {
    id: 'quiz',
    labelKey: 'quiz',
    icon: CheckCircle2,
    badge: '5 MCQs',
  },
  {
    id: 'plan',
    labelKey: 'plan',
    icon: Calendar,
    badge: 'Timeline',
  },
  {
    id: 'history',
    labelKey: 'history',
    icon: History,
    badge: null,
  },
];

export default function Sidebar({
  activeTool,
  onSelectTool,
  sidebarOpen,
  setSidebarOpen,
}) {
  const { t } = useSettings();
  const badgeLabels = { Core: t('core'), '5 MCQs': t('fiveMcqs'), Timeline: t('timeline') };

  return (
    <>
      {/* Mobile / Tablet overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer / panel */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-60 bg-white dark:bg-[#181B24] border-r border-[#E5E3DA] dark:border-[#2C3140] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('navTools')}
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTool(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full min-h-11 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                  <span>{t(item.labelKey)}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      isActive
                        ? 'bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {badgeLabels[item.badge] || item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar footer quote / hint */}
        <div className="p-3 m-3 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('tutorName')}</span>
          </div>
          <p className="leading-snug">
            {t('tutorDescription')}
          </p>
        </div>
      </aside>
    </>
  );
}

/**
 * Mobile Bottom Tab Bar (< 640px)
 */
export function BottomTabBar({ activeTool, onSelectTool }) {
  const { t } = useSettings();
  const bottomTools = [
    { id: 'explain', label: t('explain'), icon: BookOpen },
    { id: 'summary', label: t('summary'), icon: FileText },
    { id: 'quiz', label: t('quiz'), icon: CheckCircle2 },
    { id: 'plan', label: t('plan'), icon: Calendar },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#181B24]/95 backdrop-blur border-t border-[#E5E3DA] dark:border-[#2C3140] px-2 py-1 flex sm:hidden justify-around items-center shadow-lg"
      aria-label="Mobile Bottom Navigation"
    >
      {bottomTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110' : ''}`} />
            <span>{tool.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
