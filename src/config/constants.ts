export const APP_NAME = 'PointsNanga';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SCHOOLS: '/schools',
  STUDENTS: '/students',
  GRADES: '/grades',
  RESULTS: '/results',
  BULLETINS: '/bulletins',
  SETTINGS: '/settings',
} as const;

export const ROLE_ROUTES = {
  super_admin: ['/dashboard', '/schools', '/settings'],
  director: ['/dashboard', '/students', '/results', '/settings'],
  teacher: ['/dashboard', '/grades', '/results'],
  student: ['/dashboard', '/results', '/bulletins'],
} as const;
