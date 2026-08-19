# Sécurité et exploitation en production

- Terminer TLS sur un proxy inverse maintenu (HTTPS uniquement), puis transmettre vers `127.0.0.1:3000`.
- Définir `NODE_ENV=production`, une URL frontend HTTPS exacte, un secret JWT aléatoire d’au moins 32 caractères et des mots de passe distincts. Ne jamais versionner `.env`.
- Utiliser un rôle PostgreSQL dédié sans privilèges superutilisateur. Ne pas exposer le port PostgreSQL sur Internet.
- Exécuter `npx prisma migrate deploy` avant chaque mise en production avec une sauvegarde vérifiée.
- Sauvegarder quotidiennement avec `pg_dump --format=custom`, chiffrer les archives, les copier hors site et tester une restauration au moins chaque trimestre.
- Conserver 7 sauvegardes quotidiennes, 4 hebdomadaires et 12 mensuelles selon les obligations locales.
- Centraliser les logs en production, restreindre leur accès et ne jamais journaliser cookies, JWT, mots de passe, corps de requête ou données médicales/scolaires sensibles.
- Pour plusieurs instances API, remplacer le stockage mémoire du rate limiter par Redis.
- Faire tourner `npm audit`, les builds et les tests avant chaque déploiement. Examiner séparément toute mise à niveau majeure de Prisma.
