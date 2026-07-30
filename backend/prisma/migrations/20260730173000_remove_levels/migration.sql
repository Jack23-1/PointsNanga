ALTER TABLE "classes"
DROP CONSTRAINT IF EXISTS "fk_classe_niveau";

DROP INDEX IF EXISTS "idx_classes_niveau";

ALTER TABLE "classes"
DROP COLUMN IF EXISTS "id_niveau";

DROP TABLE IF EXISTS "niveaux";
