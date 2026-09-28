export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  defaultMode: 'practice' | 'exam';
  defaultTimeSeconds: number;
  defaultQuestionCount: number;
  defaultCategory: string;
  autoNextAfterAnswer: boolean;
  showExplanationsInPractice: boolean;
  confirmBeforeSubmit: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultMode: 'exam',
  defaultTimeSeconds: 1200,
  defaultQuestionCount: 20,
  defaultCategory: 'all',
  autoNextAfterAnswer: false,
  showExplanationsInPractice: true,
  confirmBeforeSubmit: true,
};
