// public/js/navbar.js

// --- Helpers API (cookies inclus) ---
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

// --- Thème par rôle ---
const ROLE_CLASSES = [
  "mode-public",
  "mode-candidat",
  "mode-recruteur",
  "mode-admin",
];
function clearRoleTheme() {
  ROLE_CLASSES.forEach((c) => document.body.classList.remove(c));
}
function applyRoleTheme(role) {
  clearRoleTheme();
  document.body.dataset.role = role || "";
  if (role === "candidat") document.body.classList.add("mode-candidat");
  else if (role === "recruteur") document.body.classList.add("mode-recruteur");
  else if (role === "admin") document.body.classList.add("mode-admin");
  else document.body.classList.add("mode-public");
}

// --- Build navbar ---
async function buildNavbar() {
  const el = document.getElementById("navbar");
  if (!el) return;

  // éviter flash de thème
  applyRoleTheme(null);

  let user = null;
  try {
    const res = await api.get("/api/auth/me");
    user = res.user ?? null;
  } catch {
    // non connecté
  }
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
        <a class="btn" href="/auth/login">Se connecter</a>
        <a class="btn btn-secondary" href="/auth/login#signup">S'inscrire</a>
      </div>
    `;
    return;
  }

  const displayName =
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "Mon compte";

  let roleLinks = `<li><a href="/">Accueil</a></li>`;
  if (user.role === "candidat") {
    roleLinks += `
      <li><a href="/profil">Trouver un job</a></li>
      <li><a href="/entreprise">Trouver une entreprise</a></li>`;
  } else if (user.role === "recruteur") {
    roleLinks += `
    <li><a href="/ads/my-ads">Mes offres</a></li>
    <li><a href="/candidats">Trouver des candidats</a></li>`;
  } else if (user.role === "admin") {
    roleLinks += `<li><a href="/dashboard">Dashboard Admin</a></li>`;
  }

  el.innerHTML = `
    <a href="/" class="logo"><img src="/images/logo.png" alt="Logo"></a>
    <ul class="nav-links">${roleLinks}</ul>
    <div class="nav-actions">
      <div class="dropdown">
        <button class="dropbtn" aria-haspopup="true" aria-expanded="false">${displayName}</button>
        <div class="dropdown-content" role="menu">
          <a href="/profil" role="menuitem">Informations personnelles</a>
          ${
            user.role === "candidat"
              ? '<a href="/mes-candidatures" role="menuitem">Mes candidatures</a>'
              : ""
          }
${
  user.role === "recruteur"
    ? '<a href="/ads/my-ads" role="menuitem">Mes offres</a>'
    : ""
}
          <button id="logoutBtn" class="linklike" role="menuitem">Déconnexion</button>
        </div>
      </div>
    </div>
  `;

  // Dropdown
  const dropdown = el.querySelector(".dropdown");
  const dropbtn = el.querySelector(".dropbtn");

  function closeMenu() {
    dropdown?.classList.remove("open");
    dropbtn?.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    dropdown?.classList.add("open");
    dropbtn?.setAttribute("aria-expanded", "true");
  }

  dropbtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown?.classList.contains("open")) closeMenu();
    else openMenu();
  });

  document.addEventListener("click", (e) => {
    if (!dropdown || !dropbtn) return;
    if (!dropdown.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      applyRoleTheme(null);
      location.href = "/";
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildNavbar);
} else {
  buildNavbar();
}
