export const APP_NAME = 'PointsNanga';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROUTES = {
  LOGIN: '/login',
  SUPER_ADMIN_LOGIN: '/admin/login',
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
  GRADES: '/grades',
  RESULTS: '/results',
  BULLETINS: '/bulletins',
  SETTINGS: '/settings',
} as const;

export const ROLE_ROUTES = {
  super_admin: ['/dashboard', '/schools', '/settings'],
  director: ['/dashboard', '/students', '/classes', '/teachers', '/courses', '/homeroom-teachers', '/course-assignments', '/results', '/settings'],
  teacher: ['/dashboard', '/grades', '/results'],
  student: ['/dashboard', '/results', '/bulletins'],
} as const;
