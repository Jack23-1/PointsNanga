-- =========================================================
-- BASE DE DONNÉES : pointsnanga
-- SGBD : PostgreSQL
-- =========================================================

-- À exécuter séparément si la base n'existe pas encore :
-- CREATE DATABASE pointsnanga;

-- Ensuite, se connecter à la base pointsnanga avant
-- d'exécuter le reste du script.

-- =========================================================
-- TYPES ENUM
-- =========================================================

CREATE TYPE statut_general AS ENUM (
    'ACTIF',
    'INACTIF'
);

CREATE TYPE statut_annee_scolaire AS ENUM (
    'PLANIFIEE',
    'EN_COURS',
    'CLOTUREE'
);

CREATE TYPE statut_compte AS ENUM (
    'ACTIF',
    'BLOQUE',
    'DESACTIVE'
);

CREATE TYPE statut_inscription AS ENUM (
    'INSCRIT',
    'TRANSFERE',
    'ABANDONNE',
    'EXCLU',
    'DIPLOME'
);

CREATE TYPE statut_resultat AS ENUM (
    'BROUILLON',
    'CALCULE',
    'PUBLIE',
    'VERROUILLE'
);

CREATE TYPE decision_resultat AS ENUM (
    'ADMIS',
    'AJOURNE',
    'ECHEC',
    'REDOUBLE',
    'DIPLOME'
);

CREATE TYPE mention_resultat AS ENUM (
    'INSUFFISANT',
    'PASSABLE',
    'SATISFACTION',
    'DISTINCTION',
    'GRANDE_DISTINCTION'
);

-- =========================================================
-- 1. ECOLES
-- =========================================================

