import { BrowserRouter } from 'react-router';
import { SessionProvider } from './state/session.js';
import { MigrationPrompt } from './components/MigrationPrompt.js';
import { AppRoutes } from './routes.js';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        {/* One-time solo→cohort migration offer; self-gates on cohort mode. */}
        <MigrationPrompt />
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
