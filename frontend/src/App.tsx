import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import LoginPage from './pages/LoginPage';
import JobsPage from './pages/JobsPage';
import MyJobsPage from './pages/MyJobsPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Admin', 'Dispatcher']}>
                  <JobsPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-jobs"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Driver']}>
                  <MyJobsPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['Admin']}>
                  <UsersPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
