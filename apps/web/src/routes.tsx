import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { TrackPage } from './pages/TrackPage.js';
import { ModulePage } from './pages/ModulePage.js';
import { LessonPage } from './pages/LessonPage.js';
import { QuizPage } from './pages/QuizPage.js';
import { ExamPage } from './pages/ExamPage.js';
import { ExamReportPage } from './pages/ExamReportPage.js';
import { FlashcardsPage } from './pages/FlashcardsPage.js';
import { ContentProvider } from './lib/content-context.js';

// Remaining Task 14-15 pages are imported here as they land:
// LoginPage, AdminPage.
export function AppRoutes() {
  return (
    <ContentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/track/:trackId" element={<TrackPage />} />
          <Route path="/module/:moduleId" element={<ModulePage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/quiz/:moduleId" element={<QuizPage />} />
          <Route path="/exam/:examId" element={<ExamPage />} />
          <Route path="/exam/:examId/report/:attemptId" element={<ExamReportPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/flashcards/:moduleId" element={<FlashcardsPage />} />
          {/* added in Tasks 14-15 */}
        </Routes>
      </Layout>
    </ContentProvider>
  );
}
