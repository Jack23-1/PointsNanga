import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, LoginCredentials } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const persistUser = (userData: User) => {
  try {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('last_role', userData.role);
  } catch {
    // The authenticated session remains usable when browser storage is blocked.
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUserFromStorage = () => {
      const storedUser = localStorage.getItem('user');

      if (!storedUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      }
      setIsLoading(false);
    };

    syncUserFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user') {
        syncUserFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { user: userData } = response.data;

    persistUser(userData);
    setUser(userData);
  };

  const logout = () => {
    void api.post('/auth/logout');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    persistUser(userData);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
