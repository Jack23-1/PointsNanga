export const APP_NAME = 'PointsNanga';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROUTES = {
  LOGIN: '/login',
  SUPER_ADMIN_LOGIN: '/admin/login',
  SUPER_ADMIN_RESET_PASSWORD: '/admin/reset-password',
  DIRECTOR_LOGIN: '/director/login',
  HOMEROOM_LOGIN: '/titulaire/login',
  DASHBOARD: '/dashboard',
  SCHOOLS: '/schools',
  STUDENTS: '/students',
  CLASSES: '/classes',
  TEACHERS: '/teachers',
  COURSES: '/courses',
  HOMEROOM_TEACHERS: '/homeroom-teachers',
  COURSE_ASSIGNMENTS: '/course-assignments',
  SCHOOL_YEARS: '/school-years',
  DELETION_REQUESTS: '/deletion-requests',
  GRADES: '/grades',
  RESULTS: '/results',
  BULLETINS: '/bulletins',
  SETTINGS: '/settings',
} as const;

export const ROLE_ROUTES = {
  super_admin: ['/dashboard', '/schools', '/deletion-requests', '/settings'],
  director: ['/dashboard', '/students', '/classes', '/teachers', '/courses', '/homeroom-teachers', '/course-assignments', '/school-years', '/results', '/settings'],
  teacher: ['/dashboard', '/grades', '/results'],
  student: ['/dashboard', '/results', '/bulletins'],
} as const;

export const getLoginRouteForRole = (role?: string) => {
  if (role === 'super_admin') return ROUTES.SUPER_ADMIN_LOGIN;
  if (role === 'director') return ROUTES.DIRECTOR_LOGIN;
  if (role === 'teacher') return ROUTES.HOMEROOM_LOGIN;
  return ROUTES.LOGIN;
};
