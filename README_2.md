# Job Board – Guide Débutant

Ce document complète le README principal. Il explique, pas à pas et sans jargon inutile, comment fonctionne l’application : architecture, fichiers importants, échanges front/back et lien avec la base de données. L’objectif est que toute personne débutante puisse naviguer dans le code et l’exécuter en toute confiance.

---

## 1. Résumé du projet

- **Type d’application** : un job board (site d’offres d’emploi) en Node.js.
- **Fonctionnement général** :  
  1. L’utilisateur arrive sur le site.  
  2. Le serveur Express renvoie des pages HTML rendues avec EJS.  
  3. Du JavaScript côté navigateur rend les pages interactives (ouverture des détails, formulaire, etc.).  
  4. Les actions (connexion, candidature, CRUD admin) passent par des routes API.  
  5. Les données sont stockées dans MySQL.

---

## 2. Schéma d’architecture simplifié

```
Navigateur (HTML + CSS + JS)
        │
        │ requêtes HTTP (pages & API)
        ▼
Serveur Express (Node.js)
  - routes SSR (pages EJS)
  - routes API (/api/…)
  - middleware d’authentification
        │
        │ requêtes SQL
        ▼
Base de données MySQL
  - tables advertisements, companies, people, applications, application_logs
```

---

## 3. Organisation des dossiers

| Dossier | Rôle |
|---------|------|
| `src/app.js` | Point d’entrée du serveur Express. Configure CORS, middlewares, routes, favicon, etc. |
| `src/routes/` | Toutes les routes : pages (`ads.js`, `index.js`, `auth.js`, `profile.js`) et API (`api.*.js`). |
| `src/views/` | Templates EJS rendus côté serveur. Sous-dossiers `ads`, `auth`, `partials`, `layouts`. |
| `src/public/` | Fichiers statiques envoyés au navigateur : CSS dans `style/`, JS dans `js/`, images dans `images/`. |
| `src/models/` | Accès à la base de données (requêtes MySQL centralisées). |
| `src/middleware/` | Fonctions s’intercalant dans le traitement des requêtes (authentification notamment). |
| `src/config/db.js` | Création du pool MySQL et helpers. |
| `schema.sql` | Script SQL pour créer la base et les tables. |

---

## 4. Fichiers clés expliqués

### 4.1 Serveur : `src/app.js`
- charge les variables d’environnement (`dotenv`).
- crée l’application Express.
- configure CORS : autorise les origines déclarées + domaine Vercel.
- ajoute des middlewares : JSON, URL-encoded, cookies, favicon fallback.
- vérifie la connexion MySQL avec `assertDbConnection()`.
- enregistre les routes SSR (`/`, `/ads`, `/auth`, `/profil`) et les routes API (`/api/ads`, `/api/auth`, `/api/admin`, `/api/account`).
- gère les erreurs (404 et 500).

### 4.2 Modèle de données : `src/models/*.js`
- `Ad.js` : toutes les requêtes SQL liées aux annonces (liste paginée, détails, création, update, suppression).
- `Application.js` : manipule les candidatures (création, mise à jour, comptages, validations).
- `User.js` : gère les utilisateurs (recherche par email, création, update, contexte recruteur, etc.).
- `Company.js` : opérations sur les entreprises (recherche par nom, rattachement à un utilisateur).
- `AdminRepository.js` : générique, transforme une configuration décrivant une table admin en requêtes SQL.
- `System.js` : ping rapide pour `/healthz`.

Chaque modèle utilise `pool.query` fourni par `db.js`, ce qui centralise la connexion et évite de répéter la configuration SSL ou timezone.

### 4.3 Routes principales

- `src/routes/index.js` : home, page entreprises, page candidat connecté (`/mes-candidatures`), dash admin SSR.  
  - Utilise surtout les modèles `Company` et `Application`.
- `src/routes/ads.js` : toutes les pages autour des offres (liste publique paginée à 9 items, création, édition, my-ads, etc.).  
  - S’appuie sur `Ad`, `Application`, `User`.
- `src/routes/api.ads.js` : tout ce qui touche aux offres côté API : notifications, détails JSON, candidature `POST /api/ads/:id/apply`, suppression, changement de statut.  
  - Utilise `Ad`, `Application`, `User`, `multer` pour l’upload (Cloudinary).
- `src/routes/api.auth.js` : login/register/logout et route `/api/auth/me` utilisée par la navbar.  
  - Retourne un JWT stocké en cookie HttpOnly.
- `src/routes/api.admin.js` : API générique pour le dashboard admin.  
  - Vérifie le rôle `admin` puis délègue à `AdminRepository`.
- `src/routes/api.account.js` : modification des informations du profil connecté (profil et entreprise rattachée).
- `src/routes/profile.js` : page profil SSR.

---

## 5. Flux front / back typiques

### 5.1 Page “Toutes les offres” (`/ads`)
1. Express rend `src/views/ads/list.ejs` avec 9 offres (page 1 par défaut).
2. Le navigateur charge `src/public/js/ads-list.js`.
3. Quand l’utilisateur clique sur “En savoir plus”, `ads-list.js` :
   - appelle `GET /api/ads/:id` pour obtenir les détails,
   - insère la section détails et masque celles des autres cartes (accordéon),
   - propose un bouton “Candidature rapide” qui envoie une requête `POST /api/ads/:id/apply` avec `FormData`.
