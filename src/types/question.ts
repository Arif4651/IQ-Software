export interface QuestionOption {
  id: string;
  text: string;
}

export type QuestionCategory =
  | 'numerical'
  | 'verbal'
  | 'logical'
  | 'abstract'
  | 'spatial'
  | 'pattern'
  | 'analogy'
  | 'classification'
  | 'series'
  | 'other';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  numerical: 'Numerical Reasoning',
  verbal: 'Verbal Reasoning',
  logical: 'Logical Reasoning',
  abstract: 'Abstract Reasoning',
  spatial: 'Spatial Reasoning',
  pattern: 'Pattern Recognition',
  analogy: 'Analogy',
  classification: 'Classification',
  series: 'Series',
  other: 'Other',
};

export const ALL_CATEGORIES: QuestionCategory[] = [
  'numerical', 'verbal', 'logical', 'abstract', 'spatial',
  'pattern', 'analogy', 'classification', 'series', 'other',
];

export const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export interface QuestionStatistics {
  attempts: number;
  correct: number;
  totalTime: number;
}

export interface Question {
  id: string;
  question: string;
  image?: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation?: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  tags?: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
  statistics: QuestionStatistics;
}
