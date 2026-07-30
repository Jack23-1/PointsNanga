ALTER TABLE "superadmin"
ADD COLUMN "has_full_access" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "superadmin"
SET "has_full_access" = TRUE
WHERE "email" = 'elpulgabakole@gmail.com';