4. La pagination change la page via le paramètre `?page=...` et Express recalcule `limit/offset`.

### 5.2 Candidature rapide (utilisateur invité)
1. Soumission du formulaire → `ads-list.js` ou `load-jobs.js` envoie le `FormData`.
2. Route `POST /api/ads/:id/apply` :
   - vérifie que l’offre est active (`Ad.findActiveById`),
   - cherche un utilisateur existant par email. Sinon, crée un compte candidat minimal (`User.ensureCandidateByEmail`),
   - crée ou réactive la candidature (`Application.createOrReapply`),
   - stocke le CV sur Cloudinary si uploadé,
   - renvoie `{ ok: true }`.

### 5.3 Navbar dynamique
1. Le template `layouts/main.ejs` inclut `<script type="module" src="/js/navbar.js"></script>`.
2. `navbar.js` appelle `/api/auth/me`.
3. Selon la réponse, il affiche :  
   - les boutons “Se connecter / S’inscrire” (non connecté),  
   - ou le menu personnalisé (liens supplémentaires + bouton “Déconnexion”),  
   - ajoute la classe `mode-<role>` sur `<body>` pour changer les couleurs.

### 5.4 Dashboard admin
1. Route SSR `/dashboard` renvoie `dashboard.ejs` avec la configuration des tables.
2. `admin-dashboard.js` interroge `/api/admin/<table>?page=1...` pour afficher les lignes.
3. Les modals de création/édition utilisent l’API `POST/PATCH /api/admin/<table>`.
4. Suppression via `DELETE /api/admin/<table>/<id>`.

---

## 6. Focus sur la base de données

| Table | Utilisation |
|-------|-------------|
| `people` | utilisateurs : candidats, recruteurs, admins (`person_type`) |
| `companies` | entreprises (rattachées aux recruteurs) |
| `advertisements` | annonces (statut `active`, `brouillon`, `fermee`) |
| `applications` | candidatures (statut `recu`, `a_appeler`, etc.) |
| `application_logs` | journal (non exploité dans l’interface mais prêt pour des évolutions) |

Les requêtes sont écrites à la main (pas d’ORM). Avantage : contrôle précis et performances maîtrisées.

---

## 7. Variables d’environnement

À renseigner dans `.env` (ou variables Vercel) :

| Nom | Description |
|-----|-------------|
| `PORT` | Port HTTP (3000 par défaut). |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL`, `DB_POOL_SIZE`, `DB_TZ` | Connexion MySQL. `db.js` supprime les espaces accidentels. |
| `JWT_SECRET`, `JWT_EXPIRES` | Signature des JWT. |
| `CORS_ORIGINS` | Liste séparée par des virgules (ex. `http://localhost:3000,http://127.0.0.1:3000`). Le code ajoute automatiquement le domaine `*.vercel.app`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Stockage des CV. |

---

## 8. Conseils pour un débutant

1. **Installer les dépendances** : `npm install`.  
2. **Configurer `.env`** à partir de `.env.example`.  
3. **Créer la base** : importer `schema.sql` dans MySQL.  
4. **Lancer** : `npm run dev`.  
5. **Tester** :  
   - `http://localhost:3000/` : home + offres récentes,  
   - `http://localhost:3000/ads` : toutes les offres (pagination),  
   - `http://localhost:3000/auth/login` : login,  
   - `http://localhost:3000/dashboard` : nécessite un compte admin (changer `person_type` à la main si besoin).
6. **Lire le code progressivement** :  
   - Commencer par `app.js` pour comprendre l’ordre des middlewares.  
   - Explorer les routes (`src/routes/...`) en parallèle des modèles (`src/models/...`).  
   - Ouvrir les scripts front correspondants (`src/public/js/...`) pour voir comment les pages deviennent interactives.
7. **Modifier une fonctionnalité** :  
   - Chercher la route et le modèle concernés,  
   - Adapter le template ou le script front,  
   - Tester côté navigateur + base de données.

---

## 9. Ressources utiles pour approfondir

- [Documentation Express](https://expressjs.com/fr/) – comprendre middlewares et routes.  
- [Guide MySQL (W3Schools)](https://www.w3schools.com/mysql/) – réviser les requêtes SQL.  
- [EJS](https://ejs.co/) – syntaxe des templates côté serveur.  
- [Cloudinary Docs](https://cloudinary.com/documentation) – gestion des uploads si besoin d’un autre provider.  
- [MDN Fetch API](https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch) – pour comprendre les appels AJAX dans `navbar.js`, `load-jobs.js` et `ads-list.js`.

---

## 10. Checklist finale avant livraison

- [x] Variables d’environnement renseignées (`DB_*`, `JWT_*`, `CLOUDINARY_*`).  
- [x] Base recréée avec `schema.sql`.  
- [x] Serveur lancé (`npm run dev`) sans message d’erreur.  
- [x] Tests manuels faits (connexion, candidature, dashboard).  
- [x] Fichiers statiques accessibles (`/js/navbar.js`, `/style/main.css`, favicon).  
- [x] README principal + ce guide déposés dans le rendu.

Ce guide devrait vous permettre de comprendre et modifier le projet sereinement. Bonne exploration !
