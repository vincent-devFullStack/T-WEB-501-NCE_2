// public/js/navbar.js

// --- Helpers API pour fetch sécurisés ---
const api = {
  async get(url) {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// --- Gestion du thème par rôle ---
const ROLE_CLASSES = [
  "mode-public",
  "mode-candidat",
  "mode-recruteur",
  "mode-admin",
];

function clearRoleTheme() {
  ROLE_CLASSES.forEach((cls) => document.body.classList.remove(cls));
}

function applyRoleTheme(role) {
  clearRoleTheme();
  document.body.dataset.role = role || "";
  switch (role) {
    case "candidat":
      document.body.classList.add("mode-candidat");
      break;
    case "recruteur":
      document.body.classList.add("mode-recruteur");
      break;
    case "admin":
      document.body.classList.add("mode-admin");
      break;
    default:
      document.body.classList.add("mode-public");
  }
}

// --- Navbar ---
export async function buildNavbar() {
  const el = document.getElementById("navbar");

  // éviter un flash de thème
  applyRoleTheme(null);

  let user = null;
  try {
    const res = await api.get("/api/auth/me");
    user = res.user;
  } catch {
    // non connecté
  }

  // applique le thème selon le rôle
  applyRoleTheme(user?.role);

  if (!user) {
    el.innerHTML = `
      <a href="/" class="logo">
        <img src="/images/logo.png" alt="Logo">
      </a>
      <ul class="nav-links">
        <li><a href="/">Accueil</a></li>
      </ul>
      <div class="nav-actions">
        <a class="btn" href="/login.html">Se connecter</a>
        <a class="btn btn-secondary" href="/signup.html">S'inscrire</a>
      </div>`;
    return;
  }

  const displayName =
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "Mon compte";

  let roleLinks = "";
  if (user.role === "candidat") {
    roleLinks = `
      <li><a href="/">Accueil</a></li>
      <li><a href="/profil.html">Trouver un job</a></li>
      <li><a href="/entreprise.html">Trouver une entreprise</a></li>`;
  } else if (user.role === "recruteur") {
    roleLinks = `
      <li><a href="/">Accueil</a></li>
      <li><a href="/gestion.html">Publier des offres</a></li>
      <li><a href="/candidats.html">Trouver des candidats</a></li>`;
  } else if (user.role === "admin") {
    roleLinks = `
      <li><a href="/">Accueil</a></li>
      <li><a href="/dashboard.html">Dashboard Admin</a></li>
      <li><a href="/profil.html">Trouver un job</a></li>
      <li><a href="/entreprise.html">Trouver une entreprise</a></li>
      <li><a href="/candidats.html">Trouver des candidats</a></li>
      <li><a href="/offres-publiees.html">Offres publiées</a></li>`;
  }

  el.innerHTML = `
    <a href="/" class="logo">
      <img src="/images/logo.png" alt="Logo">
    </a>
    <ul class="nav-links">${roleLinks}</ul>
    <div class="nav-actions">
      <div class="dropdown">
        <button class="dropbtn" aria-haspopup="true" aria-expanded="false">${displayName}</button>
        <div class="dropdown-content">
          <a href="/profil.html">Informations personnelles</a>
          ${
            user.role === "candidat"
              ? '<a href="/mes-candidatures.html">Mes candidatures</a>'
              : ""
          }
          ${
            user.role !== "candidat"
              ? '<a href="/mes-offres.html">Mes offres</a>'
              : ""
          }
          <button id="logoutBtn" class="linklike">Déconnexion</button>
        </div>
      </div>
    </div>`;

  // Gestion du dropdown au clic
  const dropdown = el.querySelector(".dropdown");
  const dropbtn = el.querySelector(".dropbtn");

  dropbtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
    dropbtn.setAttribute("aria-expanded", dropdown.classList.contains("open"));
  });

  // Fermer le dropdown en cliquant ailleurs
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      dropbtn.setAttribute("aria-expanded", "false");
    }
  });

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      applyRoleTheme(null);
      location.href = "/";
    }
  });
}

// --- Appel auto ---
buildNavbar();
