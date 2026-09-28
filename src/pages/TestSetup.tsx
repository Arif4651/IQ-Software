import { useState } from 'react';
import { Play, Clock, Shuffle, ChevronLeft, Settings2, Zap, BookOpen, AlertTriangle } from 'lucide-react';
import { getQuestions } from '../services/storage';
import { CATEGORY_LABELS, ALL_CATEGORIES, ALL_DIFFICULTIES } from '../types/question';
import type { QuestionCategory, Difficulty } from '../types/question';
import type { TestConfig, TestMode, TimerType } from '../types/test';
import { getSettings } from '../services/storage';

interface TestSetupProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onStartTest: (config: TestConfig) => void;
}

const QUESTION_COUNTS = [5, 10, 20, 30, 40, 50];
const TOTAL_TIMES = [
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '20 min', value: 1200 },
  { label: '30 min', value: 1800 },
  { label: '45 min', value: 2700 },
  { label: '60 min', value: 3600 },
];
const PER_Q_TIMES = [
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
];

export default function TestSetup({ onNavigate, onStartTest }: TestSetupProps) {
  const questions = getQuestions();
  const settings = getSettings();

  const [name, setName] = useState('IQ Practice');
  const [mode, setMode] = useState<TestMode>(settings.defaultMode);
  const [questionCount, setQuestionCount] = useState<number | 'all' | 'custom'>(settings.defaultQuestionCount);
  const [customCount, setCustomCount] = useState(10);
  const [timerType, setTimerType] = useState<TimerType>('total');
  const [totalTime, setTotalTime] = useState<number | 'custom'>(settings.defaultTimeSeconds);
  const [customTotalTime, setCustomTotalTime] = useState(20);
  const [perQTime, setPerQTime] = useState<number | 'custom'>(30);
  const [customPerQTime, setCustomPerQTime] = useState(30);
  const [selectedCategories, setSelectedCategories] = useState<QuestionCategory[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [allowPrevious, setAllowPrevious] = useState(true);
  const [markForReview, setMarkForReview] = useState(true);

  // Mistake/weak/unused modes
  const [specialMode, setSpecialMode] = useState<'' | 'mistakes' | 'weak' | 'unused'>('');

  const getAvailableCount = (): number => {
    let qs = questions;
    if (selectedCategories.length > 0) {
      qs = qs.filter(q => selectedCategories.includes(q.category));
    }
    if (selectedDifficulties.length > 0) {
      qs = qs.filter(q => selectedDifficulties.includes(q.difficulty));
    }
    if (specialMode === 'unused') {
      qs = qs.filter(q => !q.statistics || q.statistics.attempts === 0);
    }
    if (specialMode === 'weak') {
      qs = qs.filter(q => q.statistics && q.statistics.attempts >= 2 && q.statistics.correct / q.statistics.attempts < 0.5);
    }
    return qs.length;
  };

  const available = getAvailableCount();

  const getActualCount = (): number => {
    if (questionCount === 'all') return available;
    if (questionCount === 'custom') return Math.min(customCount, available);
    return Math.min(questionCount as number, available);
  };

  const getActualTotalTime = (): number | undefined => {
    if (timerType !== 'total') return undefined;
    if (totalTime === 'custom') return customTotalTime * 60;
    return totalTime as number;
  };

  const getActualPerQTime = (): number | undefined => {
    if (timerType !== 'perQuestion') return undefined;
    if (perQTime === 'custom') return customPerQTime;
    return perQTime as number;
  };

  const toggleCategory = (cat: QuestionCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleDifficulty = (diff: Difficulty) => {
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
    );
  };

  const handleStart = () => {
    if (available === 0) return;

    const config: TestConfig = {
      name: name.trim() || 'IQ Practice',
      mode,
      questionCount: questionCount === 'all' ? 'all' : getActualCount(),
      timerType,
      totalTimeSeconds: getActualTotalTime(),
      perQuestionTimeSeconds: getActualPerQTime(),
      categories: selectedCategories.length > 0 ? selectedCategories : [],
      difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : [],
      shuffleQuestions,
      shuffleOptions,
      allowPrevious,
      markForReview,
    };

    onStartTest(config);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Setup</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Configure your test session</p>
      </div>

      {/* Test Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Test Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ISSB IQ Practice 01"
          className="input w-full"
        />
      </div>

      {/* Special Modes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Special Mode</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'Standard' },
            { value: 'mistakes', label: '🔄 Mistake Review' },
            { value: 'weak', label: '⚠️ Weak Questions' },
            { value: 'unused', label: '✨ Unused Questions' },
          ].map(m => (
            <button
              key={m.value}
              onClick={() => setSpecialMode(m.value as typeof specialMode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                ${specialMode === m.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Test Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('exam')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors
              ${mode === 'exam'
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <Zap size={16} className="inline mr-1.5" />
            Exam Mode
            <p className="text-xs mt-0.5 font-normal opacity-70">Results shown after submission</p>
          </button>
          <button
            onClick={() => setMode('practice')}
            className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors
              ${mode === 'practice'
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
          >
            <BookOpen size={16} className="inline mr-1.5" />
            Practice Mode
            <p className="text-xs mt-0.5 font-normal opacity-70">See feedback after each answer</p>
          </button>
        </div>
      </div>

      {/* Question Count */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Number of Questions <span className="text-xs text-[var(--text-secondary)]">({available} available)</span></label>
        <div className="flex flex-wrap gap-2">
          {QUESTION_COUNTS.map(n => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                ${questionCount === n ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setQuestionCount('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${questionCount === 'all' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
          >
            All
          </button>
          <button
            onClick={() => setQuestionCount('custom')}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${questionCount === 'custom' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
          >
            Custom
          </button>
          {questionCount === 'custom' && (
            <input
              type="number"
              value={customCount}
              onChange={e => setCustomCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-20 text-center"
              min={1}
            />
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Timer</label>
        <div className="flex gap-2">
          {(['total', 'perQuestion', 'none'] as TimerType[]).map(t => (
            <button
              key={t}
              onClick={() => setTimerType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                ${timerType === t ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
            >
              {t === 'total' ? 'Total Time' : t === 'perQuestion' ? 'Per Question' : 'No Timer'}
            </button>
          ))}
        </div>

        {timerType === 'total' && (
          <div className="flex flex-wrap gap-2">
            {TOTAL_TIMES.map(t => (
              <button
                key={t.value}
                onClick={() => setTotalTime(t.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors
                  ${totalTime === t.value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setTotalTime('custom')}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors
                ${totalTime === 'custom' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
            >
              Custom
            </button>
            {totalTime === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customTotalTime}
                  onChange={e => setCustomTotalTime(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-16 text-center"
                  min={1}
                />
                <span className="text-sm text-[var(--text-secondary)]">min</span>
              </div>
            )}
          </div>
        )}

        {timerType === 'perQuestion' && (
          <div className="flex flex-wrap gap-2">
            {PER_Q_TIMES.map(t => (
              <button
                key={t.value}
                onClick={() => setPerQTime(t.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors
                  ${perQTime === t.value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setPerQTime('custom')}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors
                ${perQTime === 'custom' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
            >
              Custom
            </button>
            {perQTime === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customPerQTime}
                  onChange={e => setCustomPerQTime(Math.max(5, parseInt(e.target.value) || 5))}
                  className="input w-16 text-center"
                  min={5}
                />
                <span className="text-sm text-[var(--text-secondary)]">sec</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Categories <span className="text-xs text-[var(--text-secondary)]">(none = all)</span></label>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(cat => {
            const count = questions.filter(q => q.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${selectedCategories.includes(cat)
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Difficulty <span className="text-xs text-[var(--text-secondary)]">(none = all)</span></label>
        <div className="flex gap-2">
          {ALL_DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => toggleDifficulty(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors
                ${selectedDifficulties.includes(d)
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Options</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="accent-[var(--accent)]" />
            Shuffle questions
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} className="accent-[var(--accent)]" />
            Shuffle options
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={allowPrevious} onChange={e => setAllowPrevious(e.target.checked)} className="accent-[var(--accent)]" />
            Allow going to previous question
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={markForReview} onChange={e => setMarkForReview(e.target.checked)} className="accent-[var(--accent)]" />
            Enable mark for review
          </label>
        </div>
      </div>

      {/* Summary & Start */}
      <div className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] space-y-2">
        <p className="text-sm font-medium">Test Summary</p>
        <p className="text-sm text-[var(--text-secondary)]">
          {getActualCount()} questions · {mode} mode ·{' '}
          {timerType === 'total' && `${Math.round((getActualTotalTime() || 0) / 60)} min total`}
          {timerType === 'perQuestion' && `${getActualPerQTime()}s per question`}
          {timerType === 'none' && 'No timer'}
        </p>
        {available === 0 && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} /> No questions match your filters.
          </p>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={available === 0}
        className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play size={18} /> Start Test
      </button>
    </div>
  );
}
