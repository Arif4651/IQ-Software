import {
  BookOpen, ClipboardCheck, Target, Trophy, Clock, TrendingUp,
  Play, PlusCircle, BarChart3, HelpCircle,
} from 'lucide-react';
import { getQuestions, getTestHistory } from '../services/storage';
import { CATEGORY_LABELS, ALL_CATEGORIES } from '../types/question';
import type { TestResult } from '../types/test';
import { formatDate, formatTimeVerbose } from '../utils/time';

interface DashboardProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const questions = getQuestions();
  const history = getTestHistory();

  const totalQuestions = questions.length;
  const totalTests = history.length;

  const avgScore = totalTests > 0
    ? Math.round(history.reduce((s, t) => s + t.accuracy, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.round(Math.max(...history.map(t => t.accuracy)))
    : 0;

  const totalAnswered = questions.reduce((s, q) => s + (q.statistics?.attempts || 0), 0);
  const totalCorrect = questions.reduce((s, q) => s + (q.statistics?.correct || 0), 0);
  const overallAccuracy = totalAnswered > 0
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : 0;
  const questionsAttempted = questions.filter(q => q.statistics && q.statistics.attempts > 0).length;
  const questionsRemaining = totalQuestions - questionsAttempted;

  const totalTimeSpent = questions.reduce((s, q) => s + (q.statistics?.totalTime || 0), 0);
  const avgTimePerQuestion = totalAnswered > 0
    ? Math.round(totalTimeSpent / totalAnswered)
    : 0;

  // Category performance
  const catPerf = ALL_CATEGORIES.map(cat => {
    const catQs = questions.filter(q => q.category === cat);
    const attempts = catQs.reduce((s, q) => s + (q.statistics?.attempts || 0), 0);
    const correct = catQs.reduce((s, q) => s + (q.statistics?.correct || 0), 0);
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      total: catQs.length,
      attempts,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
    };
  }).filter(c => c.total > 0);

  const recentTests = history.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Your performance overview</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Total Questions" value={totalQuestions} color="var(--accent)" />
        <StatCard icon={ClipboardCheck} label="Tests Taken" value={totalTests} color="#a78bfa" />
        <StatCard icon={Target} label="Avg Score" value={`${avgScore}%`} color="#34d399" />
        <StatCard icon={Trophy} label="Best Score" value={`${bestScore}%`} color="#fbbf24" />
        <StatCard icon={TrendingUp} label="Overall Accuracy" value={`${overallAccuracy}%`} color="#f472b6" />
        <StatCard icon={HelpCircle} label="Attempted" value={questionsAttempted} color="#60a5fa" />
        <StatCard icon={BookOpen} label="Remaining" value={questionsRemaining} color="#fb923c" />
        <StatCard icon={Clock} label="Avg Time/Q" value={`${avgTimePerQuestion}s`} color="#a3e635" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('testSetup')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Play size={16} /> Start New Test
        </button>
        <button
          onClick={() => onNavigate('addQuestion')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium text-sm hover:bg-[var(--bg-hover)] transition-colors"
        >
          <PlusCircle size={16} /> Add Question
        </button>
        <button
          onClick={() => onNavigate('questionBank')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium text-sm hover:bg-[var(--bg-hover)] transition-colors"
        >
          <BookOpen size={16} /> Question Bank
        </button>
        <button
          onClick={() => onNavigate('analytics')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] font-medium text-sm hover:bg-[var(--bg-hover)] transition-colors"
        >
          <BarChart3 size={16} /> View Analytics
        </button>
      </div>

      {/* Category Performance */}
      {catPerf.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-4">Category Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catPerf.map(c => (
              <div key={c.category} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-primary)]">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.total} questions · {c.attempts} attempts</p>
                </div>
                <div className="text-right">
                  {c.accuracy !== null ? (
                    <span className={`text-lg font-bold ${c.accuracy >= 70 ? 'text-green-400' : c.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {c.accuracy}%
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tests */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold mb-4">Recent Tests</h2>
        {recentTests.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No tests taken yet. Start your first test!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Test</th>
                  <th className="pb-2 pr-4 font-medium text-right">Questions</th>
                  <th className="pb-2 pr-4 font-medium text-right">Score</th>
                  <th className="pb-2 pr-4 font-medium text-right">Accuracy</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map(t => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--border)] last:border-b-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => onNavigate('testResult', { resultId: t.id })}
                  >
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{formatDate(t.date)}</td>
                    <td className="py-2.5 pr-4 font-medium">{t.testName}</td>
                    <td className="py-2.5 pr-4 text-right">{t.totalQuestions}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold">{t.correct}/{t.totalQuestions}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`font-semibold ${t.accuracy >= 70 ? 'text-green-400' : t.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Math.round(t.accuracy)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[var(--text-secondary)]">{formatTimeVerbose(t.totalTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
