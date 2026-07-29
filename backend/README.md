# PointsNanga Backend

Backend NestJS pour l'API PointsNanga.

## Lancer en développement

```bash
npm install
npm run start:dev
```

L'API démarre par défaut sur :

```text
http://localhost:3000/api
```

## Endpoints disponibles

```text
POST /api/auth/login
GET  /api/schools
```

## Exemple login titulaire

```json
{
  "role": "teacher",
  "schoolName": "Lycée Saint-Michel",
  "matricule": "TIT-260001",
  "password": "secret"
}
```

## Variables d'environnement

Copier `.env.example` vers `.env` si besoin :

```bash
cp .env.example .env
```

## Base de données

La base PostgreSQL attendue s'appelle :

```text
pointsnanga
```

La première table Prisma est :

```text
superadmin
```

Après avoir créé la base PostgreSQL, lancer :

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init_superadmin
```

Avec Docker, PostgreSQL peut être lancé avec :

```bash
docker compose up -d
```

Le conteneur crée automatiquement la base `pointsnanga`.
