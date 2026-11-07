import { BrowserRouter } from 'react-router';
import { SessionProvider } from './state/session.js';
import { AppRoutes } from './routes.js';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
