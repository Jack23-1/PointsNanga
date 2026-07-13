import React, { createContext, useContext, useState, ReactNode } from 'react';
import { School } from '../types';

interface SchoolContextType {
  currentSchool: School | null;
  setCurrentSchool: (school: School | null) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);

  const value: SchoolContextType = {
    currentSchool,
    setCurrentSchool,
  };

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
