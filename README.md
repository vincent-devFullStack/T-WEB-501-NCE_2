📌 T-WEB-501-NCE_2 – Job Board
✅ Changements récents

Depuis les derniers commits, voici ce qui a été ajouté :

Base de données en ligne (MariaDB / MySQL hébergée)

Plus besoin de lancer un serveur MySQL local (XAMPP, MAMP…).

Connexion via server/db.js avec les credentials dans .env.

Système d’authentification complet (JWT + cookies sécurisés)

Routes API créées :

POST /api/auth/login → connexion avec email + mot de passe

POST /api/auth/logout → déconnexion (clear cookie)

GET /api/auth/me → récupération des infos de l’utilisateur connecté

Middleware requireAuth qui vérifie la validité du token.

Routes entreprises et annonces reliées à la base

GET /api/ads → liste des annonces

GET /api/companies → liste des entreprises

Frontend statique (public/)

index.html : navbar dynamique selon le rôle (admin, recruteur, candidat)

Pages de test : login.html, ads.html, profil.html

Git cleanup

Ajout d’un .gitignore propre (node_modules, .env, fichiers temporaires, dumps SQL).

Suppression des fichiers parasites (cli.js, nodemon.js, etc.).

⚡ Mettre à jour votre dépôt local

Si vous avez déjà cloné le repo :

git fetch origin
git pull origin main
npm install

⚠️ Si vous avez des conflits, gardez la version distante (celle du repo GitHub).

🔑 Identifiants de test

Des comptes de test sont déjà disponibles dans la base :

Admin

Email : admin@example.com

MDP : admin123

Recruteur

Email : alice@technova.com

MDP : recruteur123

▶️ Lancer le projet

Installer les dépendances :

npm install

Créer un fichier .env à la racine avec :

DB_HOST=xxx
DB_USER=xxx
DB_PASSWORD=xxx
DB_NAME=job_advertisements

JWT_SECRET=supersecret
JWT_EXPIRES=1d
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

Lancer le serveur :

node server/server.js

Le serveur démarre sur http://localhost:3000
🚀

🔜 Prochaines étapes (travail pour demain)

Maintenant que :

la base de données est en place,

les routes API sont fonctionnelles (auth, annonces, entreprises),

une première page index.html est disponible,

il reste à développer :

🎨 Frontend à compléter

Créer les pages principales dans public/ :

login.html → formulaire de connexion

signup.html → formulaire d’inscription

profil.html → page candidat (infos + candidatures)

ads.html → liste et détails des annonces via /api/ads

entreprise.html → liste des entreprises via /api/companies

dashboard.html → interface admin

Mettre en place le CSS global (public/style/main.css) :

Harmoniser la navbar, les boutons et la mise en page

Rendre le site responsive (mobile + desktop)

Relier le frontend au backend via JS (public/js/) :

Exemple : fetch("/api/auth/login") dans login.html

Afficher dynamiquement la navbar selon le rôle utilisateur

🧪 Tests à faire

Vérifier la connexion avec les identifiants de test

Vérifier la déconnexion via /api/auth/logout

Vérifier que /api/auth/me retourne bien l’utilisateur connecté

🚀 Plan de travail proposé pour demain

👉 Répartition possible (à discuter dans le groupe) :

Frontend structure (HTML + CSS de base)

Connexion Login + Logout reliés au backend

Page annonces (ads.html) avec affichage dynamique

Page entreprises (entreprise.html)

Dashboard admin (priorité secondaire)

📋 Roadmap projet (lien avec le PDF officiel)

Step 01 : Base de données (companies, people, ads, applications, logs) → ✅

Step 02 : Front de base → index.html déjà commencé → à finaliser avec CSS

Step 03 : Bouton “learn more” → détails d’une annonce via fetch → à faire

Step 04 : API CRUD complète (Create/Update/Delete) → seulement partiel → à compléter

Step 05 : Bouton Apply sur chaque annonce → formulaire + insertion en DB → à faire

Step 06 : Authentification complète (login, register, update profil) → login ok, reste signup/profil → à faire

Step 07 : Page Admin (dashboard) → CRUD global + pagination → à faire

Step 08 : Finition design (CSS propre, responsive) → à faire

📖 Exemples pratiques
🔐 Exemple – Connexion (login.html + login.js)

public/login.html :

<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Connexion</title>
</head>
<body>
  <h1>Connexion</h1>
  <form id="loginForm">
    <input type="email" name="email" placeholder="Email" required>
    <input type="password" name="password" placeholder="Mot de passe" required>
    <button type="submit">Se connecter</button>
  </form>

  <script src="/js/login.js"></script>
</body>
</html>

public/js/login.js :

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
e.preventDefault();
const data = Object.fromEntries(new FormData(form));

try {
const res = await fetch("/api/auth/login", {
method: "POST",
headers: { "Content-Type": "application/json" },
credentials: "include", // IMPORTANT pour cookie JWT
body: JSON.stringify(data)
});

    if (res.ok) {
      alert("Connexion réussie !");
      window.location.href = "/index.html";
    } else {
      const err = await res.json();
      alert("Erreur : " + err.error);
    }

} catch (e) {
console.error(e);
alert("Impossible de se connecter");
}
});

📢 Exemple – Affichage des annonces (ads.html + ads.js)

public/ads.html :

<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Offres d'emploi</title>
</head>
<body>
  <h1>Liste des annonces</h1>
  <ul id="adsList"></ul>

  <script src="/js/ads.js"></script>
</body>
</html>

public/js/ads.js :

(async function loadAds() {
try {
const res = await fetch("/api/ads", { credentials: "include" });
const ads = await res.json();

    const list = document.getElementById("adsList");
    list.innerHTML = ads.map(ad => `
      <li>
        <h3>${ad.job_title}</h3>
        <p>${ad.company_name} – statut : ${ad.status}</p>
        <button onclick="alert('TODO: afficher détails de l\'annonce ${ad.ad_id}')">
          Learn more
        </button>
      </li>
    `).join("");

} catch (e) {
console.error(e);
document.getElementById("adsList").innerHTML = "<li>Impossible de charger les annonces</li>";
}
})();

👉 Ces exemples montrent :

comment se connecter et recevoir le cookie JWT,

comment charger les annonces depuis /api/ads,

et comment préparer le bouton "Learn more" (Step 03 du projet).
