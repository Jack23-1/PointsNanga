import { randomInt } from "node:crypto";

const LETTERS = "ABCDEFGHIJKLMNPQRSTUVWXYZ";

export const generateStudentMatricule = () => {
  const letters = Array.from(
    { length: 3 },
    () => LETTERS[randomInt(LETTERS.length)],
  ).join("");
  const digits = Array.from({ length: 4 }, () => randomInt(1, 10)).join("");

  return `${letters}-${digits}`;
};

export const normalizeStudentMatricule = (value: string) => {
  const compact = value.trim().toUpperCase().replace(/-/g, "");

  if (/^[A-NP-Z]{3}[1-9]{4}$/.test(compact)) {
    return `${compact.slice(0, 3)}-${compact.slice(3)}`;
  }

  return value.trim().toUpperCase();
};