CREATE TABLE ecoles (
    id_ecole BIGSERIAL PRIMARY KEY,
    nom_ecole VARCHAR(150) NOT NULL,
    code_ecole VARCHAR(30) NOT NULL UNIQUE,
    adresse VARCHAR(255),
    telephone VARCHAR(30),
    email VARCHAR(150) UNIQUE,
    logo VARCHAR(255),
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 2. ANNEES SCOLAIRES
-- =========================================================

CREATE TABLE annees_scolaires (
    id_annee_scolaire BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    libelle VARCHAR(20) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    est_active BOOLEAN NOT NULL DEFAULT FALSE,
    statut statut_annee_scolaire NOT NULL DEFAULT 'PLANIFIEE',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_annee_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_annee_ecole
        UNIQUE (id_ecole, libelle),

    CONSTRAINT chk_annee_dates
        CHECK (date_fin > date_debut)
);

CREATE INDEX idx_annees_ecole
    ON annees_scolaires(id_ecole);

-- Une seule année active par école
CREATE UNIQUE INDEX uq_annee_active_ecole
    ON annees_scolaires(id_ecole)
    WHERE est_active = TRUE;

-- =========================================================
-- 3. NIVEAUX
-- =========================================================

CREATE TABLE niveaux (
    id_niveau BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    ordre INTEGER NOT NULL,
    description TEXT,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_niveau_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_niveau_libelle
        UNIQUE (id_ecole, libelle),

    CONSTRAINT uq_niveau_ordre
        UNIQUE (id_ecole, ordre),

    CONSTRAINT chk_niveau_ordre
        CHECK (ordre > 0)
);

-- =========================================================
-- 4. OPTIONS SCOLAIRES
-- =========================================================

CREATE TABLE options_scolaires (
    id_option BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    code_option VARCHAR(30),
    description TEXT,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_option_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_option_libelle
        UNIQUE (id_ecole, libelle),

    CONSTRAINT uq_option_code
        UNIQUE (id_ecole, code_option)
);

-- =========================================================
-- 5. CLASSES
-- =========================================================

CREATE TABLE classes (
    id_classe BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    id_niveau BIGINT NOT NULL,
    id_option BIGINT,
    libelle VARCHAR(150) NOT NULL,
    code_classe VARCHAR(30) NOT NULL,
    capacite INTEGER,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_classe_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT fk_classe_niveau
        FOREIGN KEY (id_niveau)
        REFERENCES niveaux(id_niveau)
        ON DELETE RESTRICT,

    CONSTRAINT fk_classe_option
        FOREIGN KEY (id_option)
        REFERENCES options_scolaires(id_option)
        ON DELETE RESTRICT,

    CONSTRAINT uq_classe_code
        UNIQUE (id_ecole, code_classe),

    CONSTRAINT chk_classe_capacite
        CHECK (capacite IS NULL OR capacite > 0)
);

CREATE INDEX idx_classes_ecole
    ON classes(id_ecole);

CREATE INDEX idx_classes_niveau
    ON classes(id_niveau);

CREATE INDEX idx_classes_option
    ON classes(id_option);

-- =========================================================
-- 6. DIRECTEURS
-- =========================================================

CREATE TABLE directeurs (
    id_directeur BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    postnom VARCHAR(100),
    prenom VARCHAR(100) NOT NULL,
    sexe VARCHAR(20),
    telephone VARCHAR(30),
    email VARCHAR(150),
    code_connexion VARCHAR(50) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    doit_changer_mot_de_passe BOOLEAN NOT NULL DEFAULT TRUE,
    statut_compte statut_compte NOT NULL DEFAULT 'ACTIF',
    derniere_connexion TIMESTAMPTZ,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_directeur_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT
);

CREATE INDEX idx_directeurs_ecole
    ON directeurs(id_ecole);

-- =========================================================
-- 7. AFFECTATIONS DES DIRECTEURS
-- =========================================================

CREATE TABLE affectations_directeurs (
    id_affectation_directeur BIGSERIAL PRIMARY KEY,
    id_directeur BIGINT NOT NULL,
    id_ecole BIGINT NOT NULL,
    id_annee_scolaire BIGINT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    est_principal BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_affectation_directeur
        FOREIGN KEY (id_directeur)
        REFERENCES directeurs(id_directeur)
        ON DELETE RESTRICT,

    CONSTRAINT fk_affectation_directeur_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT fk_affectation_directeur_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_affectation_directeur
        UNIQUE (
            id_directeur,
            id_ecole,
            id_annee_scolaire
        ),

    CONSTRAINT chk_affectation_directeur_dates
        CHECK (
            date_fin IS NULL
            OR date_fin >= date_debut
        )
);

-- Un seul directeur principal par école et année
CREATE UNIQUE INDEX uq_directeur_principal_ecole_annee
    ON affectations_directeurs(
        id_ecole,
        id_annee_scolaire
    )
    WHERE est_principal = TRUE;

-- =========================================================
-- 8. PROFESSEURS
-- =========================================================

CREATE TABLE professeurs (
    id_professeur BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    matricule VARCHAR(50),
    nom VARCHAR(100) NOT NULL,
    postnom VARCHAR(100),
    prenom VARCHAR(100) NOT NULL,
    sexe VARCHAR(20),
    telephone VARCHAR(30),
    email VARCHAR(150),
    adresse VARCHAR(255),
    specialite VARCHAR(150),
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_professeur_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_professeur_matricule
        UNIQUE (id_ecole, matricule)
);

CREATE INDEX idx_professeurs_ecole
    ON professeurs(id_ecole);

-- =========================================================
-- 9. COURS
-- =========================================================

CREATE TABLE cours (
    id_cours BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    libelle VARCHAR(150) NOT NULL,
    code_cours VARCHAR(30),
    description TEXT,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cours_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_cours_libelle
        UNIQUE (id_ecole, libelle),

    CONSTRAINT uq_cours_code
        UNIQUE (id_ecole, code_cours)
);

CREATE INDEX idx_cours_ecole
    ON cours(id_ecole);

-- =========================================================
-- 10. COURS PAR CLASSE
-- Contient la pondération d'un cours dans une classe
-- pour une année scolaire déterminée.
-- =========================================================

CREATE TABLE cours_classes (
    id_cours_classe BIGSERIAL PRIMARY KEY,
    id_cours BIGINT NOT NULL,
    id_classe BIGINT NOT NULL,
    id_annee_scolaire BIGINT NOT NULL,
    ponderation NUMERIC(6,2) NOT NULL,
    volume_horaire INTEGER,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cours_classe_cours
        FOREIGN KEY (id_cours)
        REFERENCES cours(id_cours)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cours_classe_classe
        FOREIGN KEY (id_classe)
        REFERENCES classes(id_classe)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cours_classe_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_cours_classe_annee
        UNIQUE (
            id_cours,
            id_classe,
            id_annee_scolaire
        ),

    CONSTRAINT chk_ponderation_positive
        CHECK (ponderation > 0),

    CONSTRAINT chk_volume_horaire
        CHECK (
            volume_horaire IS NULL
            OR volume_horaire > 0
        )
);

CREATE INDEX idx_cours_classes_classe_annee
    ON cours_classes(id_classe, id_annee_scolaire);

-- =========================================================
-- 11. AFFECTATIONS DES PROFESSEURS
-- Un cours d'une classe est donné par un seul professeur
-- pendant une année scolaire.
-- =========================================================

CREATE TABLE affectations_professeurs (
    id_affectation_professeur BIGSERIAL PRIMARY KEY,
    id_professeur BIGINT NOT NULL,
    id_cours_classe BIGINT NOT NULL,
    id_annee_scolaire BIGINT NOT NULL,
    date_affectation DATE NOT NULL DEFAULT CURRENT_DATE,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_affectation_professeur
        FOREIGN KEY (id_professeur)
        REFERENCES professeurs(id_professeur)
        ON DELETE RESTRICT,

    CONSTRAINT fk_affectation_cours_classe
        FOREIGN KEY (id_cours_classe)
        REFERENCES cours_classes(id_cours_classe)
        ON DELETE RESTRICT,

    CONSTRAINT fk_affectation_professeur_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_professeur_cours_classe_annee
        UNIQUE (
            id_cours_classe,
            id_annee_scolaire
        )
);

CREATE INDEX idx_affectations_professeur
    ON affectations_professeurs(id_professeur);

-- =========================================================
-- 12. TITULAIRES
-- Le directeur nomme un professeur comme titulaire.
-- Son code de connexion et son mot de passe sont générés
-- par l'application.
-- =========================================================

CREATE TABLE titulaires (
    id_titulaire BIGSERIAL PRIMARY KEY,
    id_professeur BIGINT NOT NULL,
    id_classe BIGINT NOT NULL,
    id_annee_scolaire BIGINT NOT NULL,
    id_directeur_createur BIGINT NOT NULL,
    code_connexion VARCHAR(50) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    doit_changer_mot_de_passe BOOLEAN NOT NULL DEFAULT TRUE,
    statut_compte statut_compte NOT NULL DEFAULT 'ACTIF',
    derniere_connexion TIMESTAMPTZ,
    date_nomination DATE NOT NULL DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_titulaire_professeur
        FOREIGN KEY (id_professeur)
        REFERENCES professeurs(id_professeur)
        ON DELETE RESTRICT,

    CONSTRAINT fk_titulaire_classe
        FOREIGN KEY (id_classe)
        REFERENCES classes(id_classe)
        ON DELETE RESTRICT,

    CONSTRAINT fk_titulaire_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT fk_titulaire_directeur
        FOREIGN KEY (id_directeur_createur)
        REFERENCES directeurs(id_directeur)
        ON DELETE RESTRICT,

    CONSTRAINT uq_titulaire_classe_annee
        UNIQUE (
            id_classe,
            id_annee_scolaire
        ),

    CONSTRAINT uq_professeur_titulaire_classe_annee
        UNIQUE (
            id_professeur,
            id_classe,
            id_annee_scolaire
        )
);

CREATE INDEX idx_titulaires_professeur
    ON titulaires(id_professeur);

CREATE INDEX idx_titulaires_annee
    ON titulaires(id_annee_scolaire);

-- =========================================================
-- 13. ELEVES
-- =========================================================

CREATE TABLE eleves (
    id_eleve BIGSERIAL PRIMARY KEY,
    id_ecole BIGINT NOT NULL,
    matricule VARCHAR(50) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    postnom VARCHAR(100),
    prenom VARCHAR(100) NOT NULL,
    sexe VARCHAR(20),
    date_naissance DATE,
    lieu_naissance VARCHAR(150),
    adresse VARCHAR(255),
    nom_tuteur VARCHAR(200),
    telephone_tuteur VARCHAR(30),
    photo VARCHAR(255),
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_eleve_ecole
        FOREIGN KEY (id_ecole)
        REFERENCES ecoles(id_ecole)
        ON DELETE RESTRICT,

    CONSTRAINT uq_eleve_matricule
        UNIQUE (id_ecole, matricule)
);

CREATE INDEX idx_eleves_ecole
    ON eleves(id_ecole);

CREATE INDEX idx_eleves_nom
    ON eleves(nom, postnom, prenom);

-- =========================================================
-- 14. INSCRIPTIONS
-- Lie l'élève à une classe pour une année scolaire.
-- =========================================================

CREATE TABLE inscriptions (
    id_inscription BIGSERIAL PRIMARY KEY,
    id_eleve BIGINT NOT NULL,
    id_classe BIGINT NOT NULL,
    id_annee_scolaire BIGINT NOT NULL,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
    numero_ordre INTEGER,
    statut statut_inscription NOT NULL DEFAULT 'INSCRIT',
    observation TEXT,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_inscription_eleve
        FOREIGN KEY (id_eleve)
        REFERENCES eleves(id_eleve)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_classe
        FOREIGN KEY (id_classe)
        REFERENCES classes(id_classe)
        ON DELETE RESTRICT,

    CONSTRAINT fk_inscription_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_eleve_annee
        UNIQUE (
            id_eleve,
            id_annee_scolaire
        ),

    CONSTRAINT uq_numero_ordre_classe
        UNIQUE (
            id_classe,
            id_annee_scolaire,
            numero_ordre
        ),

    CONSTRAINT chk_numero_ordre
        CHECK (
            numero_ordre IS NULL
            OR numero_ordre > 0
        )
);

CREATE INDEX idx_inscriptions_classe_annee
    ON inscriptions(id_classe, id_annee_scolaire);

-- =========================================================
-- 15. PERIODES
-- =========================================================

CREATE TABLE periodes (
    id_periode BIGSERIAL PRIMARY KEY,
    id_annee_scolaire BIGINT NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    numero INTEGER NOT NULL,
    date_debut DATE,
    date_fin DATE,
    est_ouverte BOOLEAN NOT NULL DEFAULT FALSE,
    statut statut_general NOT NULL DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_periode_annee
        FOREIGN KEY (id_annee_scolaire)
        REFERENCES annees_scolaires(id_annee_scolaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_periode_numero
        UNIQUE (
            id_annee_scolaire,
            numero
        ),

    CONSTRAINT uq_periode_libelle
        UNIQUE (
            id_annee_scolaire,
            libelle
        ),

    CONSTRAINT chk_periode_numero
        CHECK (numero > 0),

    CONSTRAINT chk_periode_dates
        CHECK (
            date_fin IS NULL
            OR date_debut IS NULL
            OR date_fin >= date_debut
        )
);

-- =========================================================
-- 16. COTES
-- Le titulaire saisit une cote finale pour chaque cours,
-- chaque élève et chaque période.
-- =========================================================

CREATE TABLE cotes (
    id_cote BIGSERIAL PRIMARY KEY,
    id_inscription BIGINT NOT NULL,
    id_cours_classe BIGINT NOT NULL,
    id_periode BIGINT NOT NULL,
    id_titulaire BIGINT NOT NULL,
    cote_obtenue NUMERIC(6,2) NOT NULL,
    observation TEXT,
    date_saisie TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_cote_inscription
        FOREIGN KEY (id_inscription)
        REFERENCES inscriptions(id_inscription)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cote_cours_classe
        FOREIGN KEY (id_cours_classe)
        REFERENCES cours_classes(id_cours_classe)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cote_periode
        FOREIGN KEY (id_periode)
        REFERENCES periodes(id_periode)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cote_titulaire
        FOREIGN KEY (id_titulaire)
        REFERENCES titulaires(id_titulaire)
        ON DELETE RESTRICT,

    CONSTRAINT uq_cote_eleve_cours_periode
        UNIQUE (
            id_inscription,
            id_cours_classe,
            id_periode
        ),

    CONSTRAINT chk_cote_non_negative
        CHECK (cote_obtenue >= 0)
);

CREATE INDEX idx_cotes_inscription
    ON cotes(id_inscription);

CREATE INDEX idx_cotes_cours
    ON cotes(id_cours_classe);

CREATE INDEX idx_cotes_periode
    ON cotes(id_periode);

-- =========================================================
-- 17. RESULTATS
-- =========================================================

CREATE TABLE resultats (
    id_resultat BIGSERIAL PRIMARY KEY,
    id_inscription BIGINT NOT NULL,
    id_periode BIGINT NOT NULL,
    total_obtenu NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_ponderation NUMERIC(10,2) NOT NULL DEFAULT 0,
    pourcentage NUMERIC(6,2) NOT NULL DEFAULT 0,
    moyenne NUMERIC(6,2),
    rang INTEGER,
    mention mention_resultat,
    decision decision_resultat,
    statut statut_resultat NOT NULL DEFAULT 'BROUILLON',
    date_calcul TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_publication TIMESTAMPTZ,
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_resultat_inscription
        FOREIGN KEY (id_inscription)
        REFERENCES inscriptions(id_inscription)
        ON DELETE RESTRICT,

    CONSTRAINT fk_resultat_periode
        FOREIGN KEY (id_periode)
        REFERENCES periodes(id_periode)
        ON DELETE RESTRICT,

    CONSTRAINT uq_resultat_inscription_periode
        UNIQUE (
            id_inscription,
            id_periode
        ),

    CONSTRAINT chk_resultat_totaux
        CHECK (
            total_obtenu >= 0
            AND total_ponderation >= 0
        ),

    CONSTRAINT chk_resultat_pourcentage
        CHECK (
            pourcentage >= 0
            AND pourcentage <= 100
        ),

    CONSTRAINT chk_resultat_rang
        CHECK (
            rang IS NULL
            OR rang > 0
        )
);

CREATE INDEX idx_resultats_periode
    ON resultats(id_periode);

CREATE INDEX idx_resultats_rang
    ON resultats(rang);

-- =========================================================
-- FONCTION DE MISE À JOUR AUTOMATIQUE
-- DE date_mise_a_jour
-- =========================================================

CREATE OR REPLACE FUNCTION update_date_mise_a_jour()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_mise_a_jour = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- TRIGGERS date_mise_a_jour
-- =========================================================

CREATE TRIGGER trg_ecoles_update
BEFORE UPDATE ON ecoles
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_annees_update
BEFORE UPDATE ON annees_scolaires
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_niveaux_update
BEFORE UPDATE ON niveaux
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_options_update
BEFORE UPDATE ON options_scolaires
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_classes_update
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_directeurs_update
BEFORE UPDATE ON directeurs
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_professeurs_update
BEFORE UPDATE ON professeurs
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_cours_update
BEFORE UPDATE ON cours
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_cours_classes_update
BEFORE UPDATE ON cours_classes
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_titulaires_update
BEFORE UPDATE ON titulaires
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_eleves_update
BEFORE UPDATE ON eleves
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_inscriptions_update
BEFORE UPDATE ON inscriptions
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_periodes_update
BEFORE UPDATE ON periodes
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_cotes_update
BEFORE UPDATE ON cotes
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

CREATE TRIGGER trg_resultats_update
BEFORE UPDATE ON resultats
FOR EACH ROW
EXECUTE FUNCTION update_date_mise_a_jour();

-- =========================================================
-- VALIDATION D'UNE COTE
-- Vérifie que :
-- 1. la cote ne dépasse pas la pondération ;
-- 2. l'élève appartient à la même classe ;
-- 3. le titulaire dirige cette classe ;
-- 4. toutes les données concernent la même année scolaire.
-- =========================================================

CREATE OR REPLACE FUNCTION verifier_cote()
RETURNS TRIGGER AS $$
DECLARE
    v_ponderation NUMERIC(6,2);
    v_classe_cours BIGINT;
    v_annee_cours BIGINT;
    v_classe_eleve BIGINT;
    v_annee_eleve BIGINT;
    v_classe_titulaire BIGINT;
    v_annee_titulaire BIGINT;
    v_annee_periode BIGINT;
BEGIN
    SELECT
        ponderation,
        id_classe,
        id_annee_scolaire
    INTO
        v_ponderation,
        v_classe_cours,
        v_annee_cours
    FROM cours_classes
    WHERE id_cours_classe = NEW.id_cours_classe;

    SELECT
        id_classe,
        id_annee_scolaire
    INTO
        v_classe_eleve,
        v_annee_eleve
    FROM inscriptions
    WHERE id_inscription = NEW.id_inscription;

    SELECT
        id_classe,
        id_annee_scolaire
    INTO
        v_classe_titulaire,
        v_annee_titulaire
    FROM titulaires
    WHERE id_titulaire = NEW.id_titulaire;

    SELECT id_annee_scolaire
    INTO v_annee_periode
    FROM periodes
    WHERE id_periode = NEW.id_periode;

    IF NEW.cote_obtenue > v_ponderation THEN
        RAISE EXCEPTION
            'La cote % dépasse la pondération maximale %.',
            NEW.cote_obtenue,
            v_ponderation;
    END IF;

    IF v_classe_eleve <> v_classe_cours THEN
        RAISE EXCEPTION
            'L’élève ne se trouve pas dans la classe de ce cours.';
    END IF;

    IF v_classe_titulaire <> v_classe_eleve THEN
        RAISE EXCEPTION
            'Le titulaire ne dirige pas la classe de cet élève.';
    END IF;

    IF v_annee_cours <> v_annee_eleve
       OR v_annee_titulaire <> v_annee_eleve
       OR v_annee_periode <> v_annee_eleve THEN
        RAISE EXCEPTION
            'Les données ne correspondent pas à la même année scolaire.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verifier_cote
BEFORE INSERT OR UPDATE ON cotes
FOR EACH ROW
EXECUTE FUNCTION verifier_cote();

-- =========================================================
-- VUE : ELEVES DE CHAQUE TITULAIRE
-- =========================================================

CREATE VIEW vue_eleves_titulaires AS
SELECT
    t.id_titulaire,
    t.code_connexion,
    t.id_classe,
    t.id_annee_scolaire,
    i.id_inscription,
    e.id_eleve,
    e.matricule,
    e.nom,
    e.postnom,
    e.prenom,
    e.sexe,
    i.numero_ordre,
    i.statut AS statut_inscription
FROM titulaires t
JOIN inscriptions i
    ON i.id_classe = t.id_classe
    AND i.id_annee_scolaire = t.id_annee_scolaire
JOIN eleves e
    ON e.id_eleve = i.id_eleve;

-- =========================================================
-- VUE : COURS ET PONDERATIONS DU TITULAIRE
-- =========================================================

CREATE VIEW vue_cours_titulaires AS
SELECT
    t.id_titulaire,
    t.id_classe,
    t.id_annee_scolaire,
    cc.id_cours_classe,
    c.id_cours,
    c.libelle AS cours,
    c.code_cours,
    cc.ponderation,
    cc.volume_horaire
FROM titulaires t
JOIN cours_classes cc
    ON cc.id_classe = t.id_classe
    AND cc.id_annee_scolaire = t.id_annee_scolaire
JOIN cours c
    ON c.id_cours = cc.id_cours;

-- =========================================================
-- VUE : COTES DETAILLEES
-- =========================================================

CREATE VIEW vue_cotes_detaillees AS
SELECT
    co.id_cote,
    co.id_titulaire,
    i.id_inscription,
    e.id_eleve,
    e.matricule,
    e.nom,
    e.postnom,
    e.prenom,
    cl.id_classe,
    cl.libelle AS classe,
    c.id_cours,
    c.libelle AS cours,
    cc.ponderation,
    p.id_periode,
    p.libelle AS periode,
    co.cote_obtenue,
    co.observation,
    co.date_saisie
FROM cotes co
JOIN inscriptions i
    ON i.id_inscription = co.id_inscription
JOIN eleves e
    ON e.id_eleve = i.id_eleve
JOIN classes cl
    ON cl.id_classe = i.id_classe
JOIN cours_classes cc
    ON cc.id_cours_classe = co.id_cours_classe
JOIN cours c
    ON c.id_cours = cc.id_cours
JOIN periodes p
    ON p.id_periode = co.id_periode;