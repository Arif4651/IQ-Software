export type TestMode = 'practice' | 'exam';

export type TimerType = 'total' | 'perQuestion' | 'none';

export interface TestConfig {
  name: string;
  mode: TestMode;
  questionCount: number | 'all';
  timerType: TimerType;
  totalTimeSeconds?: number;
  perQuestionTimeSeconds?: number;
  categories: string[];
  difficulties: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowPrevious: boolean;
  markForReview: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  timeSpent: number;
  markedForReview: boolean;
}

export interface TestSession {
  id: string;
  name: string;
  mode: TestMode;
  config: TestConfig;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string | null>;
  markedForReview: string[];
  questionTimes: Record<string, number>;
  questionEnteredAt: number;
  startedAt: string;
  endedAt?: string;
  totalTimeSeconds: number;
  submitted: boolean;
  timerEndTime?: number;
  perQuestionEndTime?: number;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  questionImage?: string;
  category: string;
  difficulty: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  timeSpent: number;
  explanation?: string;
}

export interface TestResult {
  id: string;
  testName: string;
  mode: TestMode;
  date: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
  attemptedAccuracy: number;
  totalTime: number;
  averageTime: number;
  fastestQuestion: number;
  slowestQuestion: number;
  questionResults: QuestionResult[];
  categoryBreakdown: Record<string, { total: number; correct: number; avgTime: number }>;
  difficultyBreakdown: Record<string, { total: number; correct: number; avgTime: number }>;
}
