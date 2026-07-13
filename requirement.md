USER REQUIREMENTS DOCUMENT (URD)
Voici le document complet en texte, structuré pour pouvoir être donné directement à un agent IA de développement. J’ai intégré toutes les règles métier que nous avons définies.

# USER REQUIREMENTS DOCUMENT (URD)

# Plateforme web de gestion, calcul et publication des résultats scolaires en ligne

**Version : 1.0**
**Type : Application web multi-écoles**
**Architecture cible : React + TypeScript + Node.js + PostgreSQL + Cloud**

---

# 1. DESCRIPTION GENERALE DU PROJET

## 1.1 Contexte

Le projet consiste à développer une plateforme web permettant aux établissements scolaires de gérer leurs résultats académiques en ligne.

La plateforme permettra :

* à chaque école de créer son espace ;
* de gérer ses élèves, enseignants, classes et matières ;
* aux titulaires d'encoder les notes ;
* aux directions/préfets de contrôler et valider les résultats ;
* au Super Administrateur de contrôler la publication des résultats ;
* aux élèves et parents de consulter les résultats via un accès sécurisé.

L'objectif est de remplacer les systèmes manuels (papier, fichiers Excel isolés) par une solution centralisée, sécurisée et évolutive.

---

# 2. OBJECTIFS DU SYSTEME

## Objectif principal

Créer une plateforme centralisée permettant la gestion complète du cycle des résultats scolaires :

```
Création école
       ↓
Configuration académique
       ↓
Enregistrement élèves
       ↓
Encodage notes
       ↓
Validation direction
       ↓
Autorisation publication
       ↓
Consultation élève/parent
```

---

# 3. ARCHITECTURE GENERALE

## Architecture technique

### Frontend

Technologies :

* React
* TypeScript

Responsabilités :

* interfaces utilisateurs ;
* tableaux de bord ;
* formulaires ;
* tableaux d'encodage ;
* affichage résultats.

---

### Backend

Technologies :

* Node.js
* Architecture recommandée : NestJS

Responsabilités :

* logique métier ;
* authentification ;
* calculs ;
* gestion des permissions ;
* API REST.

---

### Base de données

Technologie :

* PostgreSQL

Stockage :

* écoles ;
* élèves ;
* utilisateurs ;
* notes ;
* résultats ;
* historiques.

---

### Hébergement

Infrastructure :

* Serveur Cloud.

Services :

* serveur application ;
* base PostgreSQL ;
* stockage fichiers ;
* sauvegardes automatiques.

---

# 4. ACTEURS DU SYSTEME

# 4.1 Super Administrateur

Le Super Administrateur est le gestionnaire principal de la plateforme.

Il possède une vision globale.

## Fonctionnalités

Il peut :

* créer une école ;
* modifier une école ;
* consulter toutes les écoles ;
* voir tous les élèves ;
* consulter les résultats ;
* gérer les publications ;
* contrôler les accès aux résultats ;
* consulter les statistiques générales.

---

## Tableau de bord Super Administrateur

Informations visibles :

* nombre total d'écoles ;
* nombre total d'élèves ;
* nombre total d'enseignants ;
* nombre de classes ;
* résultats par école ;
* taux de réussite global ;
* périodes publiées ;
* élèves autorisés à consulter.

---

# 4.2 Direction / Préfet

Ces deux fonctions sont regroupées dans un seul rôle.

## Responsabilités

* administrer l'école ;
* configurer le système scolaire ;
* gérer les utilisateurs ;
* valider les résultats.

## Permissions

Peut :

* créer les classes ;
* créer les matières ;
* enregistrer les enseignants ;
* désigner les titulaires ;
* voir tous les résultats ;
* valider ou rejeter les notes.

---

# 4.3 Titulaire

Le titulaire est le seul enseignant ayant un compte.

## Responsabilités

* gérer sa classe ;
* encoder les notes ;
* envoyer les résultats au préfet.

## Accès

Il voit uniquement :

* ses classes ;
* ses élèves ;
* les matières associées ;
* les périodes ouvertes.

---

