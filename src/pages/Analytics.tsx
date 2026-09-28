import { useState, useMemo } from 'react';
import {
  TrendingUp, Target, Clock, BarChart3, AlertTriangle,
  Play, ChevronDown,
} from 'lucide-react';
import { getQuestions, getTestHistory } from '../services/storage';
import { CATEGORY_LABELS, ALL_CATEGORIES } from '../types/question';
import type { TestResult } from '../types/test';
import { formatTimeVerbose, formatDate } from '../utils/time';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

interface AnalyticsProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const questions = getQuestions();
  const history = getTestHistory();
  const [tab, setTab] = useState<'overview' | 'trends' | 'weak' | 'time'>('overview');

  // Score trend data
  const scoreTrend = useMemo(() => {
    return [...history].reverse().map((t, i) => ({
      name: `Test ${i + 1}`,
      score: Math.round(t.accuracy),
      avgTime: t.averageTime,
      date: formatDate(t.date),
    }));
  }, [history]);

  // Category stats
  const categoryStats = useMemo(() => {
    return ALL_CATEGORIES.map(cat => {
      const catQs = questions.filter(q => q.category === cat);
      const attempts = catQs.reduce((s, q) => s + (q.statistics?.attempts || 0), 0);
      const correct = catQs.reduce((s, q) => s + (q.statistics?.correct || 0), 0);
      const totalTime = catQs.reduce((s, q) => s + (q.statistics?.totalTime || 0), 0);
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        total: catQs.length,
        attempts,
        correct,
        accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
        avgTime: attempts > 0 ? Math.round(totalTime / attempts) : 0,
      };
    }).filter(c => c.total > 0);
  }, [questions]);

  // Weak questions
  const weakQuestions = useMemo(() => {
    return questions
      .filter(q => q.statistics && q.statistics.attempts >= 2 && q.statistics.correct / q.statistics.attempts < 0.5)
      .sort((a, b) => {
        const accA = a.statistics!.correct / a.statistics!.attempts;
        const accB = b.statistics!.correct / b.statistics!.attempts;
        return accA - accB;
      });
  }, [questions]);

  // Time analysis
  const timeAnalysis = useMemo(() => {
    const allTimes: number[] = [];
    history.forEach(t => {
      t.questionResults.forEach(qr => {
        if (qr.timeSpent > 0) allTimes.push(qr.timeSpent);
      });
    });
    allTimes.sort((a, b) => a - b);
    const median = allTimes.length > 0 ? allTimes[Math.floor(allTimes.length / 2)] : 0;
    const avg = allTimes.length > 0 ? Math.round(allTimes.reduce((s, t) => s + t, 0) / allTimes.length) : 0;
    const over30 = allTimes.filter(t => t > 30).length;
    const over60 = allTimes.filter(t => t > 60).length;
    return {
      avg,
      median: Math.round(median),
      fastest: allTimes.length > 0 ? Math.round(Math.min(...allTimes)) : 0,
      slowest: allTimes.length > 0 ? Math.round(Math.max(...allTimes)) : 0,
      over30,
      over60,
      total: allTimes.length,
    };
  }, [history]);

  const chartColors = {
    stroke: 'var(--accent)',
    grid: 'var(--border)',
    text: 'var(--text-secondary)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Track your progress and identify areas for improvement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-surface)] rounded-lg p-1 border border-[var(--border)]">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'trends', label: 'Trends' },
          { id: 'weak', label: 'Weak Areas' },
          { id: 'time', label: 'Time Analysis' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg-hover)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No analytics data yet</p>
          <p className="text-sm mt-1">Take some tests to see your performance analytics.</p>
          <button onClick={() => onNavigate('testSetup')} className="btn-primary mt-4 text-sm">
            Start a Test
          </button>
        </div>
      ) : (
        <>
          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Tests Taken</p>
                  <p className="text-xl font-bold">{history.length}</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Avg Score</p>
                  <p className="text-xl font-bold">{Math.round(history.reduce((s, t) => s + t.accuracy, 0) / history.length)}%</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Best Score</p>
                  <p className="text-xl font-bold">{Math.round(Math.max(...history.map(t => t.accuracy)))}%</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Latest Score</p>
                  <p className="text-xl font-bold">{Math.round(history[0]?.accuracy || 0)}%</p>
                </div>
              </div>

              {/* Category performance */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="font-semibold mb-4">Category Performance</h2>
                {categoryStats.length > 0 ? (
                  <div className="space-y-3">
                    {categoryStats.map(c => (
                      <div key={c.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{c.label}</span>
                          <span className={`text-sm font-bold ${
                            c.accuracy >= 70 ? 'text-green-400' : c.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{c.accuracy}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              c.accuracy >= 70 ? 'bg-green-500' : c.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${c.accuracy}%` }}
                          />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {c.attempts} attempts · Avg {c.avgTime}s
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No category data yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Trends */}
          {tab === 'trends' && (
            <div className="space-y-6">
              {/* Score Trend */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="font-semibold mb-4">Score Trend</h2>
                {scoreTrend.length > 1 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Take more tests to see trends.</p>
                )}
              </div>

              {/* Time Trend */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="font-semibold mb-4">Average Time Trend</h2>
                {scoreTrend.length > 1 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Line type="monotone" dataKey="avgTime" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} name="Avg Time (s)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">Take more tests to see trends.</p>
                )}
              </div>

              {/* Test History Table */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="font-semibold mb-4">All Tests</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)]">
                        <th className="pb-2 pr-3 font-medium">#</th>
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 pr-3 font-medium">Name</th>
                        <th className="pb-2 pr-3 font-medium text-right">Score</th>
                        <th className="pb-2 pr-3 font-medium text-right">Accuracy</th>
                        <th className="pb-2 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((t, i) => (
                        <tr
                          key={t.id}
                          className="border-b border-[var(--border)] last:border-b-0 cursor-pointer hover:bg-[var(--bg-hover)]"
                          onClick={() => onNavigate('testResult', { resultId: t.id })}
                        >
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">{history.length - i}</td>
                          <td className="py-2 pr-3 text-[var(--text-secondary)]">{formatDate(t.date)}</td>
                          <td className="py-2 pr-3">{t.testName}</td>
                          <td className="py-2 pr-3 text-right font-medium">{t.correct}/{t.totalQuestions}</td>
                          <td className="py-2 pr-3 text-right">
                            <span className={`font-semibold ${
                              t.accuracy >= 70 ? 'text-green-400' : t.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{Math.round(t.accuracy)}%</span>
                          </td>
                          <td className="py-2 text-right text-[var(--text-secondary)]">{formatTimeVerbose(t.totalTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Weak Areas */}
          {tab === 'weak' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Frequently Incorrect Questions</h2>
                  {weakQuestions.length > 0 && (
                    <button
                      onClick={() => onNavigate('testSetup', { specialMode: 'weak' })}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      <Play size={13} /> Practice Weak Questions
                    </button>
                  )}
                </div>
                {weakQuestions.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No frequently incorrect questions found. Great job! Questions need at least 2 attempts with &lt;50% accuracy to appear here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {weakQuestions.slice(0, 20).map(q => {
                      const acc = q.statistics ? Math.round((q.statistics.correct / q.statistics.attempts) * 100) : 0;
                      return (
                        <div key={q.id} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="text-sm truncate">{q.question}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {q.statistics?.attempts} attempts · {q.statistics?.correct} correct ·{' '}
                              {CATEGORY_LABELS[q.category]}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-red-400 flex-shrink-0">{acc}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unused questions */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Unused Questions</h2>
                  {questions.filter(q => !q.statistics || q.statistics.attempts === 0).length > 0 && (
                    <button
                      onClick={() => onNavigate('testSetup', { specialMode: 'unused' })}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      <Play size={13} /> Practice Unused
                    </button>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {questions.filter(q => !q.statistics || q.statistics.attempts === 0).length} questions have never been attempted.
                </p>
              </div>
            </div>
          )}

          {/* Time Analysis */}
          {tab === 'time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Average Time</p>
                  <p className="text-xl font-bold">{timeAnalysis.avg}s</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Median Time</p>
                  <p className="text-xl font-bold">{timeAnalysis.median}s</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Fastest</p>
                  <p className="text-xl font-bold">{timeAnalysis.fastest}s</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Slowest</p>
                  <p className="text-xl font-bold">{timeAnalysis.slowest}s</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">&gt; 30 seconds</p>
                  <p className="text-xl font-bold text-yellow-400">{timeAnalysis.over30}</p>
                </div>
                <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">&gt; 60 seconds</p>
                  <p className="text-xl font-bold text-red-400">{timeAnalysis.over60}</p>
                </div>
              </div>

              {/* Category time breakdown */}
              <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
                <h2 className="font-semibold mb-4">Average Time by Category</h2>
                {categoryStats.filter(c => c.attempts > 0).length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats.filter(c => c.attempts > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="avgTime" name="Avg Time (s)" radius={[4, 4, 0, 0]}>
                          {categoryStats.filter(c => c.attempts > 0).map((_, i) => (
                            <Cell key={i} fill={`hsl(${220 + i * 30}, 70%, 60%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No time data available.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
