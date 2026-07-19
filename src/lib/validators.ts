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

/** Validation du formulaire élève après résolution automatique du matricule. */
export const getStudentLoginValidationError = ({
  matricule,
  period,
  password,
  isSearchingStudent,
  isStudentResolved,
}: {
  matricule: string;
  period: string;
  password: string;
  isSearchingStudent: boolean;
  isStudentResolved: boolean;
}): string | null => {
  if (!/^\d{6}$/.test(matricule)) {
    return "Le matricule doit contenir exactement 6 chiffres.";
  }

  if (isSearchingStudent) {
    return "La recherche de l’élève est encore en cours.";
  }

  if (!isStudentResolved) {
    return "Aucun élève n’a été identifié avec ce matricule.";
  }

  if (!period) {
    return "Sélectionnez une période scolaire.";
  }

  if (!password) {
    return "Saisissez votre mot de passe.";
  }

  return null;
};
