import type { Question, QuestionCategory, Difficulty } from '../types/question';
import { generateId } from './id';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const VALID_CATEGORIES: QuestionCategory[] = [
  'numerical', 'verbal', 'logical', 'abstract', 'spatial',
  'pattern', 'analogy', 'classification', 'series', 'other',
];

const CATEGORY_MAP: Record<string, QuestionCategory> = {
  numerical: 'numerical',
  'numerical reasoning': 'numerical',
  math: 'numerical',
  verbal: 'verbal',
  'verbal reasoning': 'verbal',
  logical: 'logical',
  'logical reasoning': 'logical',
  logic: 'logical',
  abstract: 'abstract',
  'abstract reasoning': 'abstract',
  spatial: 'spatial',
  'spatial reasoning': 'spatial',
  pattern: 'pattern',
  'pattern recognition': 'pattern',
  analogy: 'analogy',
  classification: 'classification',
  series: 'series',
  'number series': 'series',
  other: 'other',
};

export function normalizeCategory(cat: unknown): QuestionCategory {
  if (typeof cat !== 'string' || !cat.trim()) return 'other';
  const clean = cat.trim().toLowerCase();
  return CATEGORY_MAP[clean] || (VALID_CATEGORIES.includes(clean as QuestionCategory) ? (clean as QuestionCategory) : 'other');
}

export function normalizeDifficulty(diff: unknown): Difficulty {
  if (typeof diff !== 'string' || !diff.trim()) return 'medium';
  const clean = diff.trim().toLowerCase();
  if (clean === 'easy' || clean === 'medium' || clean === 'hard') {
    return clean as Difficulty;
  }
  return 'medium';
}

function resolveCorrectOptionId(
  rawCorrect: unknown,
  normalizedOptions: { id: string; text: string }[]
): string | null {
  if (!rawCorrect) return null;
  const str = String(rawCorrect).trim().toLowerCase();

  // Match direct option id (e.g. 'a', 'b', 'c', 'd')
  const directMatch = normalizedOptions.find(o => o.id === str);
  if (directMatch) return directMatch.id;

  // Match 1-indexed number (e.g. '1' -> 'a', '2' -> 'b')
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= normalizedOptions.length) {
    return normalizedOptions[num - 1].id;
  }

  // Match option text directly
  const textMatch = normalizedOptions.find(
    o => o.text.trim().toLowerCase() === str
  );
  if (textMatch) return textMatch.id;

  return null;
}

export function validateQuestion(q: Record<string, unknown>, index: number): {
  errors: ValidationError[];
  normalizedOptions: { id: string; text: string }[];
  resolvedCorrectId: string | null;
} {
  const errors: ValidationError[] = [];
  const normalizedOptions: { id: string; text: string }[] = [];

  if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
    errors.push({ row: index, field: 'question', message: 'Missing question text.' });
  }

  // Support array of strings, array of objects, or options object {a: '...', b: '...'}
  if (Array.isArray(q.options) && q.options.length >= 2) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      if (typeof opt === 'string') {
        normalizedOptions.push({
          id: String.fromCharCode(97 + i),
          text: opt.trim(),
        });
      } else if (opt && typeof opt === 'object') {
        const o = opt as Record<string, unknown>;
        const id = (typeof o.id === 'string' && o.id.trim()) ? o.id.trim().toLowerCase() : String.fromCharCode(97 + i);
        const text = String(o.text || '').trim();
        normalizedOptions.push({ id, text });
      }
    }
  } else if (q.options && typeof q.options === 'object') {
    // Key-value pairs: { a: "First", b: "Second" }
    const entries = Object.entries(q.options as Record<string, unknown>);
    if (entries.length >= 2) {
      entries.forEach(([key, val]) => {
        normalizedOptions.push({ id: key.trim().toLowerCase(), text: String(val || '').trim() });
      });
    } else {
      errors.push({ row: index, field: 'options', message: 'Must have at least 2 options.' });
    }
  } else {
    errors.push({ row: index, field: 'options', message: 'Must have at least 2 options.' });
  }

  // Check that options have text
  normalizedOptions.forEach((opt, oIdx) => {
    if (!opt.text) {
      errors.push({ row: index, field: `options[${oIdx}].text`, message: `Option ${oIdx + 1} text is empty.` });
    }
  });

  // Resolve correct option from: correctOptionId, correctOption, correct, answer
  const rawCorrect = q.correctOptionId ?? q.correctOption ?? q.correct ?? q.answer;
  const resolvedCorrectId = resolveCorrectOptionId(rawCorrect, normalizedOptions);

  if (!resolvedCorrectId) {
    errors.push({
      row: index,
      field: 'correctOption',
      message: rawCorrect
        ? `Answer "${rawCorrect}" does not match any option (${normalizedOptions.map(o => o.id).join(', ')})`
        : 'Missing correct answer (e.g. "a", "b", "c", etc.).',
    });
  }

  return { errors, normalizedOptions, resolvedCorrectId };
}

