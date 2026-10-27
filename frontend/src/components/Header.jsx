import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Moon, Sun, Menu, X, Cpu } from 'lucide-react';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  health,
  loadingHealth,
  onRefreshHealth,
}) {
  const { theme, language, toggleTheme, toggleLanguage } = useSettings();
  const [showWakeupBanner, setShowWakeupBanner] = useState(false);

  // 3-second timer for wake-up banner per 07-UI-UX-Spec §5.7 & 04-Flows §7
  useEffect(() => {
    let timer;
    if (loadingHealth && !health) {
      timer = setTimeout(() => {
        setShowWakeupBanner(true);
      }, 3000);
    } else {
      setShowWakeupBanner(false);
    }
    return () => clearTimeout(timer);
  }, [loadingHealth, health]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const isConfigured = health?.status === 'ok' && health?.ai_configured;
  const isHealthy = health?.status === 'ok';

  return (
    <header className="border-b border-[#E5E3DA] dark:border-[#2C3140] bg-white dark:bg-[#181B24] sticky top-0 z-30 transition-colors shadow-sm">
      {/* Wake-up banner */}
      {showWakeupBanner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 text-center font-medium animate-pulse">
          ⚡ Waking up the study engine… this can take up to a minute the first time.
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Logo & Tagline */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5 cursor-pointer select-none">
            <span className="text-2xl" role="img" aria-label="spark">
              ⚡
            </span>
            <div>
              <span className="font-bold text-lg leading-tight tracking-tight text-indigo-600 dark:text-indigo-400">
                StudySpark AI
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Learn Smarter, Not Harder. 📚
              </p>
            </div>
          </div>
        </div>

        {/* Right: Engine status + Language toggle + Theme toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Engine status indicator */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-800 bg-[#F1F0EA] dark:bg-[#20242F] transition-colors"
            title={
              loadingHealth
                ? 'Checking backend status...'
                : isConfigured
                ? `Engine Ready (${health?.model || 'Gemma'})`
                : isHealthy
                ? 'Engine Ready (API Key Pending)'
                : 'Engine Offline (Click to retry)'
            }
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                loadingHealth
                  ? 'bg-amber-400 animate-pulse'
                  : isConfigured
                  ? 'bg-emerald-500'
                  : isHealthy
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-gray-600 dark:text-gray-300 hidden md:inline text-[11px]">
              {loadingHealth
                ? 'Connecting…'
                : isConfigured
                ? 'Engine Ready'
                : isHealthy
                ? 'AI Key Missing'
                : 'Offline'}
            </span>
            {!isHealthy && onRefreshHealth && (
              <button
                onClick={onRefreshHealth}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 underline ml-0.5"
              >
                Retry
              </button>
            )}
          </div>

          {/* Language toggle: EN | हिं */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200"
            title="Toggle output language between English and Hindi"
            aria-label={`Current language ${language}. Click to toggle.`}
          >
            {language === 'en' ? 'EN | हिं' : 'हिं | EN'}
          </button>

          {/* Theme toggle: Light / Dark */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300"
            aria-label="Toggle light or dark theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
