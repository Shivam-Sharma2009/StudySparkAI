import React, { useState, useEffect } from 'react';
import { checkHealth } from './services/api';
import { Sparkles, BookOpen, FileText, CheckCircle2, Calendar, Moon, Sun, ShieldAlert, Cpu } from 'lucide-react';
import StatusMessage from './components/StatusMessage';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setHealthError(err.message || 'Health check failed');
    } finally {
      setLoadingHealth(false);
    }
  };

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#0F1117] text-[#ECEDF2]' : 'bg-[#FAFAF7] text-[#1B1B1F]'}`}>
      {/* Header */}
      <header className="border-b border-[#E5E3DA] dark:border-[#2C3140] bg-white dark:bg-[#181B24] sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                StudySpark AI
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Learn Smarter, Not Harder. 📚
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status dot */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <span className={`w-2.5 h-2.5 rounded-full ${
                loadingHealth 
                  ? 'bg-amber-400 animate-pulse' 
                  : health?.status === 'ok' 
                    ? health?.ai_configured ? 'bg-emerald-500' : 'bg-amber-500' 
                    : 'bg-red-500'
              }`} />
              <span className="text-gray-600 dark:text-gray-300">
                {loadingHealth 
                  ? 'Checking…' 
                  : health?.status === 'ok' 
                    ? health.ai_configured ? 'Engine Ready' : 'AI Key Missing' 
                    : 'Engine Offline'}
              </span>
            </div>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Toggle Language"
            >
              {language === 'en' ? 'EN | हिं' : 'हिं | EN'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Banner */}
        <section className="p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              0.5
            </div>
            <div>
              <h2 className="text-xl font-bold">Phase 0 — Scaffold & Smoke Test</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                StudySpark AI core scaffold initialized and verified against specifications.
              </p>
            </div>
          </div>

          {/* Engine Status Card */}
          <div className="p-4 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Backend Engine Health Check
              </span>
              <button 
                onClick={fetchHealth} 
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Refresh
              </button>
            </div>

            {loadingHealth && <StatusMessage type="loading" message="Querying /api/health..." />}
            
            {healthError && (
              <StatusMessage 
                type="error" 
                message={`Health check error: ${healthError}`} 
                onRetry={fetchHealth} 
              />
            )}

            {health && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{health.status}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Version</span>
                  <span className="font-semibold">{health.version}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Model Target</span>
                  <span className="font-semibold truncate block" title={health.model}>{health.model}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">AI Configured</span>
                  <span className={`font-semibold ${health.ai_configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                    {health.ai_configured ? 'Yes (Key Set)' : 'No (Pending Key)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feature Stubs Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
              Four Core Tools (Ready for Phase 1 & 3)
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
              VITE_USE_MOCKS Supported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm">💡 Explain a Topic</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Structured analogies, explanations, worked examples, and key points tailored to Beginner, Intermediate, or Advanced.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm">📝 Summarize Notes</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Extractive summaries strictly bounded by provided notes, with key terms vocabulary glossary.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm">🎯 Generate Quiz</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Interactive 5-question multiple choice quizzes with shuffled distractors and explanations per option.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm">📅 Generate Study Plan</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Horizon-bounded schedules up to 14 days with study session types: learn, practice, revise, and test.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-500 pt-8 pb-12 border-t border-[#E5E3DA] dark:border-[#2C3140]">
          AI can make mistakes — verify important facts. Don't enter personal or sensitive information.
        </footer>
      </main>
    </div>
  );
}