export function validateImportData(data: unknown): {
  valid: Question[];
  invalid: { index: number; errors: ValidationError[] }[];
} {
  if (!Array.isArray(data)) {
    return {
      valid: [],
      invalid: [{ index: 0, errors: [{ row: 0, field: 'root', message: 'Data must be a JSON array.' }] }],
    };
  }

  const valid: Question[] = [];
  const invalid: { index: number; errors: ValidationError[] }[] = [];

  data.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      invalid.push({ index: idx + 1, errors: [{ row: idx + 1, field: 'item', message: 'Item must be a valid JSON object.' }] });
      return;
    }

    const q = item as Record<string, unknown>;
    const { errors, normalizedOptions, resolvedCorrectId } = validateQuestion(q, idx + 1);

    if (errors.length === 0 && resolvedCorrectId) {
      valid.push({
        id: (typeof q.id === 'string' && q.id.trim()) ? q.id.trim() : generateId(),
        question: String(q.question).trim(),
        image: (typeof q.image === 'string' && q.image.trim()) ? q.image.trim() : undefined,
        options: normalizedOptions,
        correctOptionId: resolvedCorrectId,
        explanation: (typeof q.explanation === 'string' && q.explanation.trim()) ? q.explanation.trim() : undefined,
        category: normalizeCategory(q.category),
        difficulty: normalizeDifficulty(q.difficulty),
        tags: Array.isArray(q.tags)
          ? q.tags.map(t => String(t).trim()).filter(Boolean)
          : (typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined),
        source: (typeof q.source === 'string' && q.source.trim()) ? q.source.trim() : undefined,
        createdAt: (typeof q.createdAt === 'string' && q.createdAt) ? q.createdAt : new Date().toISOString(),
        updatedAt: (typeof q.updatedAt === 'string' && q.updatedAt) ? q.updatedAt : new Date().toISOString(),
        statistics: { attempts: 0, correct: 0, totalTime: 0 },
      });
    } else {
      invalid.push({ index: idx + 1, errors });
    }
  });

  return { valid, invalid };
}

/**
 * Parses CSV text where minimal columns are only:
 * question, optionA, optionB, optionC, optionD, correctOption
 * (category, difficulty, explanation, tags are completely optional!)
 */
export function parseCSVToQuestions(csvText: string): unknown[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  const questionIdx = headers.indexOf('question');
  const optAIdx = headers.indexOf('optiona') !== -1 ? headers.indexOf('optiona') : headers.indexOf('a');
  const optBIdx = headers.indexOf('optionb') !== -1 ? headers.indexOf('optionb') : headers.indexOf('b');
  const optCIdx = headers.indexOf('optionc') !== -1 ? headers.indexOf('optionc') : headers.indexOf('c');
  const optDIdx = headers.indexOf('optiond') !== -1 ? headers.indexOf('optiond') : headers.indexOf('d');
  const correctIdx = [
    headers.indexOf('correctoption'),
    headers.indexOf('correctoptionid'),
    headers.indexOf('correct'),
    headers.indexOf('answer'),
  ].find(idx => idx !== -1) ?? -1;

  const catIdx = headers.indexOf('category');
  const diffIdx = headers.indexOf('difficulty');
  const expIdx = headers.indexOf('explanation');
  const tagsIdx = headers.indexOf('tags');

  const questions: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const options = [
      { id: 'a', text: cols[optAIdx >= 0 ? optAIdx : 1] || '' },
      { id: 'b', text: cols[optBIdx >= 0 ? optBIdx : 2] || '' },
      { id: 'c', text: cols[optCIdx >= 0 ? optCIdx : 3] || '' },
      { id: 'd', text: cols[optDIdx >= 0 ? optDIdx : 4] || '' },
    ].filter(o => o.text.trim().length > 0);

    const correctRaw = (correctIdx >= 0 ? cols[correctIdx] : (cols[5] || 'a')).trim();

    questions.push({
      question: (questionIdx >= 0 ? cols[questionIdx] : cols[0]) || '',
      options,
      correctOption: correctRaw,
      category: catIdx >= 0 && cols[catIdx] ? cols[catIdx] : 'other',
      difficulty: diffIdx >= 0 && cols[diffIdx] ? cols[diffIdx] : 'medium',
      explanation: expIdx >= 0 && cols[expIdx] ? cols[expIdx] : '',
      tags: tagsIdx >= 0 && cols[tagsIdx] ? cols[tagsIdx].split(';').map(t => t.trim()) : [],
    });
  }

  return questions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
