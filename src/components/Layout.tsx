import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  LayoutDashboard, BookOpen, PlusCircle, Play, BarChart3,
  Settings as SettingsIcon, ChevronLeft, Menu, X, Brain,
} from 'lucide-react';

type Page =
  | 'dashboard'
  | 'questionBank'
  | 'addQuestion'
  | 'editQuestion'
  | 'testSetup'
  | 'activeTest'
  | 'testResult'
  | 'analytics'
  | 'settings';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page, data?: Record<string, unknown>) => void;
  hideNav?: boolean;
}

const NAV_ITEMS: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'questionBank', label: 'Question Bank', icon: BookOpen },
  { page: 'addQuestion', label: 'Add Question', icon: PlusCircle },
  { page: 'testSetup', label: 'Start Test', icon: Play },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout({ children, currentPage, onNavigate, hideNav }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Brain size={22} className="text-[var(--accent)]" />
        <span className="font-semibold text-sm">IQ Practice</span>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-[var(--bg-surface)] border-r border-[var(--border)] 
          transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-[var(--border)]">
          <Brain size={26} className="text-[var(--accent)]" />
          <div>
            <h1 className="font-bold text-base leading-tight">IQ Practice</h1>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Personal Test Platform</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
            const active = currentPage === page ||
              (page === 'addQuestion' && currentPage === 'editQuestion');
            return (
              <button
                key={page}
                onClick={() => { onNavigate(page); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
