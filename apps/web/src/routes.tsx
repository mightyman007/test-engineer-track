import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { ContentProvider } from './lib/content-context.js';

// Pages for Tasks 11-15 are imported here as they land:
// TrackPage, ModulePage, LessonPage, QuizPage, FlashcardsPage,
// ExamPage, ExamReportPage, LoginPage, AdminPage.
export function AppRoutes() {
  return (
    <ContentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {/* added in Tasks 11-15 */}
        </Routes>
      </Layout>
    </ContentProvider>
  );
}
