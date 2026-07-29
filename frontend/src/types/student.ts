export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  schoolId: string;
  classId: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  enrollmentDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  schoolId: string;
  classId: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
}
