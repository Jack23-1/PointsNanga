import { createBrowserRouter, Navigate } from "react-router-dom";
import { getLoginRouteForRole, ROUTES } from "./constants";
import Login from "../features/auth/pages/Login";
import SuperAdminLogin from "../features/auth/pages/SuperAdminLogin";
import SuperAdminResetPassword from "../features/auth/pages/SuperAdminResetPassword";
import DirectorLogin from "../features/auth/pages/DirectorLogin";
import HomeroomTeacherLogin from "../features/auth/pages/HomeroomTeacherLogin";
import MainLayout from "../components/layout/MainLayout";
import SuperAdminDashboard from "../features/dashboard/super-admin/Dashboard";
import DirectorDashboard from "../features/dashboard/director/Dashboard";
import TeacherDashboard from "../features/dashboard/teacher/Dashboard";
import StudentDashboard from "../features/dashboard/student/Dashboard";
import SchoolsPage from "../features/schools/pages/SchoolsPage";
import GradesPage from "../features/grades/pages/GradesPage";
import StudentsPage from "../features/students/pages/StudentsPage";
import AcademicDirectoryPage from "../features/management/pages/AcademicDirectoryPage";
import SchoolYearsPage from "../features/management/pages/SchoolYearsPage";
import DeletionRequestsPage from "../features/management/pages/DeletionRequestsPage";
import GradeApprovalsPage from "../features/management/pages/GradeApprovalsPage";
import { useAuth } from "../hooks/useAuth";

// Placeholder pages - will be replaced with actual feature pages
const ResultsPage = () => <StudentDashboard />;
const BulletinsPage = () => <div>Bulletins</div>;
const SettingsPage = () => <div>Settings</div>;

const DashboardPage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div />;
  }

  switch (user?.role) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "director":
      return <DirectorDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    default:
      return <div>Dashboard</div>;
  }
};

const ProtectedRoute = ({
  children,
  allowedRoles,
  primarySuperAdminOnly = false,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  primarySuperAdminOnly?: boolean;
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div />;
  }

  if (!user?.role) {
    const lastRole = localStorage.getItem("last_role") ?? undefined;
    return <Navigate to={getLoginRouteForRole(lastRole)} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  if (
    primarySuperAdminOnly &&
    !(user as { hasFullAccess?: boolean }).hasFullAccess
  ) {
    return (
      <Navigate to={`${ROUTES.DASHBOARD}?workspace=grades`} replace />
    );
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
    path: ROUTES.SUPER_ADMIN_RESET_PASSWORD,
    element: <SuperAdminResetPassword />,
  },
  {
    path: ROUTES.DIRECTOR_LOGIN,
    element: <DirectorLogin />,
  },
  {
    path: ROUTES.HOMEROOM_LOGIN,
    element: <HomeroomTeacherLogin />,
  },
  {
    path: "/",
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
      <ProtectedRoute
        allowedRoles={["super_admin"]}
        primarySuperAdminOnly
      >
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
    path: ROUTES.CLASSES,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <AcademicDirectoryPage kind="classes" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.TEACHERS,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <AcademicDirectoryPage kind="teachers" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.COURSES,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <AcademicDirectoryPage kind="courses" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.HOMEROOM_TEACHERS,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <AcademicDirectoryPage kind="homeroom" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.SCHOOL_YEARS,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <SchoolYearsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.GRADE_APPROVALS,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <GradeApprovalsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.COURSE_ASSIGNMENTS,
    element: (
      <ProtectedRoute allowedRoles={["director"]}>
        <AcademicDirectoryPage kind="assignments" />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.DELETION_REQUESTS,
    element: (
      <ProtectedRoute allowedRoles={["super_admin"]}>
        <DeletionRequestsPage />
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
