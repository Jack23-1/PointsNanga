export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  directorId: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  directorId: string;
  city: string;
  country: string;
}
