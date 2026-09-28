import type { Question, QuestionCategory, Difficulty } from '../types/question';
import type { TestResult } from '../types/test';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import { sampleQuestions } from '../data/sampleQuestions';

const KEYS = {
  questions: 'iq-app-questions',
  testHistory: 'iq-app-test-history',
  settings: 'iq-app-settings',
  activeTest: 'iq-app-active-test',
  initialized: 'iq-app-initialized',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

// --- Questions ---

export function initializeStorage(): void {
  const initialized = localStorage.getItem(KEYS.initialized);
  if (!initialized) {
    safeSet(KEYS.questions, sampleQuestions);
    localStorage.setItem(KEYS.initialized, 'true');
  }
}

export function getQuestions(): Question[] {
  return safeGet<Question[]>(KEYS.questions, []);
}

export function saveQuestions(questions: Question[]): void {
  safeSet(KEYS.questions, questions);
}

export function addQuestion(question: Question): void {
  const questions = getQuestions();
  questions.push(question);
  saveQuestions(questions);
}

export function updateQuestion(updated: Question): void {
  const questions = getQuestions();
  const idx = questions.findIndex(q => q.id === updated.id);
  if (idx !== -1) {
    questions[idx] = updated;
    saveQuestions(questions);
  }
}

export function deleteQuestion(id: string): void {
  const questions = getQuestions().filter(q => q.id !== id);
  saveQuestions(questions);
}

export function getQuestionById(id: string): Question | undefined {
  return getQuestions().find(q => q.id === id);
}

export function importQuestions(newQuestions: Question[]): { imported: number; skipped: number } {
  const existing = getQuestions();
  const existingIds = new Set(existing.map(q => q.id));
  let imported = 0;
  let skipped = 0;
  for (const q of newQuestions) {
    if (existingIds.has(q.id)) {
      skipped++;
    } else {
      existing.push(q);
      existingIds.add(q.id);
      imported++;
    }
  }
  saveQuestions(existing);
  return { imported, skipped };
}

// --- Test History ---

export function getTestHistory(): TestResult[] {
  return safeGet<TestResult[]>(KEYS.testHistory, []);
}

export function saveTestResult(result: TestResult): void {
  const history = getTestHistory();
  history.unshift(result);
  safeSet(KEYS.testHistory, history);
}

export function deleteTestResult(id: string): void {
  const history = getTestHistory().filter(t => t.id !== id);
  safeSet(KEYS.testHistory, history);
}

export function clearTestHistory(): void {
  safeSet(KEYS.testHistory, []);
}

// --- Settings ---

export function getSettings(): AppSettings {
  return safeGet<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  safeSet(KEYS.settings, settings);
}

// --- Active Test Session ---

export function getActiveTest<T>(): T | null {
  return safeGet<T | null>(KEYS.activeTest, null);
}

export function saveActiveTest<T>(session: T): void {
  safeSet(KEYS.activeTest, session);
}

export function clearActiveTest(): void {
  localStorage.removeItem(KEYS.activeTest);
}

// --- Full Backup ---

export interface BackupData {
  version: number;
  questions: Question[];
  testHistory: TestResult[];
  settings: AppSettings;
  createdAt: string;
}

export function createBackup(): BackupData {
  return {
    version: 1,
    questions: getQuestions(),
    testHistory: getTestHistory(),
    settings: getSettings(),
    createdAt: new Date().toISOString(),
  };
}

export function restoreBackup(data: BackupData): { success: boolean; error?: string } {
  if (!data.version || data.version > 1) {
    return { success: false, error: 'Incompatible backup version.' };
  }
  try {
    if (data.questions) saveQuestions(data.questions);
    if (data.testHistory) safeSet(KEYS.testHistory, data.testHistory);
    if (data.settings) saveSettings(data.settings);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export function clearAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

// --- Question Stats Helpers ---

export function updateQuestionStats(
  questionId: string,
  isCorrect: boolean,
  timeSpent: number,
): void {
  const questions = getQuestions();
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx !== -1) {
    const q = questions[idx];
    q.statistics = q.statistics || { attempts: 0, correct: 0, totalTime: 0 };
    q.statistics.attempts += 1;
    if (isCorrect) q.statistics.correct += 1;
    q.statistics.totalTime += timeSpent;
    questions[idx] = q;
    saveQuestions(questions);
  }
}

// --- Query Helpers ---

export function getFilteredQuestions(filters: {
  category?: QuestionCategory;
  difficulty?: Difficulty;
  hasImage?: boolean;
  unused?: boolean;
  frequentlyWrong?: boolean;
  neverAttempted?: boolean;
  search?: string;
}): Question[] {
  let questions = getQuestions();

  if (filters.category) {
    questions = questions.filter(q => q.category === filters.category);
  }
  if (filters.difficulty) {
    questions = questions.filter(q => q.difficulty === filters.difficulty);
  }
  if (filters.hasImage) {
    questions = questions.filter(q => !!q.image);
  }
  if (filters.unused) {
    questions = questions.filter(q => !q.statistics || q.statistics.attempts === 0);
  }
  if (filters.frequentlyWrong) {
    questions = questions.filter(q => {
      if (!q.statistics || q.statistics.attempts < 2) return false;
      return q.statistics.correct / q.statistics.attempts < 0.5;
    });
  }
  if (filters.neverAttempted) {
    questions = questions.filter(q => !q.statistics || q.statistics.attempts === 0);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    questions = questions.filter(q =>
      q.question.toLowerCase().includes(s) ||
      q.id.toLowerCase().includes(s) ||
      (q.tags && q.tags.some(t => t.toLowerCase().includes(s)))
    );
  }

  return questions;
}
