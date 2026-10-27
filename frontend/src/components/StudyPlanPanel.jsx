import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { generateStudyPlan } from '../services/api';
import StatusMessage from './StatusMessage';
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  PenTool,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

const ACTIVITY_ICONS = {
  learn: BookOpen,
  practice: PenTool,
  revise: RotateCcw,
  test: CheckCircle2,
};

const ACTIVITY_COLORS = {
  learn: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  practice: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  revise: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  test: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
};

export function StudyPlanResult({ plan }) {
  const [copied, setCopied] = useState(false);
  const [completedSessions, setCompletedSessions] = useState({});
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [plan]);

  const toggleSession = (sessionId) => {
    setCompletedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const allSessions = [];
  plan.days?.forEach((day) => {
    day.sessions?.forEach((s) => allSessions.push(s));
  });

  const totalSessionsCount = allSessions.length;
  const completedCount = Object.values(completedSessions).filter(Boolean).length;
  const progressPercent = totalSessionsCount
    ? Math.round((completedCount / totalSessionsCount) * 100)
    : 0;

  const handleCopy = async () => {
    try {
      let text = `Study Plan (${plan.horizon_days} Days)\n${plan.summary}\n\n`;
      plan.days?.forEach((d) => {
        text += `Day ${d.day} (${d.date}):\n`;
        if (!d.sessions || d.sessions.length === 0) {
          text += `  - Rest Day 🌿\n`;
        } else {
          d.sessions.forEach((s) => {
            text += `  - [${s.activity.toUpperCase()}] ${s.subject}: ${s.topic} (${s.minutes} mins)\n`;
          });
        }
        text += '\n';
      });
      if (plan.tips && plan.tips.length > 0) {
        text += `Study Tips:\n${plan.tips.map((t) => `- ${t}`).join('\n')}`;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  return (
    <article
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-6"
      aria-labelledby="plan-result-title"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            Personalized Roadmap
          </span>
          <h2
            id="plan-result-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 outline-none"
          >
            {plan.horizon_days}-Day Study Plan
          </h2>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition"
          aria-label="Copy plan to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy as text</span>
            </>
          )}
        </button>
      </div>

      {/* Summary card */}
      <div className="p-4 rounded-xl bg-[#F1F0EA] dark:bg-[#20242F] border border-[#E5E3DA] dark:border-[#2C3140] text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {plan.summary}
      </div>

      {/* Truncated notice if horizon exceeded 14 days */}
      {plan.truncated && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
          Showing the first 14 days of your timeline. Generate again later for upcoming deadlines.
        </div>
      )}

      {/* Progress Bar */}
      {totalSessionsCount > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Session Progress
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {completedCount} of {totalSessionsCount} done ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline Days */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Daily Schedule
        </h3>

        <div className="space-y-4">
          {plan.days?.map((day) => {
            const hasSessions = day.sessions && day.sessions.length > 0;
            const totalMinutes = hasSessions
              ? day.sessions.reduce((acc, s) => acc + s.minutes, 0)
              : 0;

            return (
              <div
                key={day.day}
                className="rounded-xl border border-[#E5E3DA] dark:border-[#2C3140] bg-white dark:bg-[#181B24] overflow-hidden"
              >
                {/* Day Header */}
                <div className="px-4 py-2.5 bg-[#FAFAF7] dark:bg-[#141720] border-b border-[#E5E3DA] dark:border-[#2C3140] flex items-center justify-between text-xs">
                  <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      {day.day}
                    </span>
                    <span>Day {day.day}</span>
                    <span className="text-gray-400 font-normal">· {day.date}</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {hasSessions ? `${totalMinutes} mins total` : 'Rest Day'}
                  </span>
                </div>

                {/* Sessions list */}
                <div className="p-3 space-y-2">
                  {!hasSessions ? (
                    <div className="py-2 text-center text-xs text-gray-400 italic flex items-center justify-center gap-1.5">
                      <span>Rest day 🌿 Take time to recharge and consolidate memory.</span>
                    </div>
                  ) : (
                    day.sessions.map((sess) => {
                      const isDone = Boolean(completedSessions[sess.id]);
                      const Icon = ACTIVITY_ICONS[sess.activity] || BookOpen;
                      const badgeColor =
                        ACTIVITY_COLORS[sess.activity] || ACTIVITY_COLORS.learn;

                      return (
                        <div
                          key={sess.id}
                          onClick={() => toggleSession(sess.id)}
                          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                            isDone
                              ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60'
                              : 'bg-white dark:bg-[#181B24] border-gray-200 dark:border-gray-700/80 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                  {sess.subject}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeColor}`}
                                >
                                  {sess.activity}
                                </span>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                                {sess.topic}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 font-medium text-gray-500 dark:text-gray-400">
                            {sess.minutes} min
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      {plan.tips && plan.tips.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
            Study Strategies & Tips
          </h3>
          <ul className="space-y-1.5 text-xs text-indigo-950 dark:text-indigo-200">
            {plan.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default function StudyPlanPanel() {
  const { language } = useSettings();
  const [subjects, setSubjects] = useState([
    { name: 'Physics', deadline: '', topics: 'Mechanics, Electricity' },
    { name: 'Mathematics', deadline: '', topics: 'Calculus, Vectors' },
  ]);
  const [dailyHours, setDailyHours] = useState(3.0);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('idle');
  const [plan, setPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddSubject = () => {
    if (subjects.length >= 6) return;
    setSubjects((prev) => [...prev, { name: '', deadline: '', topics: '' }]);
  };

  const handleRemoveSubject = (idx) => {
    if (subjects.length <= 1) return;
    setSubjects((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubjectChange = (idx, field, value) => {
    setSubjects((prev) =>
      prev.map((sub, i) => (i === idx ? { ...sub, [field]: value } : sub))
    );
  };

  const isValid =
    subjects.length >= 1 &&
    subjects.every((s) => s.name.trim().length >= 1) &&
    dailyHours >= 0.5 &&
    dailyHours <= 12.0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isValid) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const cleanSubjects = subjects.map((s) => ({
        name: s.name.trim(),
        deadline: s.deadline || undefined,
        topics: s.topics.trim() || undefined,
      }));

      const response = await generateStudyPlan({
        subjects: cleanSubjects,
        daily_hours: Number(dailyHours),
        start_date: startDate || undefined,
        language,
      });

      setPlan(response.data);
      setStatus('success');
    } catch (err) {
      setErrorMessage(err.message || 'Could not create study plan. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span>📅</span>
          <span>Generate Study Plan</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create an achievable, day-by-day timetable balanced around your deadlines and available study hours.
        </p>
      </div>

      {/* Form Input Card */}
      <form
        onSubmit={handleSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#181B24] border border-[#E5E3DA] dark:border-[#2C3140] shadow-sm space-y-5"
      >
        {/* Subjects list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Subjects (1 to 6)
            </span>
            <span className="text-xs text-gray-400">{subjects.length} / 6</span>
          </div>

          <div className="space-y-3">
            {subjects.map((sub, idx) => (
              <div
                key={idx}
                className="p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-[#FAFAF7] dark:bg-[#141720] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Subject #{idx + 1}
                  </span>
                  {subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(idx)}
                      className="text-gray-400 hover:text-red-500 transition p-1"
                      title="Remove subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Physics, Chemistry, World History"
                      value={sub.name}
                      maxLength={80}
                      onChange={(e) => handleSubjectChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                      Target Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={sub.deadline}
                      onChange={(e) => handleSubjectChange(idx, 'deadline', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Specific Topics or Chapters (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thermodynamics, Waves, Optics"
                    value={sub.topics}
                    maxLength={300}
                    onChange={(e) => handleSubjectChange(idx, 'topics', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#181B24] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            ))}
          </div>

          {subjects.length < 6 && (
            <button
              type="button"
              onClick={handleAddSubject}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another subject</span>
            </button>
          )}
        </div>

        {/* Global Controls: Hours per day & Start Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
              Daily Study Hours
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.5"
                max="12.0"
                step="0.5"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value) || 0.5)}
                className="w-32 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
              <span className="text-xs text-gray-500">hours / day (0.5 to 12)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !isValid}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{status === 'loading' ? 'Creating plan…' : 'Create my plan'}</span>
        </button>
      </form>

      {/* Results / Status Area */}
      <div className="pt-2">
        {status === 'loading' && <StatusMessage type="loading" message="Sequencing optimal study days…" />}
        {status === 'error' && (
          <StatusMessage type="error" message={errorMessage} onRetry={handleSubmit} />
        )}
        {status === 'success' && plan && <StudyPlanResult plan={plan} />}
        {status === 'idle' && !plan && (
          <StatusMessage
            type="empty"
            message="Configure your subjects and daily hours above to generate your study timetable."
          />
        )}
      </div>
    </div>
  );
}
