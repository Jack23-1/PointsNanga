import { useAuth as useAuthContext } from '../context/AuthContext';
import { UserRole } from '../types';

export const useAuth = () => {
  return useAuthContext();
};

export const usePermissions = () => {
  const { user } = useAuthContext();

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  const isSuperAdmin = () => hasRole('super_admin');
  const isDirector = () => hasRole('director');
  const isTeacher = () => hasRole('teacher');
  const isStudent = () => hasRole('student');

  return {
    hasRole,
    isSuperAdmin,
    isDirector,
    isTeacher,
    isStudent,
  };
};
