import { useState, useMemo, useRef } from 'react';
import {
  Search, Filter, Download, Upload, Plus, Eye, Edit2, Copy,
  Trash2, ChevronDown, X, FileDown, FileUp, BookOpen, Check,
} from 'lucide-react';
import { getQuestions, deleteQuestion, saveQuestions, importQuestions } from '../services/storage';
import { CATEGORY_LABELS, ALL_CATEGORIES, ALL_DIFFICULTIES } from '../types/question';
import type { Question, QuestionCategory, Difficulty } from '../types/question';
import { validateImportData, parseCSVToQuestions } from '../utils/validation';
import { downloadJSON, downloadCSV, downloadFile } from '../utils/download';
import { formatDate } from '../utils/time';
import { generateId } from '../utils/id';
import Modal from '../components/Modal';

interface QuestionBankProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

type SortKey = 'newest' | 'oldest' | 'accuracy' | 'difficulty' | 'mostAttempted';
type FilterType = 'all' | 'category' | 'difficulty' | 'hasImage' | 'unused' | 'frequentlyWrong' | 'neverAttempted';

export default function QuestionBank({ onNavigate }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>(() => getQuestions());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [filterCategory, setFilterCategory] = useState<QuestionCategory | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importModal, setImportModal] = useState(false);
  const [copiedType, setCopiedType] = useState<'json' | 'csv' | null>(null);
  const [showSnippet, setShowSnippet] = useState<'json' | 'csv' | null>(null);
  const [importResult, setImportResult] = useState<{
    valid: Question[];
    invalid: { index: number; errors: { row: number; field: string; message: string }[] }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshQuestions = () => setQuestions(getQuestions());

  const filtered = useMemo(() => {
    let result = [...questions];

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(q =>
        q.question.toLowerCase().includes(s) ||
        q.id.toLowerCase().includes(s) ||
        (q.tags && q.tags.some(t => t.toLowerCase().includes(s)))
      );
    }

    // Category filter
    if (filterCategory) {
      result = result.filter(q => q.category === filterCategory);
    }

    // Difficulty filter
    if (filterDifficulty) {
      result = result.filter(q => q.difficulty === filterDifficulty);
    }

    // Type filter
    if (filterType === 'hasImage') result = result.filter(q => !!q.image);
    if (filterType === 'unused') result = result.filter(q => !q.statistics || q.statistics.attempts === 0);
    if (filterType === 'frequentlyWrong') result = result.filter(q => {
      if (!q.statistics || q.statistics.attempts < 2) return false;
      return q.statistics.correct / q.statistics.attempts < 0.5;
    });
    if (filterType === 'neverAttempted') result = result.filter(q => !q.statistics || q.statistics.attempts === 0);

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'accuracy':
        result.sort((a, b) => {
          const accA = a.statistics && a.statistics.attempts > 0 ? a.statistics.correct / a.statistics.attempts : -1;
          const accB = b.statistics && b.statistics.attempts > 0 ? b.statistics.correct / b.statistics.attempts : -1;
          return accA - accB;
        });
        break;
      case 'difficulty':
        const order = { easy: 0, medium: 1, hard: 2 };
        result.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
        break;
      case 'mostAttempted':
        result.sort((a, b) => (b.statistics?.attempts || 0) - (a.statistics?.attempts || 0));
        break;
    }

    return result;
  }, [questions, search, sortBy, filterCategory, filterDifficulty, filterType]);

  const handleDelete = () => {
    if (deleteId) {
      deleteQuestion(deleteId);
      refreshQuestions();
      setDeleteId(null);
    }
  };

  const handleDuplicate = (q: Question) => {
    const dup: Question = {
      ...q,
      id: generateId(),
      question: q.question + ' (copy)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statistics: { attempts: 0, correct: 0, totalTime: 0 },
    };
    const qs = getQuestions();
    qs.push(dup);
    saveQuestions(qs);
    refreshQuestions();
  };

  const handleExportAll = () => {
    const data = JSON.stringify(questions, null, 2);
    downloadJSON(data, 'question-bank.json');
  };

  const handleExportSelected = () => {
    const selected = questions.filter(q => selectedIds.has(q.id));
    const data = JSON.stringify(selected, null, 2);
    downloadJSON(data, 'selected-questions.json');
    setSelectedIds(new Set());
  };

  const JSON_TEMPLATE = JSON.stringify([
    {
      question: 'Find the next number in the series: 3, 6, 12, 24, ?',
      options: ['36', '48', '42', '52'],
      correctOption: 'b',
    },
    {
      question: 'Book is to Reading as Fork is to:',
      options: ['Drawing', 'Writing', 'Eating', 'Cooking'],
      correctOption: 'c',
    },
  ], null, 2);

  const CSV_TEMPLATE = `question,optionA,optionB,optionC,optionD,correctOption
"Find the next number: 3, 6, 12, 24, ?","36","48","42","52","b"
"Book is to Reading as Fork is to:","Drawing","Writing","Eating","Cooking","c"`;

  const handleExportTemplate = () => {
    downloadJSON(JSON_TEMPLATE, 'question-template.json');
  };

  const handleExportCSVTemplate = () => {
    downloadCSV(CSV_TEMPLATE, 'question-template.csv');
  };

  const copyTemplate = (type: 'json' | 'csv') => {
    const text = type === 'json' ? JSON_TEMPLATE : CSV_TEMPLATE;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let questionsToValidate: unknown;

        if (file.name.toLowerCase().endsWith('.csv')) {
          questionsToValidate = parseCSVToQuestions(text);
        } else {
          questionsToValidate = JSON.parse(text);
        }

        const result = validateImportData(questionsToValidate);
        setImportResult(result);
      } catch {
        setImportResult({
          valid: [],
          invalid: [{ index: 0, errors: [{ row: 0, field: 'file', message: 'Unable to parse file. Please verify it is valid JSON or CSV.' }] }],
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleImport = () => {
    if (importResult && importResult.valid.length > 0) {
      importQuestions(importResult.valid);
      refreshQuestions();
      setImportModal(false);
      setImportResult(null);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q.id)));
    }
  };

  const getAccuracy = (q: Question) => {
    if (!q.statistics || q.statistics.attempts === 0) return '—';
    return `${Math.round((q.statistics.correct / q.statistics.attempts) * 100)}%`;
  };

  const diffColor = (d: string) => {
    if (d === 'easy') return 'text-green-400 bg-green-400/10';
    if (d === 'medium') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{questions.length} questions total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('addQuestion')}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus size={15} /> Add
          </button>
          <button
            onClick={() => setImportModal(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Upload size={15} /> Import
          </button>
          <button
            onClick={handleExportAll}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Download size={15} /> Export
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleExportSelected}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <FileDown size={15} /> Export ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions, IDs, or tags..."
              className="input pl-9 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${showFilters ? 'ring-1 ring-[var(--accent)]' : ''}`}
          >
            <Filter size={15} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as QuestionCategory | '')}
              className="input text-sm"
            >
              <option value="">All Categories</option>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value as Difficulty | '')}
              className="input text-sm"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as FilterType)}
              className="input text-sm"
            >
              <option value="all">All</option>
              <option value="hasImage">Has Image</option>
              <option value="unused">Unused</option>
              <option value="frequentlyWrong">Frequently Wrong</option>
              <option value="neverAttempted">Never Attempted</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="input text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="accuracy">Lowest Accuracy</option>
              <option value="difficulty">Difficulty</option>
              <option value="mostAttempted">Most Attempted</option>
            </select>
            <button
              onClick={handleExportTemplate}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <FileDown size={14} /> Template
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No questions found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[auto_1fr_120px_80px_60px_60px_80px_100px] gap-2 px-4 py-2.5 border-b border-[var(--border)] text-xs text-[var(--text-secondary)] font-medium">
            <div className="w-5">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="accent-[var(--accent)]"
              />
            </div>
            <div>Question</div>
            <div>Category</div>
            <div>Difficulty</div>
            <div className="text-center">Opts</div>
            <div className="text-center">Tried</div>
            <div className="text-center">Accuracy</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Rows */}
          {filtered.map(q => (
            <div
              key={q.id}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr_120px_80px_60px_60px_80px_100px] gap-2 px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors items-center"
            >
              <div className="hidden md:block w-5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  className="accent-[var(--accent)]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{q.question}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">ID: {q.id}</p>
                {/* Mobile info */}
                <div className="md:hidden flex flex-wrap gap-2 mt-1.5 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">{CATEGORY_LABELS[q.category]}</span>
                  <span className={`px-1.5 py-0.5 rounded capitalize ${diffColor(q.difficulty)}`}>{q.difficulty}</span>
                  <span className="text-[var(--text-secondary)]">{q.statistics?.attempts || 0} attempts</span>
                  <span className="text-[var(--text-secondary)]">Acc: {getAccuracy(q)}</span>
                </div>
              </div>
              <div className="hidden md:block text-xs text-[var(--text-secondary)]">{CATEGORY_LABELS[q.category]}</div>
              <div className="hidden md:block">
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${diffColor(q.difficulty)}`}>
                  {q.difficulty}
                </span>
              </div>
              <div className="hidden md:block text-center text-sm">{q.options.length}</div>
              <div className="hidden md:block text-center text-sm">{q.statistics?.attempts || 0}</div>
              <div className="hidden md:block text-center text-sm">{getAccuracy(q)}</div>
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => setViewQuestion(q)}
                  className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                  title="View"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onNavigate('editQuestion', { questionId: q.id })}
                  className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDuplicate(q)}
                  className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(q.id)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      <Modal open={!!viewQuestion} onClose={() => setViewQuestion(null)} title="Question Details">
        {viewQuestion && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">{viewQuestion.question}</p>
            {viewQuestion.image && (
              <img src={viewQuestion.image} alt="Question" className="max-w-full max-h-64 rounded-lg object-contain" />
            )}
            <div className="space-y-1.5">
              {viewQuestion.options.map(o => (
                <div
                  key={o.id}
                  className={`px-3 py-2 rounded-lg text-sm border ${o.id === viewQuestion.correctOptionId
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-[var(--border)]'
                    }`}
                >
                  <span className="font-medium mr-2">{o.id.toUpperCase()}.</span>
                  {o.text}
                  {o.id === viewQuestion.correctOptionId && <span className="ml-2 text-xs">(Correct)</span>}
                </div>
              ))}
            </div>
            {viewQuestion.explanation && (
              <div className="p-3 bg-[var(--bg-primary)] rounded-lg text-sm">
                <p className="font-medium text-xs text-[var(--text-secondary)] mb-1">Explanation</p>
                {viewQuestion.explanation}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
              <span>Category: {CATEGORY_LABELS[viewQuestion.category]}</span>
              <span>·</span>
              <span className="capitalize">Difficulty: {viewQuestion.difficulty}</span>
              {viewQuestion.tags && viewQuestion.tags.length > 0 && (
                <>
                  <span>·</span>
                  <span>Tags: {viewQuestion.tags.join(', ')}</span>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Question" danger>
        <p className="text-sm mb-4">Are you sure you want to delete this question? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportResult(null); }} title="Import Questions">
        <div className="space-y-4">
          <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] text-xs space-y-1.5 text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">Simple Minimal Format (No Category, Difficulty, or Explanation Needed)</p>
            <p>• <strong>JSON</strong>: <code className="text-[var(--accent)]">{`[ { "question": "...", "options": ["A", "B", "C", "D"], "correctOption": "b" } ]`}</code></p>
            <p>• <strong>CSV</strong>: <code className="text-[var(--accent)]">question,optionA,optionB,optionC,optionD,correctOption</code></p>
            <p className="text-[11px] text-[var(--text-secondary)]/80">* Category, difficulty, and explanation are completely optional. You only need the question, options, and correct answer!</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportTemplate}
              className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
            >
              <FileDown size={14} /> Download .json
            </button>
            <button
              onClick={handleExportCSVTemplate}
              className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
            >
              <FileDown size={14} /> Download .csv
            </button>
            <button
              onClick={() => copyTemplate('json')}
              className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5"
            >
              {copiedType === 'json' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copiedType === 'json' ? 'JSON Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={() => copyTemplate('csv')}
              className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5"
            >
              {copiedType === 'csv' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copiedType === 'csv' ? 'CSV Copied!' : 'Copy CSV'}
            </button>
          </div>

          {/* Collapsible snippet preview */}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowSnippet(prev => (prev === 'json' ? null : 'json'))}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${showSnippet === 'json' ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {showSnippet === 'json' ? 'Hide JSON Snippet' : 'Preview JSON'}
            </button>
            <button
              type="button"
              onClick={() => setShowSnippet(prev => (prev === 'csv' ? null : 'csv'))}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${showSnippet === 'csv' ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {showSnippet === 'csv' ? 'Hide CSV Snippet' : 'Preview CSV'}
            </button>
          </div>

          {showSnippet && (
            <div className="relative">
              <pre className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] text-[11px] font-mono overflow-x-auto max-h-40 leading-relaxed text-[var(--text-secondary)]">
                {showSnippet === 'json' ? JSON_TEMPLATE : CSV_TEMPLATE}
              </pre>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-3">
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">
              Select JSON or CSV File to Import
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="text-sm block w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent)]/15 file:text-[var(--accent)] hover:file:bg-[var(--accent)]/25 cursor-pointer"
            />
          </div>

          {importResult && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-4 text-sm font-medium">
                <span className="text-green-400">✓ {importResult.valid.length} valid questions</span>
                {importResult.invalid.length > 0 && (
                  <span className="text-red-400">✗ {importResult.invalid.length} invalid items</span>
                )}
              </div>

              {importResult.invalid.length > 0 && (
                <div className="max-h-40 overflow-auto bg-[var(--bg-primary)] rounded-lg p-3 text-xs space-y-1.5 border border-red-500/20">
                  {importResult.invalid.map(inv => (
                    <div key={inv.index}>
                      {inv.errors.map((e, i) => (
                        <p key={i} className="text-red-400">
                          Row {e.row}: {e.message}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {importResult.valid.length > 0 && (
                <button onClick={handleImport} className="btn-primary text-sm w-full py-2.5 font-medium">
                  Confirm & Import {importResult.valid.length} Questions
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
