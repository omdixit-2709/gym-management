import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { routes } from './routes/routes';
import { store } from './store';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <AuthProvider>
            <Suspense
              fallback={
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight="100vh"
                >
                  <CircularProgress />
                </Box>
              }
            >
              <Routes>
                {/* Redirect root to dashboard */}
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />

                {/* Public routes (login) */}
                {routes
                  .filter(route => !route.allowedRoles.length)
                  .map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={<route.component />}
                    />
                  ))}

                {/* Protected routes with DashboardLayout */}
                {routes
                  .filter(route => route.allowedRoles.length > 0)
                  .map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <ProtectedRoute allowedRoles={route.allowedRoles}>
                          <DashboardLayout>
                            <route.component />
                          </DashboardLayout>
                        </ProtectedRoute>
                      }
                    />
                  ))}

                {/* Catch all route */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Suspense>
          </AuthProvider>
          <ToastContainer />
        </Router>
      </LocalizationProvider>
    </Provider>
  );
};

export default App; 