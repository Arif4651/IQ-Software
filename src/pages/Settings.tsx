import { useState, useRef } from 'react';
import {
  Sun, Moon, Monitor, Download, Upload, Trash2, AlertTriangle,
  RotateCcw, Save, Keyboard, BookOpen,
} from 'lucide-react';
import {
  getSettings, saveSettings, createBackup, restoreBackup,
  clearTestHistory, saveQuestions, clearAllData,
} from '../services/storage';
import { sampleQuestions } from '../data/sampleQuestions';
import { downloadJSON } from '../utils/download';
import type { AppSettings, ThemeMode } from '../types/settings';
import type { BackupData } from '../services/storage';
import Modal from '../components/Modal';

interface SettingsProps {
  onThemeChange: (theme: ThemeMode) => void;
}

export default function Settings({ onThemeChange }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [saved, setSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    if (partial.theme) {
      onThemeChange(partial.theme);
    }
  };

  const handleExportBackup = () => {
    const data = createBackup();
    downloadJSON(JSON.stringify(data, null, 2), `iq-practice-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        const result = restoreBackup(data);
        if (result.success) {
          setImportResult('Backup restored successfully. Reload the page to see changes.');
          setSettings(getSettings());
        } else {
          setImportResult(`Restore failed: ${result.error}`);
        }
      } catch {
        setImportResult('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDangerAction = () => {
    if (confirmAction === 'clearHistory') {
      clearTestHistory();
      setImportResult('Test history has been cleared.');
    } else if (confirmAction === 'clearQuestions') {
      saveQuestions([]);
      setImportResult('Question bank has been emptied.');
    } else if (confirmAction === 'resetSample') {
      saveQuestions(sampleQuestions);
      setImportResult(`Question bank reset to ${sampleQuestions.length} sample questions.`);
    } else if (confirmAction === 'resetAll') {
      clearAllData();
      window.location.reload();
    }
    setConfirmAction(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Configure your preferences</p>
      </div>

      {saved && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">✓ Settings saved</p>
        </div>
      )}

      {/* Appearance */}
      <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {([
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ] as { value: ThemeMode; icon: typeof Sun; label: string }[]).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => update({ theme: value })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors
                ${settings.theme === value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Test Preferences */}
      <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-semibold">Test Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--text-secondary)]">Default Mode</label>
            <select
              value={settings.defaultMode}
              onChange={e => update({ defaultMode: e.target.value as 'practice' | 'exam' })}
              className="input w-full"
            >
              <option value="exam">Exam</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--text-secondary)]">Default Time (minutes)</label>
            <select
              value={settings.defaultTimeSeconds}
              onChange={e => update({ defaultTimeSeconds: parseInt(e.target.value) })}
              className="input w-full"
            >
              <option value="300">5</option>
              <option value="600">10</option>
              <option value="900">15</option>
              <option value="1200">20</option>
              <option value="1800">30</option>
              <option value="2700">45</option>
              <option value="3600">60</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--text-secondary)]">Default Question Count</label>
            <select
              value={settings.defaultQuestionCount}
              onChange={e => update({ defaultQuestionCount: parseInt(e.target.value) })}
              className="input w-full"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-semibold">Behavior</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoNextAfterAnswer}
              onChange={e => update({ autoNextAfterAnswer: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium">Auto-advance after answer</p>
              <p className="text-xs text-[var(--text-secondary)]">Automatically go to the next question after selecting an answer (exam mode only)</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showExplanationsInPractice}
              onChange={e => update({ showExplanationsInPractice: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium">Show explanations in practice mode</p>
              <p className="text-xs text-[var(--text-secondary)]">Display the correct answer and explanation immediately after answering</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.confirmBeforeSubmit}
              onChange={e => update({ confirmBeforeSubmit: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-medium">Confirm before submitting</p>
              <p className="text-xs text-[var(--text-secondary)]">Show a confirmation dialog before submitting the test</p>
            </div>
          </label>
        </div>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Keyboard size={18} className="text-[var(--accent)]" /> Keyboard Shortcuts Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Select Option A – F</span>
            <div className="flex gap-1">
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">A</kbd>
              <span className="text-[var(--text-secondary)]">to</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">F</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Select Option 1 – 6</span>
            <div className="flex gap-1">
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">1</kbd>
              <span className="text-[var(--text-secondary)]">to</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">6</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Previous / Next Question</span>
            <div className="flex gap-1">
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">←</kbd>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">→</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Flag / Unflag for Review</span>
            <div className="flex gap-1">
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">M</kbd>
              <span className="text-[var(--text-secondary)]">or</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">F</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Clear Selected Option</span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">C</kbd>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Close Dialog / Modal</span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--bg-hover)] border border-[var(--border)] font-mono text-xs">Esc</kbd>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5 space-y-4">
        <h2 className="font-semibold">Data Management</h2>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportBackup} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={15} /> Export Backup
          </button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm flex items-center gap-1.5">
              <Upload size={15} /> Import Backup
            </button>
          </div>
        </div>

        {importResult && (
          <div className={`p-3 rounded-lg text-sm ${importResult.includes('failed') || importResult.includes('Invalid') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {importResult}
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-4 space-y-2">
          <p className="text-sm font-medium text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Danger Zone
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmAction('resetSample')}
              className="btn-secondary text-sm flex items-center gap-1.5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
            >
              <RotateCcw size={14} /> Reset to Sample Questions ({sampleQuestions.length})
            </button>
            <button
              onClick={() => setConfirmAction('clearHistory')}
              className="btn-danger text-sm flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear Test History
            </button>
            <button
              onClick={() => setConfirmAction('clearQuestions')}
              className="btn-danger text-sm flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear Question Bank
            </button>
            <button
              onClick={() => setConfirmAction('resetAll')}
              className="btn-danger text-sm flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Reset Everything
            </button>
          </div>
        </div>
      </section>

      {/* Danger Confirm */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm Action" danger={confirmAction !== 'resetSample'}>
        <p className="text-sm mb-4">
          {confirmAction === 'resetSample' && `This will replace your current question bank with the ${sampleQuestions.length} default sample IQ questions. Any custom questions will be replaced unless previously exported.`}
          {confirmAction === 'clearHistory' && 'This will permanently delete all test history. This cannot be undone.'}
          {confirmAction === 'clearQuestions' && 'This will permanently delete all questions. This cannot be undone.'}
          {confirmAction === 'resetAll' && 'This will delete ALL data (questions, tests, settings). The page will reload. This cannot be undone.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirmAction(null)} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleDangerAction}
            className={confirmAction === 'resetSample' ? 'btn-primary text-sm' : 'btn-danger text-sm'}
          >
            {confirmAction === 'resetSample' ? 'Reset to Sample Questions' : 'Confirm Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
