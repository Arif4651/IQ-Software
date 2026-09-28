import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Flag, RotateCcw, Send, Clock,
  AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, X,
} from 'lucide-react';
import type { TestSession, TestConfig, QuestionResult, TestResult } from '../types/test';
import type { Question } from '../types/question';
import { CATEGORY_LABELS } from '../types/question';
import {
  getQuestions, saveActiveTest, clearActiveTest,
  saveTestResult, updateQuestionStats, getSettings,
} from '../services/storage';
import { shuffleArray } from '../utils/shuffle';
import { formatTime } from '../utils/time';
import { generateId } from '../utils/id';
import Modal from '../components/Modal';

interface ActiveTestProps {
  config: TestConfig;
  onFinish: (resultId: string) => void;
  onExit: () => void;
  resumeSession?: TestSession | null;
}

export default function ActiveTest({ config, onFinish, onExit, resumeSession }: ActiveTestProps) {
  const settings = getSettings();
  const allQuestions = useRef<Question[]>(getQuestions());

  const [session, setSession] = useState<TestSession>(() => {
    if (resumeSession) return resumeSession;
    return createSession(config, allQuestions.current);
  });

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [practiceReveal, setPracticeReveal] = useState<string | null>(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (session.timerEndTime) {
      return Math.max(0, Math.floor((session.timerEndTime - Date.now()) / 1000));
    }
    return session.totalTimeSeconds;
  });

  const [perQTimeRemaining, setPerQTimeRemaining] = useState<number>(() => {
    if (session.perQuestionEndTime) {
      return Math.max(0, Math.floor((session.perQuestionEndTime - Date.now()) / 1000));
    }
    return config.perQuestionTimeSeconds || 0;
  });

  const currentQuestion = allQuestions.current.find(
    q => q.id === session.questionIds[session.currentIndex]
  );

  // Build shuffled options if needed
  const [optionOrders, setOptionOrders] = useState<Record<string, string[]>>(() => {
    if (!config.shuffleOptions) return {};
    const orders: Record<string, string[]> = {};
    session.questionIds.forEach(qId => {
      const q = allQuestions.current.find(qq => qq.id === qId);
      if (q) {
        orders[qId] = shuffleArray(q.options.map(o => o.id));
      }
    });
    return orders;
  });

  const getOptions = () => {
    if (!currentQuestion) return [];
    const order = optionOrders[currentQuestion.id];
    if (order) {
      return order.map(id => currentQuestion.options.find(o => o.id === id)!).filter(Boolean);
    }
    return currentQuestion.options;
  };

  // Save session periodically
  useEffect(() => {
    saveActiveTest(session);
  }, [session]);

  // Ref to always have the latest doSubmit available for the timer
  const doSubmitRef = useRef<() => void>(() => {});

  // Track time per question
  const questionEnteredAt = useRef(session.questionEnteredAt || Date.now());

  const recordTimeOnCurrentQuestion = useCallback(() => {
    const elapsed = (Date.now() - questionEnteredAt.current) / 1000;
    const qId = session.questionIds[session.currentIndex];
    if (qId) {
      setSession(prev => ({
        ...prev,
        questionTimes: {
          ...prev.questionTimes,
          [qId]: (prev.questionTimes[qId] || 0) + elapsed,
        },
      }));
    }
    questionEnteredAt.current = Date.now();
  }, [session.currentIndex, session.questionIds]);

  // Total timer
  useEffect(() => {
    if (config.timerType !== 'total' || !session.timerEndTime || session.submitted) return;
    const interval = setInterval(() => {
      const rem = Math.max(0, Math.floor((session.timerEndTime! - Date.now()) / 1000));
      setTimeRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        doSubmitRef.current();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [session.timerEndTime, session.submitted]);

  // Per-question timer
  useEffect(() => {
    if (config.timerType !== 'perQuestion' || !config.perQuestionTimeSeconds || session.submitted) return;
    const endTime = questionEnteredAt.current + config.perQuestionTimeSeconds * 1000;
    setSession(prev => ({ ...prev, perQuestionEndTime: endTime }));

    const interval = setInterval(() => {
      const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setPerQTimeRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        // Auto-advance
        goToQuestion(session.currentIndex + 1 < session.questionIds.length
          ? session.currentIndex + 1
          : session.currentIndex);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [session.currentIndex, config.timerType, config.perQuestionTimeSeconds, session.submitted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't interfere with inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (session.submitted) return;

      const options = getOptions();
      const keyUpper = e.key.toUpperCase();

      // Support A, B, C, D, E, F
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(keyUpper)) {
        const idx = keyUpper.charCodeAt(0) - 65;
        if (idx < options.length) {
          selectOption(options[idx].id);
          return;
        }
      }

      // Support 1-6
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key) - 1;
        if (idx < options.length) {
          selectOption(options[idx].id);
          return;
        }
      }

      if (e.key === 'ArrowLeft' && config.allowPrevious) {
        e.preventDefault();
        goToQuestion(session.currentIndex - 1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToQuestion(session.currentIndex + 1);
        return;
      }
      if (e.key === 'm' || e.key === 'M' || e.key === 'f' || e.key === 'F') {
        toggleMark();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        clearAnswer();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [session.currentIndex, session.answers, session.submitted]);

  const selectOption = (optionId: string) => {
    const qId = session.questionIds[session.currentIndex];
    setSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [qId]: optionId },
    }));
    setPracticeReveal(null);

    // Practice mode: auto-reveal
    if (config.mode === 'practice' && settings.showExplanationsInPractice) {
      setPracticeReveal(optionId);
    }

    // Auto-next
    if (settings.autoNextAfterAnswer && config.mode === 'exam') {
      setTimeout(() => {
        if (session.currentIndex < session.questionIds.length - 1) {
          goToQuestion(session.currentIndex + 1);
        }
      }, 300);
    }
  };

  const clearAnswer = () => {
    const qId = session.questionIds[session.currentIndex];
    setSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [qId]: null },
    }));
    setPracticeReveal(null);
  };

  const toggleMark = () => {
    if (!config.markForReview) return;
    const qId = session.questionIds[session.currentIndex];
    setSession(prev => ({
      ...prev,
      markedForReview: prev.markedForReview.includes(qId)
        ? prev.markedForReview.filter(id => id !== qId)
        : [...prev.markedForReview, qId],
    }));
  };

  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= session.questionIds.length) return;
    recordTimeOnCurrentQuestion();
    setPracticeReveal(null);
    setSession(prev => ({
      ...prev,
      currentIndex: idx,
      questionEnteredAt: Date.now(),
    }));
    questionEnteredAt.current = Date.now();
  };

  const handleSubmit = (autoSubmit = false) => {
    if (!autoSubmit && settings.confirmBeforeSubmit) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    recordTimeOnCurrentQuestion();
    setShowSubmitConfirm(false);

    const now = new Date().toISOString();
    const questionResults: QuestionResult[] = session.questionIds.map(qId => {
      const q = allQuestions.current.find(qq => qq.id === qId)!;
      const selected = session.answers[qId] || null;
      const isCorrect = selected === q.correctOptionId;
      const timeSpent = session.questionTimes[qId] || 0;

      // Update question stats
      if (selected !== null) {
        updateQuestionStats(qId, isCorrect, timeSpent);
      }

      return {
        questionId: qId,
        questionText: q.question,
        questionImage: q.image,
        category: q.category,
        difficulty: q.difficulty,
        options: q.options,
        selectedOptionId: selected,
        correctOptionId: q.correctOptionId,
        isCorrect,
        timeSpent: Math.round(timeSpent),
        explanation: q.explanation,
      };
    });

    const correct = questionResults.filter(r => r.isCorrect).length;
    const wrong = questionResults.filter(r => r.selectedOptionId && !r.isCorrect).length;
    const unanswered = questionResults.filter(r => !r.selectedOptionId).length;
    const attempted = correct + wrong;
    const totalTime = questionResults.reduce((s, r) => s + r.timeSpent, 0);
    const times = questionResults.map(r => r.timeSpent).filter(t => t > 0);

    // Category breakdown
    const catBreakdown: Record<string, { total: number; correct: number; avgTime: number }> = {};
    questionResults.forEach(r => {
      if (!catBreakdown[r.category]) {
        catBreakdown[r.category] = { total: 0, correct: 0, avgTime: 0 };
      }
      catBreakdown[r.category].total++;
      if (r.isCorrect) catBreakdown[r.category].correct++;
      catBreakdown[r.category].avgTime += r.timeSpent;
    });
    Object.values(catBreakdown).forEach(v => {
      v.avgTime = v.total > 0 ? Math.round(v.avgTime / v.total) : 0;
    });

    // Difficulty breakdown
    const diffBreakdown: Record<string, { total: number; correct: number; avgTime: number }> = {};
    questionResults.forEach(r => {
      if (!diffBreakdown[r.difficulty]) {
        diffBreakdown[r.difficulty] = { total: 0, correct: 0, avgTime: 0 };
      }
      diffBreakdown[r.difficulty].total++;
      if (r.isCorrect) diffBreakdown[r.difficulty].correct++;
      diffBreakdown[r.difficulty].avgTime += r.timeSpent;
    });
    Object.values(diffBreakdown).forEach(v => {
      v.avgTime = v.total > 0 ? Math.round(v.avgTime / v.total) : 0;
    });

    const result: TestResult = {
      id: generateId(),
      testName: session.name,
      mode: session.mode,
      date: now,
      totalQuestions: session.questionIds.length,
      correct,
      wrong,
      unanswered,
      accuracy: session.questionIds.length > 0 ? (correct / session.questionIds.length) * 100 : 0,
      attemptedAccuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      totalTime: Math.round(totalTime),
      averageTime: times.length > 0 ? Math.round(totalTime / times.length) : 0,
      fastestQuestion: times.length > 0 ? Math.round(Math.min(...times)) : 0,
      slowestQuestion: times.length > 0 ? Math.round(Math.max(...times)) : 0,
      questionResults,
      categoryBreakdown: catBreakdown,
      difficultyBreakdown: diffBreakdown,
    };

    saveTestResult(result);
    clearActiveTest();
    onFinish(result.id);
  };

  // Keep the ref updated so the timer always calls the latest doSubmit
  doSubmitRef.current = doSubmit;

  const answeredCount = Object.values(session.answers).filter(Boolean).length;
  const unansweredCount = session.questionIds.length - answeredCount;
  const markedCount = session.markedForReview.length;

  const currentQId = session.questionIds[session.currentIndex];
  const currentAnswer = session.answers[currentQId] || null;
  const isMarked = session.markedForReview.includes(currentQId);
  const options = getOptions();
  const isTimeLow = config.timerType === 'total' && timeRemaining <= 60;
  const isPerQLow = config.timerType === 'perQuestion' && perQTimeRemaining <= 5;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            Question <span className="text-[var(--accent)]">{session.currentIndex + 1}</span> / {session.questionIds.length}
          </span>
          {config.markForReview && isMarked && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Flagged</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {config.timerType === 'total' && (
            <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${isTimeLow ? 'text-red-400' : ''}`}>
              <Clock size={18} />
              {formatTime(timeRemaining)}
            </div>
          )}
          {config.timerType === 'perQuestion' && (
            <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${isPerQLow ? 'text-red-400' : ''}`}>
              <Clock size={18} />
              {formatTime(perQTimeRemaining)}
            </div>
          )}
          <button
            onClick={() => setShowNavigator(!showNavigator)}
            className="btn-secondary text-xs px-2.5 py-1.5 lg:hidden"
          >
            Navigator
          </button>
          <button
            onClick={() => handleSubmit()}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Send size={14} /> Submit
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Question Area */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          {currentQuestion ? (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  Question {session.currentIndex + 1}
                  <span className="ml-2 capitalize">{currentQuestion.difficulty}</span>
                  <span className="ml-2">{CATEGORY_LABELS[currentQuestion.category]}</span>
                </p>
                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{currentQuestion.question}</p>
              </div>

              {/* Image */}
              {currentQuestion.image && (
                <div className="flex justify-center">
                  <img
                    src={currentQuestion.image}
                    alt="Question figure"
                    className="max-w-full max-h-72 object-contain rounded-lg border border-[var(--border)] cursor-zoom-in"
                    onClick={(e) => {
                      const img = e.currentTarget;
                      if (img.style.maxHeight === 'none') {
                        img.style.maxHeight = '18rem';
                      } else {
                        img.style.maxHeight = 'none';
                      }
                    }}
                  />
                </div>
              )}

              {/* Options */}
              <div className="space-y-2.5">
                {options.map((opt, idx) => {
                  const isSelected = currentAnswer === opt.id;
                  const isCorrect = opt.id === currentQuestion.correctOptionId;
                  const showPractice = practiceReveal !== null && config.mode === 'practice';

                  let optClass = 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)]';
                  if (isSelected && !showPractice) {
                    optClass = 'border-[var(--accent)] bg-[var(--accent)]/10';
                  }
                  if (showPractice) {
                    if (isCorrect) {
                      optClass = 'border-green-500/50 bg-green-500/10';
                    } else if (isSelected && !isCorrect) {
                      optClass = 'border-red-500/50 bg-red-500/10';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => !showPractice && selectOption(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${optClass}`}
                      disabled={showPractice}
                    >
                      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)]'
                        }
                        ${showPractice && isCorrect ? 'border-green-500 bg-green-500 text-white' : ''}
                        ${showPractice && isSelected && !isCorrect ? 'border-red-500 bg-red-500 text-white' : ''}
                      `}>
                        {opt.id.toUpperCase()}
                      </span>
                      <span className="text-sm">{opt.text}</span>
                      {showPractice && isCorrect && <CheckCircle size={16} className="ml-auto text-green-400" />}
                      {showPractice && isSelected && !isCorrect && <XCircle size={16} className="ml-auto text-red-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Practice explanation */}
              {practiceReveal && config.mode === 'practice' && currentQuestion.explanation && (
                <div className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Explanation</p>
                  <p className="text-sm leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  {config.allowPrevious && (
                    <button
                      onClick={() => goToQuestion(session.currentIndex - 1)}
                      disabled={session.currentIndex === 0}
                      className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                    >
                      <ChevronLeft size={15} /> Previous
                    </button>
                  )}
                  <button
                    onClick={() => goToQuestion(session.currentIndex + 1)}
                    disabled={session.currentIndex === session.questionIds.length - 1}
                    className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-30"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {currentAnswer && (
                    <button onClick={clearAnswer} className="btn-secondary text-sm flex items-center gap-1">
                      <RotateCcw size={14} /> Clear
                    </button>
                  )}
                  {config.markForReview && (
                    <button
                      onClick={toggleMark}
                      className={`btn-secondary text-sm flex items-center gap-1 ${isMarked ? 'text-yellow-400' : ''}`}
                    >
                      <Flag size={14} /> {isMarked ? 'Unmark' : 'Mark'}
                    </button>
                  )}
                </div>
              </div>

              {/* Keyboard hints */}
              <p className="text-xs text-[var(--text-secondary)] text-center">
                Keys: A-{String.fromCharCode(64 + Math.min(options.length, 6))} or 1-{options.length} select · ← → navigate · M / F flag · C clear
              </p>
            </div>
          ) : (
            <p className="text-[var(--text-secondary)]">Question not found.</p>
          )}
        </div>

        {/* Navigator Sidebar */}
        <div className={`
          lg:w-64 lg:block bg-[var(--bg-surface)] border-l border-[var(--border)] p-4
          ${showNavigator ? 'block fixed inset-0 top-[52px] z-40 lg:relative lg:top-0' : 'hidden lg:block'}
        `}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Navigator</p>
            <button
              className="lg:hidden p-1 rounded hover:bg-[var(--bg-hover)]"
              onClick={() => setShowNavigator(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {session.questionIds.map((qId, idx) => {
              const answered = !!session.answers[qId];
              const marked = session.markedForReview.includes(qId);
              const current = idx === session.currentIndex;

              let bg = 'bg-[var(--bg-primary)]';
              if (current) bg = 'ring-2 ring-[var(--accent)]';
              if (answered && !marked) bg += ' bg-green-500/20 text-green-400';
              if (answered && marked) bg += ' bg-yellow-500/20 text-yellow-400';
              if (!answered && marked) bg += ' bg-orange-500/20 text-orange-400';

              return (
                <button
                  key={qId}
                  onClick={() => { goToQuestion(idx); setShowNavigator(false); }}
                  className={`w-full aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors hover:opacity-80 ${bg}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-[var(--bg-primary)] border border-[var(--border)]" /> Unanswered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500/20" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500/20" /> Marked (unanswered)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-500/20" /> Marked (answered)
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-1 text-xs text-[var(--text-secondary)]">
            <p>Answered: {answeredCount} / {session.questionIds.length}</p>
            <p>Unanswered: {unansweredCount}</p>
            <p>Marked: {markedCount}</p>
          </div>
        </div>
      </div>

      {/* Submit Confirmation */}
      <Modal open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Test?">
        <div className="space-y-4">
          <p className="text-sm">
            You have answered <strong>{answeredCount}</strong> of <strong>{session.questionIds.length}</strong> questions.
          </p>
          {unansweredCount > 0 && (
            <p className="text-sm text-yellow-400">
              <AlertTriangle size={14} className="inline mr-1" />
              {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} unanswered.
            </p>
          )}
          {markedCount > 0 && (
            <p className="text-sm text-orange-400">
              <Flag size={14} className="inline mr-1" />
              {markedCount} question{markedCount > 1 ? 's are' : ' is'} marked for review.
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSubmitConfirm(false)} className="btn-secondary text-sm">
              Continue Test
            </button>
            <button onClick={doSubmit} className="btn-primary text-sm">
              Submit Test
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function createSession(config: TestConfig, allQuestions: Question[]): TestSession {
  let pool = [...allQuestions];

  // Filter by category
  if (config.categories && config.categories.length > 0) {
    pool = pool.filter(q => config.categories.includes(q.category));
  }

  // Filter by difficulty
  if (config.difficulties && config.difficulties.length > 0) {
    pool = pool.filter(q => config.difficulties.includes(q.difficulty));
  }

  // Shuffle
  if (config.shuffleQuestions) {
    pool = shuffleArray(pool);
  }

  // Select count
  const count = config.questionCount === 'all' ? pool.length : Math.min(config.questionCount as number, pool.length);
  pool = pool.slice(0, count);

  const questionIds = pool.map(q => q.id);
  const answers: Record<string, string | null> = {};
  questionIds.forEach(id => { answers[id] = null; });

  const now = Date.now();
  let timerEndTime: number | undefined;
  if (config.timerType === 'total' && config.totalTimeSeconds) {
    timerEndTime = now + config.totalTimeSeconds * 1000;
  }

  return {
    id: generateId(),
    name: config.name,
    mode: config.mode,
    config,
    questionIds,
    currentIndex: 0,
    answers,
    markedForReview: [],
    questionTimes: {},
    questionEnteredAt: now,
    startedAt: new Date().toISOString(),
    totalTimeSeconds: config.totalTimeSeconds || 0,
    submitted: false,
    timerEndTime,
    perQuestionEndTime: config.timerType === 'perQuestion' && config.perQuestionTimeSeconds
      ? now + config.perQuestionTimeSeconds * 1000
      : undefined,
  };
}

