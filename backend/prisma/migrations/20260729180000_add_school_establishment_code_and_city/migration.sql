ALTER TABLE "ecoles"
ADD COLUMN "code_etablissement" VARCHAR(30),
ADD COLUMN "ville" VARCHAR(100);

UPDATE "ecoles"
SET "ville" = COALESCE(NULLIF(TRIM("adresse"), ''), 'Non renseignée');

ALTER TABLE "ecoles"
ALTER COLUMN "ville" SET NOT NULL;
