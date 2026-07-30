ALTER TABLE "eleves"
DROP CONSTRAINT IF EXISTS "uq_eleve_matricule";

ALTER TABLE "eleves"
ADD CONSTRAINT "uq_eleve_matricule" UNIQUE ("matricule");
