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

## 2. Détail étape par étape

> ⚠️ Chaque étape dépend de la précédente : vérifiez les prérequis avant de passer à la suivante.  
> ✅ Tous les éléments listés ci-dessous sont présents dans le dépôt et testés sur l’instance locale (`npm run dev`).

### Étape 1 – Base de données SQL

- **Livrables** : `schema.sql`, `src/config/db.js`, `.env.example` (variables nécessaires).
- **Ce que fait le code** : crée les tables `advertisements`, `companies`, `people`, `applications`, `application_logs` et configure un pool MySQL (Trim des envs pour éviter les espaces accidentels).
- **Test local** : `mysql < schema.sql`, puis `npm run dev` → vérifier dans la console `[DB] Connection OK`.

### Étape 2 – Liste d’offres (page d’accueil)

- **Livrables** : `src/views/home.ejs`, `src/public/js/load-jobs.js`, `src/public/style/main.css`.
- **Fonctionnalités** : affichage des 9 offres les plus récentes avec bouton “En savoir plus”.
- **Test local** : ouvrir `http://localhost:3000/`, vérifier la pagination automatique (une seule carte ouverte à la fois).

### Étape 3 – Détails dynamiques (“En savoir plus”)

- **Livrables** : `src/public/js/load-jobs.js`, `src/public/js/ads-list.js`.
- **Fonctionnalités** : ouverture/fermeture des détails via fetch AJAX, gestion accordéon (une carte ouverte).
- **Test local** : cliquer successivement sur plusieurs “En savoir plus”, vérifier qu’une seule section reste déployée.

### Étape 4 – API REST

- **Livrables** : routes `src/routes/api.ads.js`, `src/routes/api.admin.js`, modèle `src/models/Ad.js`.
- **Fonctionnalités** : endpoints GET/POST/PATCH/DELETE pour annonces, candidatures, tables admin, notifications recruteur.
- **Test local** : `curl http://localhost:3000/api/ads` ou via Postman, vérifier les statuts 200/401/403.

### Étape 5 – Candidature

- **Livrables** : formulaires `src/views/ads/list.ejs`, `src/views/partials/applyForm.ejs`, script `src/public/js/apply-form.js`, route `/api/ads/:id/apply`.
- **Fonctionnalités** : candidature rapide (connecté ou invité), upload CV Cloudinary, réouverture des candidatures refusées.
- **Test local** : soumettre une candidature, vérifier l’enregistrement en base (`applications`).

### Étape 6 – Authentification & auto-remplissage

- **Livrables** : `src/controllers/authController.js`, `src/routes/api.auth.js`, middleware `src/middleware/auth.js`, script `src/public/js/login.js`.
- **Fonctionnalités** : JWT en cookie HttpOnly, navbar contextualisée, formulaire pré-rempli pour utilisateurs connectés.
- **Test local** : créer un compte via `/auth/signup`, vérifier la persistance du cookie et le préremplissage des informations.

### Étape 7 – Dashboard administrateur

- **Livrables** : `src/views/dashboard.ejs`, `src/public/js/admin-dashboard.js`, styles `src/public/style/dashboard.css`, API `/api/admin/*`.
- **Fonctionnalités** : CRUD générique (people, companies, advertisements, applications), pagination, tri, modals, authentification `admin`.
- **Test local** : se connecter avec un compte `admin`, créer/éditer une annonce, vérifier la mise à jour instantanée.

### Étape 8 – UX / UI & responsive

- **Livrables** : `src/public/style/*`, scripts navbar (`src/public/js/navbar.js`), favicon fallback, gestion CORS/Vercel.
- **Fonctionnalités** : thèmes dynamiques, navbar responsive corrigée, pagination “Toutes les offres”, fallback favicon, CORS auto pour `*.vercel.app`.
- **Test local** : réduire la fenêtre en mode mobile, contrôler la mise en page, vérifier l’absence d’erreurs console.

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

Pour toute contribution, suivez le style de code existant (ESM + async/await) et n’oubliez pas d’actualiser ce README si vous ajoutez de nouvelles étapes ou scénarios de test.

## 6. Lien démo

Démo Vercel: https://t-web-501-nce-2-mqe14h21u-vincent-silvestris-projects.vercel.app/
