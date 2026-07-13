import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from './constants';
import Login from '../features/auth/pages/Login';
import SuperAdminLogin from '../features/auth/pages/SuperAdminLogin';
import MainLayout from '../components/layout/MainLayout';
import SuperAdminDashboard from '../features/dashboard/super-admin/Dashboard';
import DirectorDashboard from '../features/dashboard/director/Dashboard';
import TeacherDashboard from '../features/dashboard/teacher/Dashboard';
import StudentDashboard from '../features/dashboard/student/Dashboard';

// Placeholder pages - will be replaced with actual feature pages
const SchoolsPage = () => <div>Schools</div>;
const StudentsPage = () => <div>Students</div>;
const GradesPage = () => <div>Grades</div>;
const ResultsPage = () => <div>Results</div>;
const BulletinsPage = () => <div>Bulletins</div>;
const SettingsPage = () => <div>Settings</div>;

const DashboardPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'director':
      return <DirectorDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <div>Dashboard</div>;
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <MainLayout>{children}</MainLayout>;
};

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  {
    path: ROUTES.SUPER_ADMIN_LOGIN,
    element: <SuperAdminLogin />,
  },
  {
    path: '/',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SCHOOLS,
    element: (
      <ProtectedRoute>
        <SchoolsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.STUDENTS,
    element: (
      <ProtectedRoute>
        <StudentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.GRADES,
    element: (
      <ProtectedRoute>
        <GradesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.RESULTS,
    element: (
      <ProtectedRoute>
        <ResultsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.BULLETINS,
    element: (
      <ProtectedRoute>
        <BulletinsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
]);