# 4.4 Enseignants

Les enseignants n'ont pas de compte.

Ils sont uniquement enregistrés comme informations administratives.

Informations :

* nom ;
* prénom ;
* matières enseignées ;
* classes concernées.

---

# 4.5 Élèves

Chaque élève possède :

* matricule ;
* mot de passe.

Connexion :

```
Matricule + Mot de passe
```

Fonctions :

* consulter résultats ;
* consulter bulletins ;
* consulter historique.

---

# 4.6 Parents

Les parents utilisent les mêmes identifiants que leurs enfants.

Ils peuvent :

* consulter les résultats ;
* télécharger les bulletins.

---

# 5. GESTION DES ECOLES

Chaque école possède son propre espace isolé.

## Informations école

Obligatoires :

* nom officiel ;
* adresse ;
* province ;
* ville ;
* logo ;
* directeur ;
* téléphone ;
* email.

Le nombre d'élèves est calculé automatiquement.

---

# 6. GESTION DE LA STRUCTURE SCOLAIRE

Une école peut avoir :

* plusieurs sections ;
* plusieurs options ;
* plusieurs classes.

Exemples :

```
Section secondaire

Option Scientifique
    3e Scientifique A
    3e Scientifique B

Option Littéraire
    3e Littéraire A

Option Pédagogique
    3e Pédagogique B
```

---

# 7. GESTION DES ANNEES SCOLAIRES

Le système doit gérer plusieurs années.

Exemple :

* 2025-2026
* 2026-2027

Chaque année possède ses propres :

* élèves ;
* classes ;
* résultats ;
* bulletins.

---

# 8. GESTION DES PERIODES

Chaque école configure librement son calendrier.

Exemple :

```
Première période

Deuxième période

Premier semestre
(examen semestre)

Troisième période

Quatrième période

Deuxième semestre
(examen semestre)

Fin d'année
```

Le système ne doit pas imposer une structure fixe.

---

# 9. GESTION DES MATIERES

Chaque école crée ses propres matières.

Exemple :

Scientifique :

* Mathématiques
* Physique
* Chimie
* Informatique

Littéraire :

* Français
* Philosophie
* Latin
* Histoire

Une matière peut dépendre d'une option.

---

# 10. CONFIGURATION DES NOTES

Chaque école définit :

* les barèmes ;
* les évaluations ;
* les pondérations.

Aucune règle fixe n'est imposée.

---

Exemple :

Mathématiques :

* Interrogation : /20
* Devoir : /30
* Examen : /50

Total :

/100

---

# 11. CALCUL DES RESULTATS

Le calcul utilise :

```
Total notes obtenues
-------------------------
Total barèmes possibles
```

Puis :

```
Résultat = pourcentage
```

Exemple :

Math : 15/20

Français : 25/30

Anglais : 40/50

Total :

80/100

Résultat :

80%

---

# 12. CLASSEMENT

Le classement est effectué :

* uniquement par classe ;
* jamais par option.

Le système classe selon la moyenne générale.

---

## Gestion des égalités

La comparaison se fait avec plusieurs décimales.

Exemple :

Élève A :

78,4567 %

Élève B :

78,4521 %

Classement :

A devant B.

---

# 13. ENCODAGE DES NOTES

Le titulaire dispose d'un tableau :

| Élève | Math | Français | Anglais |
| ----- | ---- | -------- | ------- |
| Jean  |      |          |         |
| Paul  |      |          |         |

Après saisie :

* calcul automatique ;
* sauvegarde ;
* soumission.

---

# 14. VALIDATION DES RESULTATS

Cycle :

```
Titulaire
↓
Encodage
↓
Soumission
↓
Préfet
↓
Validation
```

Après validation :

* les notes sont verrouillées.

Modification possible uniquement après autorisation du préfet.

---

# 15. PUBLICATION DES RESULTATS EN LIGNE

## Principe

La validation par l'école ne rend pas automatiquement les résultats visibles.

Le Super Administrateur doit autoriser la publication.

---

Cycle :

