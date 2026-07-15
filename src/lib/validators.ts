export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/** Validation minimale du formulaire élève : aucun plafond de caractères côté interface. */
export const getStudentLoginValidationError = ({
  schoolName,
  className,
  matricule,
  password,
}: {
  schoolName: string;
  className: string;
  matricule: string;
  password: string;
}): string | null => {
  if (!schoolName || !className) {
    return "Sélectionnez une école et une classe valides.";
  }

  if (!matricule.trim()) {
    return "Saisissez votre matricule.";
  }

  if (!password) {
    return "Saisissez votre mot de passe.";
  }

  return null;
};
