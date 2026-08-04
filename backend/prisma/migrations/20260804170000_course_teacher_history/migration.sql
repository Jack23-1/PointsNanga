ALTER TABLE "affectations_professeurs"
ADD COLUMN "date_fin" DATE,
ADD COLUMN "motif_remplacement" VARCHAR(500);

ALTER TABLE "affectations_professeurs"
DROP CONSTRAINT "uq_professeur_cours_classe_annee";

CREATE INDEX "idx_professeur_cours_classe_annee"
ON "affectations_professeurs"("id_cours_classe", "id_annee_scolaire");

CREATE UNIQUE INDEX "uq_professeur_cours_classe_annee_actif"
ON "affectations_professeurs"("id_cours_classe", "id_annee_scolaire")
WHERE "statut" = 'ACTIF';
