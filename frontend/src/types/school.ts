export interface School {
  id: string;
  name: string;
  code: string;
  establishmentCode?: string | null;
  address: string;
  city: string;
  phone: string;
  logo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolFormData {
  name: string;
  establishmentCode?: string;
  address: string;
  city: string;
  phone: string;
  isActive?: boolean;
}