```
Résultats validés

        ↓

Super Administrateur

        ↓

Activation publication

        ↓

Autorisation élèves

        ↓

Consultation
```

---

# 16. GESTION DES ACCES ELEVES

Par défaut :

Tous les élèves sont bloqués.

Interface :

| Élève | Autorisé |
| ----- | -------- |
| Jean  | ☐        |
| Paul  | ☐        |
| Marie | ☐        |

---

Actions :

* cocher un élève ;
* décocher un élève ;
* sélectionner tous ;
* désélectionner tous.

---

Si coché :

L'élève voit ses résultats.

Si décoché :

L'élève ne voit rien.

---

L'autorisation peut être modifiée à tout moment.

---

# 17. BULLETINS NUMERIQUES

Le système génère un bulletin PDF contenant :

* logo école ;
* identité élève ;
* classe ;
* matières ;
* notes ;
* moyennes ;
* classement ;
* appréciation ;
* signatures ;
* QR Code.

---

# 18. QR CODE

Chaque bulletin possède un QR Code unique.

Le scan permet :

* vérifier l'authenticité ;
* afficher les résultats.

---

# 19. ARCHIVAGE HISTORIQUE

Le système conserve :

* toutes les années scolaires ;
* toutes les classes fréquentées ;
* tous les bulletins ;
* toutes les notes.

Un élève peut être retrouvé même après plusieurs années.

---

# 20. ARCHITECTURE DES PAGES

# Super Administrateur

Pages :

* Connexion
* Dashboard global
* Liste écoles
* Détails école
* Liste élèves
* Résultats écoles
* Publication résultats
* Gestion accès élèves
* Statistiques
* Historique actions

---

# Direction / Préfet

Pages :

* Dashboard école
* Configuration école
* Années scolaires
* Sections
* Options
* Classes
* Matières
* Enseignants
* Titulaires
* Élèves
* Validation résultats
* Statistiques

---

# Titulaire

Pages :

* Connexion
* Dashboard classe
* Liste élèves
* Encodage notes
* Calcul résultats
* Soumission

---

# Élève

Pages :

* Connexion
* Dashboard personnel
* Résultats disponibles
* Bulletin PDF
* Historique

---

# 21. ARCHITECTURE BASE DE DONNEES POSTGRESQL

## schools

```
id
name
address
province
city
logo
director
phone
email
created_at
```

---

## users

```
id
username
password_hash
role
school_id
created_at
```

---

## students

```
id
school_id
matricule
firstname
lastname
gender
birth_date
photo
class_id
```

---

## teachers

```
id
school_id
firstname
lastname
```

---

## classes

```
id
school_id
name
section
option
academic_year_id
```

---

## subjects

```
id
school_id
name
```

---

## teacher_subject_class

```
teacher_id
subject_id
class_id
```

---

## periods

```
id
school_id
name
type
academic_year_id
```

---

## evaluations

```
id
subject_id
period_id
name
maximum_score
weight
```

---

## grades

```
id
student_id
evaluation_id
score
```

---

## results

```
id
student_id
period_id
average
rank
```

---

## publications

```
id
school_id
period_id
status
created_by
```

---

## student_result_access

```
id
student_id
publication_id
authorized
updated_at
```

---

## audit_logs

```
id
user_id
action
date
```

---

# 22. EXIGENCES DE SECURITE

Le système doit garantir :

* authentification sécurisée ;
* mots de passe cryptés ;
* contrôle des rôles ;
* isolation des écoles ;
* journalisation ;
* sauvegardes automatiques ;
* protection des bulletins.

---

# 23. OBJECTIF FINAL

Construire une plateforme nationale ou multi-écoles capable de gérer plusieurs milliers d'utilisateurs avec :

* une gestion académique personnalisable ;
* un moteur de calcul flexible ;
* une publication contrôlée ;
* une consultation sécurisée ;
* un historique complet du parcours scolaire.

---

Ce document peut servir de base directement à un agent IA de développement pour générer :

* l'architecture backend ;
* les modèles PostgreSQL ;
* les APIs ;
* les interfaces React ;
* les modules complets.
