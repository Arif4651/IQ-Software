import { useState } from 'react';
import {
  CheckCircle, XCircle, MinusCircle, Clock, Target, TrendingUp,
  ChevronDown, ChevronUp, ArrowLeft, Zap,
} from 'lucide-react';
import { getTestHistory } from '../services/storage';
import { CATEGORY_LABELS } from '../types/question';
import type { TestResult as TestResultType, QuestionResult } from '../types/test';
import { formatTimeVerbose, formatDateTime } from '../utils/time';

interface TestResultProps {
  resultId: string;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function TestResultPage({ resultId, onNavigate }: TestResultProps) {
  const history = getTestHistory();
  const result = history.find(t => t.id === resultId);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!result) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-secondary)]">Result not found.</p>
        <button onClick={() => onNavigate('dashboard')} className="btn-primary mt-4 text-sm">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const displayedResults = showAll ? result.questionResults : result.questionResults.slice(0, 20);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Test Results</h1>
          <p className="text-sm text-[var(--text-secondary)]">{result.testName} · {formatDateTime(result.date)}</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-5xl font-bold mb-1">
          {result.correct} <span className="text-2xl text-[var(--text-secondary)]">/ {result.totalQuestions}</span>
        </p>
        <p className={`text-3xl font-bold mb-4 ${
          result.accuracy >= 70 ? 'text-green-400' :
          result.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {Math.round(result.accuracy)}%
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={16} className="text-green-400" />
            <span>Correct: {result.correct}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle size={16} className="text-red-400" />
            <span>Wrong: {result.wrong}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MinusCircle size={16} className="text-[var(--text-secondary)]" />
            <span>Skipped: {result.unanswered}</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3">
          Attempted Accuracy: {Math.round(result.attemptedAccuracy)}%
        </p>
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Total Time</p>
          <p className="text-lg font-bold">{formatTimeVerbose(result.totalTime)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Avg Time/Q</p>
          <p className="text-lg font-bold">{result.averageTime}s</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Fastest</p>
          <p className="text-lg font-bold">{result.fastestQuestion}s</p>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Slowest</p>
          <p className="text-lg font-bold">{result.slowestQuestion}s</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(result.categoryBreakdown).length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-4">Performance by Category</h2>
          <div className="space-y-3">
            {Object.entries(result.categoryBreakdown).map(([cat, data]) => {
              const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{data.correct}/{data.total} correct · Avg {data.avgTime}s</p>
                  </div>
                  <span className={`text-lg font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {accuracy}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Difficulty Breakdown */}
      {Object.keys(result.difficultyBreakdown).length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold mb-4">Performance by Difficulty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['easy', 'medium', 'hard'].map(diff => {
              const data = result.difficultyBreakdown[diff];
              if (!data) return null;
              const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={diff} className="p-3 bg-[var(--bg-primary)] rounded-lg text-center">
                  <p className="text-sm font-medium capitalize mb-1">{diff}</p>
                  <p className={`text-2xl font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {accuracy}%
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{data.correct}/{data.total} · Avg {data.avgTime}s</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question-by-Question Review */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold mb-4">Question Review</h2>
        <div className="space-y-2">
          {displayedResults.map((qr, idx) => (
            <QuestionReviewCard
              key={qr.questionId}
              qr={qr}
              index={idx}
              expanded={expandedQ === qr.questionId}
              onToggle={() => setExpandedQ(expandedQ === qr.questionId ? null : qr.questionId)}
            />
          ))}
        </div>
        {!showAll && result.questionResults.length > 20 && (
          <button
            onClick={() => setShowAll(true)}
            className="btn-secondary w-full mt-3 text-sm"
          >
            Show All {result.questionResults.length} Questions
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionReviewCard({ qr, index, expanded, onToggle }: {
  qr: QuestionResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const selectedOption = qr.options.find(o => o.id === qr.selectedOptionId);
  const correctOption = qr.options.find(o => o.id === qr.correctOptionId);

  return (
    <div className={`rounded-lg border transition-colors ${
      qr.selectedOptionId === null
        ? 'border-[var(--border)]'
        : qr.isCorrect
          ? 'border-green-500/30'
          : 'border-red-500/30'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
            qr.selectedOptionId === null
              ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
              : qr.isCorrect
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
          }`}>
            {qr.selectedOptionId === null ? '–' : qr.isCorrect ? '✓' : '✗'}
          </span>
          <span className="text-sm truncate">Q{index + 1}: {qr.questionText}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-[var(--text-secondary)]">{Math.round(qr.timeSpent)}s</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)] pt-3">
          <p className="text-sm whitespace-pre-wrap">{qr.questionText}</p>

          {qr.questionImage && (
            <img src={qr.questionImage} alt="Question" className="max-w-full max-h-48 object-contain rounded-lg" />
          )}

          <div className="space-y-1.5">
            {qr.options.map(o => {
              const isSelected = o.id === qr.selectedOptionId;
              const isCorrect = o.id === qr.correctOptionId;
              let cls = 'border-[var(--border)]';
              if (isCorrect) cls = 'border-green-500/50 bg-green-500/10';
              if (isSelected && !isCorrect) cls = 'border-red-500/50 bg-red-500/10';

              return (
                <div key={o.id} className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${cls}`}>
                  <span className="font-medium">{o.id.toUpperCase()}.</span>
                  <span>{o.text}</span>
                  {isCorrect && <CheckCircle size={14} className="ml-auto text-green-400 flex-shrink-0" />}
                  {isSelected && !isCorrect && <XCircle size={14} className="ml-auto text-red-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
            <span>Your answer: {selectedOption ? `${selectedOption.id.toUpperCase()}. ${selectedOption.text}` : 'Skipped'}</span>
            <span>Correct: {correctOption?.id.toUpperCase()}. {correctOption?.text}</span>
            <span>Time: {Math.round(qr.timeSpent)}s</span>
          </div>

          {qr.explanation && (
            <div className="p-3 bg-[var(--bg-primary)] rounded-lg text-sm">
              <p className="font-medium text-xs text-[var(--text-secondary)] mb-1">Explanation</p>
              {qr.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
