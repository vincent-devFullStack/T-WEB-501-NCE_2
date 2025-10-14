# Job Board – Documentation de conformité

Ce dépôt implémente un job board complet conforme au cahier des charges fourni.  
Vous trouverez ci‑dessous un récapitulatif des fonctionnalités et la marche à suivre pour exécuter le projet en local.

## 1. Architecture et prérequis

- **Base de données** : MySQL (voir `schema.sql`). Les tables exigées sont présentes : `advertisements`, `companies`, `people`, `applications`, ainsi que `application_logs` pour tracer l’historique.
- **Serveur** : Node.js ≥ 18 + Express, rendu côté serveur avec EJS.
- **Front-end** : HTML/CSS/JS vanilla servi depuis `src/public`.
- **API** : routes REST sous `/api/*`, incluant `/api/admin/*` pour le CRUD administrateur.

### Installation

```bash
npm install
```

Configurer la base via le fichier `.env` (exemple fourni dans le projet). Le script `schema.sql` permet de recréer la structure minimale si besoin.

### Lancement en local

```bash
npm run dev
```

Le serveur écoute par défaut sur `http://localhost:3000`.

## 2. Correspondance avec les étapes du cahier des charges

| Étape | Exigence | Implémentation |
|-------|----------|----------------|
| 1 | BDD SQL avec tables annonces / entreprises / personnes / candidatures / logs | `schema.sql`, `src/config/db.js` |
| 2 | Page listant plusieurs offres (titre, résumé, bouton) | `src/views/home.ejs`, `src/public/js/load-jobs.js` |
| 3 | Bouton “En savoir plus” affiche les détails sans rechargement | `src/public/js/ads-list.js` |
| 4 | API REST CRUD + “learn more” branché sur l’API | `/api/ads`, `/api/admin`, `ads-list.js` |
| 5 | Bouton “Apply” enregistrant la candidature | Formulaires `ads/list.ejs`, `partials/applyForm.ejs`, route `/api/ads/:id/apply` |
| 6 | Authentification + auto-remplissage | `/auth/*`, middleware `requireAuth`, scripts `login.js`, `apply-form.js` |
| 7 | Dashboard admin sécurisé avec CRUD + pagination | `src/views/dashboard.ejs`, `src/public/js/admin-dashboard.js`, `/api/admin/*` |
| 8 | Finitions UI | Styles sous `src/public/style/*`, badges, dropdowns, responsive |

## 3. Tests effectués

Tests manuels exécutés sur environnement local :

- Création de comptes (candidat, recruteur, admin), connexion/déconnexion.
- Navigation entre les pages publiques (`/`, `/ads`, `/entreprise`), vérification du “En savoir plus”.
- Soumission de candidature (connecté et invité) — y compris pré-remplissage des champs.
- Vérification du dashboard admin : pagination, création / édition / suppression sur chaque table via l’interface et inspection des retours API.

> Aucun test automatisé n’est fourni ; la validation repose sur ces scénarios manuels. Ajoutez vos propres tests si nécessaire avant déploiement.

## 4. Commandes utiles

- `npm run dev` : démarre le serveur Express avec rechargement.
- `npm run seed:demo` : insère des données de démonstration (nécessite variables Cloudinary si l’upload est activé).

## 5. Notes complémentaires

- Le dashboard admin n’est accessible qu’aux utilisateurs `admin` (login requis).
- Les formulaires “Candidature rapide” et “Postuler” utilisent désormais le champ `full_name` attendu par l’API.
- Le projet repose sur des fonctionnalités Cloudinary pour l’envoi de CV : configurez `CLOUDINARY_*` dans `.env` ou adaptez la route d’upload.

Pour toute contribution, suivez le style de code existant (ESM + async/await) et n’oubliez pas d’actualiser ce README si vous ajoutez de nouvelles étapes.
