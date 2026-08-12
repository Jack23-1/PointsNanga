ALTER TABLE "professeurs"
ADD COLUMN "mot_de_passe_hash" TEXT,
ADD COLUMN "doit_changer_mot_de_passe" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "statut_compte" "statut_compte" NOT NULL DEFAULT 'ACTIF',
ADD COLUMN "derniere_connexion" TIMESTAMPTZ(6);

ALTER TABLE "cotes" ALTER COLUMN "id_titulaire" DROP NOT NULL;
ALTER TABLE "cotes" ADD COLUMN "id_professeur_saisie" BIGINT;
ALTER TABLE "cotes" ADD CONSTRAINT "fk_cote_professeur_saisie"
FOREIGN KEY ("id_professeur_saisie") REFERENCES "professeurs"("id_professeur") ON UPDATE NO ACTION;
CREATE INDEX "idx_cotes_professeur_saisie" ON "cotes"("id_professeur_saisie");

UPDATE "professeurs" p
SET
  "matricule" = t."code_connexion",
  "mot_de_passe_hash" = t."mot_de_passe_hash",
  "doit_changer_mot_de_passe" = t."doit_changer_mot_de_passe",
  "statut_compte" = t."statut_compte",
  "derniere_connexion" = t."derniere_connexion"
FROM "titulaires" t
WHERE t."id_professeur" = p."id_professeur";

CREATE UNIQUE INDEX "uq_professeur_matricule_global"
ON "professeurs"("matricule") WHERE "matricule" IS NOT NULL;

UPDATE "cotes" c
SET "id_professeur_saisie" = t."id_professeur"
FROM "titulaires" t
WHERE c."id_titulaire" = t."id_titulaire";
