import { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QuestionBank from './pages/QuestionBank';
import QuestionEditor from './pages/QuestionEditor';
import TestSetup from './pages/TestSetup';
import ActiveTest from './pages/ActiveTest';
import TestResultPage from './pages/TestResult';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { initializeStorage, getSettings, getQuestions } from './services/storage';
import type { TestConfig } from './types/test';
import type { ThemeMode } from './types/settings';

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

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageData, setPageData] = useState<Record<string, unknown>>({});
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);

  // Initialize
  useEffect(() => {
    initializeStorage();
    const settings = getSettings();
    applyTheme(settings.theme);
  }, []);

  const navigate = useCallback((page: string, data?: Record<string, unknown>) => {
    setCurrentPage(page as Page);
    setPageData(data || {});
    window.scrollTo(0, 0);
  }, []);

  const handleStartTest = useCallback((config: TestConfig) => {
    // Handle special modes: filter questions before starting
    const questions = getQuestions();
    let filteredConfig = { ...config };

    // If categories/difficulties arrays are empty, that means "all"
    // The ActiveTest createSession function handles the actual filtering

    setTestConfig(filteredConfig);
    setCurrentPage('activeTest');
  }, []);

  const handleTestFinish = useCallback((resultId: string) => {
    setTestConfig(null);
    setCurrentPage('testResult');
    setPageData({ resultId });
  }, []);

  const handleTestExit = useCallback(() => {
    setTestConfig(null);
    setCurrentPage('dashboard');
  }, []);

  const handleThemeChange = useCallback((theme: ThemeMode) => {
    applyTheme(theme);
  }, []);

  const isTestActive = currentPage === 'activeTest';

  return (
    <Layout currentPage={currentPage} onNavigate={navigate} hideNav={isTestActive}>
      {currentPage === 'dashboard' && (
        <Dashboard onNavigate={navigate} />
      )}
      {currentPage === 'questionBank' && (
        <QuestionBank onNavigate={navigate} />
      )}
      {currentPage === 'addQuestion' && (
        <QuestionEditor onNavigate={navigate} />
      )}
      {currentPage === 'editQuestion' && (
        <QuestionEditor
          questionId={pageData.questionId as string}
          onNavigate={navigate}
        />
      )}
      {currentPage === 'testSetup' && (
        <TestSetup onNavigate={navigate} onStartTest={handleStartTest} />
      )}
      {currentPage === 'activeTest' && testConfig && (
        <ActiveTest
          config={testConfig}
          onFinish={handleTestFinish}
          onExit={handleTestExit}
        />
      )}
      {currentPage === 'testResult' && (
        <TestResultPage
          resultId={pageData.resultId as string}
          onNavigate={navigate}
        />
      )}
      {currentPage === 'analytics' && (
        <Analytics onNavigate={navigate} />
      )}
      {currentPage === 'settings' && (
        <Settings onThemeChange={handleThemeChange} />
      )}
    </Layout>
  );
}
