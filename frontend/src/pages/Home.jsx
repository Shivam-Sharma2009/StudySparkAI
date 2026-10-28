import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import ExplainPanel from '../components/ExplainPanel';
import SummaryPanel from '../components/SummaryPanel';
import QuizPanel from '../components/QuizPanel';
import StudyPlanPanel from '../components/StudyPlanPanel';
import StudyHistory from './StudyHistory';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function Home({
  activeTool,
  setActiveTool,
  health,
  loadingHealth,
  onRefreshHealth,
}) {
  const { t } = useSettings();
  const [prefilledQuizContent, setPrefilledQuizContent] = useState('');

  const handleQuizMe = (content) => {
    setPrefilledQuizContent(content);
    setActiveTool('quiz');
  };

  if (activeTool === 'explain') {
    return <ExplainPanel onQuizMe={handleQuizMe} />;
  }

  if (activeTool === 'summary') {
    return <SummaryPanel onQuizMe={handleQuizMe} />;
  }

  if (activeTool === 'quiz') {
    return <QuizPanel initialContent={prefilledQuizContent} />;
  }

  if (activeTool === 'plan') {
    return <StudyPlanPanel />;
  }

  if (activeTool === 'history') {
    return <StudyHistory onNavigateToTool={setActiveTool} />;
  }

  // Dashboard Overview (Default)
  const isReady = health?.status === 'ok';

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <section className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('aiPowered')}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {t('heroTitle')}
          </h2>

          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
            {t('heroDescription')}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTool('explain')}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs sm:text-sm hover:bg-indigo-50 shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span>{t('startExplain')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('plan')}
              className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur border border-white/20 transition cursor-pointer"
            >
              <span>{t('buildPlan')}</span>
            </button>
          </div>
        </div>

        {/* Background decorative glows */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      </section>

      {/* Four Core Tools Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('studyTools')}
          </h3>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            {t('interactiveFeatures')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tool 1: Explain */}
          <div
            onClick={() => setActiveTool('explain')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center justify-between">
                <span>💡 {t('explain')}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t('toolExplainDescription')}
              </p>
            </div>
          </div>

          {/* Tool 2: Summary */}
          <div
            onClick={() => setActiveTool('summary')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center justify-between">
                <span>📝 {t('summary')}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t('toolSummaryDescription')}
              </p>
            </div>
          </div>

          {/* Tool 3: Quiz */}
          <div
            onClick={() => setActiveTool('quiz')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center justify-between">
                <span>🎯 {t('quiz')}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t('toolQuizDescription')}
              </p>
            </div>
          </div>

          {/* Tool 4: Plan */}
          <div
            onClick={() => setActiveTool('plan')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition cursor-pointer group space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center justify-between">
                <span>📅 {t('plan')}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition" />
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t('toolPlanDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Backend Engine Card */}
      <section className="p-5 sm:p-6 rounded-2xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t('aiEngineStatus')}</span>
          </span>
          {onRefreshHealth && (
            <button
              onClick={onRefreshHealth}
              className="text-indigo-600 dark:text-indigo-400 hover:underline capitalize font-semibold"
            >
              {loadingHealth ? t('checking') : t('refresh')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
            <span className="text-gray-400 block text-[11px]">{t('backendApi')}</span>
            <span className={`font-bold ${isReady ? 'text-emerald-600' : 'text-red-500'}`}>
              {isReady ? t('online') : t('engineOffline')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
            <span className="text-gray-400 block text-[11px]">{t('modelTarget')}</span>
            <span className="font-bold truncate block" title={health?.model || 'Gemma 4'}>
              {health?.model || 'gemma-4-26b-a4b-it'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
            <span className="text-gray-400 block text-[11px]">{t('aiConfigured')}</span>
            <span
              className={`font-bold ${
                health?.ai_configured ? 'text-emerald-600' : 'text-amber-500'
              }`}
            >
              {health?.ai_configured ? t('yesKeySet') : t('noPendingKey')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#181B24] border border-gray-200 dark:border-gray-800">
            <span className="text-gray-400 block text-[11px]">{t('specVersion')}</span>
            <span className="font-bold">{health?.version || '1.0.0'}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
