export type UserRole = 'super_admin' | 'director' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string;
  schoolLogo?: string | null;
  hasFullAccess?: boolean;
  classId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}
