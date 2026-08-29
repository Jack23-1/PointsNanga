export const APP_NAME = "PointsNanga";
export const API_URL = import.meta.env.VITE_API_URL || "/api";

export const ROUTES = {
  LOGIN: "/login",
  SUPER_ADMIN_LOGIN: "/admin/login",
  SUPER_ADMIN_RESET_PASSWORD: "/admin/reset-password",
  DIRECTOR_LOGIN: "/director/login",
  TEACHER_LOGIN: "/enseignant/login",
  HOMEROOM_LOGIN: "/enseignant/login",
  DASHBOARD: "/dashboard",
  SCHOOLS: "/schools",
  STUDENTS: "/students",
  CLASSES: "/classes",
  TEACHERS: "/teachers",
  COURSES: "/courses",
  HOMEROOM_TEACHERS: "/homeroom-teachers",
  COURSE_ASSIGNMENTS: "/course-assignments",
  SCHOOL_YEARS: "/school-years",
  ACADEMIC_LIBRARY: "/academic-library",
  GRADE_APPROVALS: "/grade-approvals",
  ORDERED_STUDENTS: "/ordered-students",
  DELETION_REQUESTS: "/deletion-requests",
  GRADES: "/grades",
  TEACHER_COURSES: "/mes-cotes",
  RESULTS: "/results",
  BULLETINS: "/bulletins",
  SETTINGS: "/settings",
} as const;

export const ROLE_ROUTES = {
  super_admin: ["/dashboard", "/schools", "/deletion-requests", "/settings"],
  director: [
    "/dashboard",
    "/students",
    "/classes",
    "/teachers",
    "/courses",
    "/homeroom-teachers",
    "/course-assignments",
    "/school-years",
    "/academic-library",
    "/grade-approvals",
    "/ordered-students",
    "/results",
    "/settings",
  ],
  teacher: ["/dashboard", "/grades", "/mes-cotes", "/results"],
  student: ["/dashboard", "/results", "/bulletins"],
} as const;

export const getLoginRouteForRole = (role?: string) => {
  if (role === "super_admin") return ROUTES.SUPER_ADMIN_LOGIN;
  if (role === "director") return ROUTES.DIRECTOR_LOGIN;
  if (role === "teacher") return ROUTES.TEACHER_LOGIN;
  return ROUTES.LOGIN;
};
