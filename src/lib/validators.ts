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

const matriculePattern = /^[A-Za-z0-9-]{3,32}$/;

/**
 * Client-side allow-list validation for the student login flow.
 * This improves user feedback but does not replace server-side validation.
 */
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

  if (!matriculePattern.test(matricule.trim())) {
    return "Le matricule doit contenir de 3 à 32 caractères : lettres, chiffres ou tirets.";
  }

  if (password.length < 8 || password.length > 128) {
    return "Le mot de passe doit comporter entre 8 et 128 caractères.";
  }

  return null;
};
