import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './theme.jsx';
import ProtectedLayout, { RequireAuth } from './components/ProtectedLayout.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ThresholdsPage = lazy(() => import('./pages/ThresholdsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<Box className="full-screen-state"><CircularProgress aria-label="Carregando página" /></Box>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<ProtectedLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route element={<RequireAuth roles={['admin', 'operador']} />}>
                <Route path="/limiares" element={<ThresholdsPage />} />
              </Route>
              <Route element={<RequireAuth roles={['admin']} />}>
                <Route path="/usuarios" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}
