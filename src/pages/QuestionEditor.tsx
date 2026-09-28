import { useState, useRef } from 'react';
import { Save, Plus, Trash2, X, Image as ImageIcon, Upload } from 'lucide-react';
import { getQuestionById, addQuestion, updateQuestion } from '../services/storage';
import { CATEGORY_LABELS, ALL_CATEGORIES, ALL_DIFFICULTIES } from '../types/question';
import type { Question, QuestionOption, QuestionCategory, Difficulty } from '../types/question';
import { generateId } from '../utils/id';

interface QuestionEditorProps {
  questionId?: string;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

function emptyQuestion(): Omit<Question, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    question: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctOptionId: '',
    explanation: '',
    category: 'logical' as QuestionCategory,
    difficulty: 'medium' as Difficulty,
    tags: [],
    source: '',
    statistics: { attempts: 0, correct: 0, totalTime: 0 },
  };
}

const OPTION_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

export default function QuestionEditor({ questionId, onNavigate }: QuestionEditorProps) {
  const isEdit = !!questionId;
  const existing = questionId ? getQuestionById(questionId) : null;

  const [question, setQuestion] = useState(existing?.question || '');
  const [image, setImage] = useState<string | undefined>(existing?.image);
  const [options, setOptions] = useState<QuestionOption[]>(
    existing?.options || emptyQuestion().options
  );
  const [correctOptionId, setCorrectOptionId] = useState(existing?.correctOptionId || '');
  const [explanation, setExplanation] = useState(existing?.explanation || '');
  const [category, setCategory] = useState<QuestionCategory>(existing?.category || 'logical');
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty || 'medium');
  const [tagsStr, setTagsStr] = useState(existing?.tags?.join(', ') || '');
  const [source, setSource] = useState(existing?.source || '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!question.trim()) errs.push('Question text is required.');
    if (options.length < 2) errs.push('At least 2 options are required.');
    const nonEmpty = options.filter(o => o.text.trim());
    if (nonEmpty.length < 2) errs.push('At least 2 options must have text.');
    if (!correctOptionId) errs.push('Please select the correct answer.');
    if (correctOptionId && !options.find(o => o.id === correctOptionId)) {
      errs.push('Selected correct answer does not match any option.');
    }
    return errs;
  };

  const buildQuestion = (): Question => {
    const now = new Date().toISOString();
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    return {
      id: existing?.id || generateId(),
      question: question.trim(),
      image,
      options: options.filter(o => o.text.trim()),
      correctOptionId,
      explanation: explanation.trim() || undefined,
      category,
      difficulty,
      tags: tags.length > 0 ? tags : undefined,
      source: source.trim() || undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      statistics: existing?.statistics || { attempts: 0, correct: 0, totalTime: 0 },
    };
  };

  const handleSave = (andNew: boolean) => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const q = buildQuestion();
    if (isEdit) {
      updateQuestion(q);
    } else {
      addQuestion(q);
    }
    setSaved(true);
    if (andNew) {
      // Reset form
      setQuestion('');
      setImage(undefined);
      setOptions(emptyQuestion().options);
      setCorrectOptionId('');
      setExplanation('');
      setTagsStr('');
      setSource('');
      setSaved(false);
    } else {
      setTimeout(() => onNavigate('questionBank'), 500);
    }
  };

  const addOption = () => {
    if (options.length >= 6) return;
    const nextId = OPTION_LETTERS[options.length] || `opt${options.length}`;
    setOptions([...options, { id: nextId, text: '' }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const removed = options[idx];
    const newOpts = options.filter((_, i) => i !== idx);
    if (correctOptionId === removed.id) setCorrectOptionId('');
    setOptions(newOpts);
  };

  const updateOptionText = (idx: number, text: string) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], text };
    setOptions(newOpts);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(['Image must be smaller than 5MB.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Question' : 'Add Question'}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {isEdit ? `Editing: ${questionId}` : 'Create a new question'}
          </p>
        </div>
        <button onClick={() => onNavigate('questionBank')} className="btn-secondary text-sm flex items-center gap-1.5">
          <X size={15} /> Cancel
        </button>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-400">• {e}</p>
          ))}
        </div>
      )}

      {saved && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">✓ Question saved successfully!</p>
        </div>
      )}

      {/* Question Text */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Question <span className="text-red-400">*</span></label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Enter your question here..."
          rows={4}
          className="input w-full resize-y"
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Image (optional)</label>
        {image ? (
          <div className="relative inline-block">
            <img src={image} alt="Question" className="max-w-full max-h-64 rounded-lg object-contain border border-[var(--border)]" />
            <button
              onClick={() => setImage(undefined)}
              className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <Upload size={15} /> Upload Image
            </button>
            <p className="text-xs text-[var(--text-secondary)] mt-1">PNG, JPG, GIF up to 5MB. Stored as base64.</p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Options <span className="text-red-400">*</span></label>
          {options.length < 6 && (
            <button onClick={addOption} className="text-xs btn-secondary flex items-center gap-1">
              <Plus size={13} /> Add Option
            </button>
          )}
        </div>
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              onClick={() => setCorrectOptionId(opt.id)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors
                ${correctOptionId === opt.id
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              title={`Mark ${opt.id.toUpperCase()} as correct`}
            >
              {opt.id.toUpperCase()}
            </button>
            <input
              type="text"
              value={opt.text}
              onChange={e => updateOptionText(idx, e.target.value)}
              placeholder={`Option ${opt.id.toUpperCase()}`}
              className="input flex-1"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(idx)}
                className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                title="Remove option"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <p className="text-xs text-[var(--text-secondary)]">
          Click the letter circle to mark the correct answer. Currently selected: {correctOptionId ? correctOptionId.toUpperCase() : 'None'}
        </p>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Explanation (optional)</label>
        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          placeholder="Explain the correct answer..."
          rows={3}
          className="input w-full resize-y"
        />
      </div>

      {/* Category & Difficulty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as QuestionCategory)}
            className="input w-full"
          >
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as Difficulty)}
            className="input w-full"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Tags & Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags (optional)</label>
          <input
            type="text"
            value={tagsStr}
            onChange={e => setTagsStr(e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Source (optional)</label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. ISSB Practice Book"
            className="input w-full"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
        <button onClick={() => handleSave(false)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Save size={15} /> {isEdit ? 'Update Question' : 'Save Question'}
        </button>
        {!isEdit && (
          <button onClick={() => handleSave(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Plus size={15} /> Save & Add Another
          </button>
        )}
        <button onClick={() => onNavigate('questionBank')} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
