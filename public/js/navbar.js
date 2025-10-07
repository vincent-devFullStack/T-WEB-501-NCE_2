// helpers API pour fetch sécurisés
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

// Fonction d’initialisation de la navbar
export async function buildNavbar() {
  const el = document.getElementById("navbar");

  let user = { name: "Test User", role: "admin" }; 

  // let user = null;

  // try {
  //   const res = await api.get("/api/auth/me");
  //   user = res.user;
  // } catch {}

  if (!user) {
    el.innerHTML = `
      <ul class="nav-links">
        <li><a href="/">Accueil</a></li>
      </ul>
      <div class="nav-actions">
        <a class="btn" href="/login.html">Se connecter</a>
        <a class="btn btn-secondary" href="/signup.html">S'inscrire</a>
      </div>`;
    return;
  }

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
    <ul class="nav-links">${roleLinks}</ul>
    <div class="nav-actions">
      <div class="dropdown">
        <button class="dropbtn">${user.name ?? "Mon compte"}</button>
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

  document
    .getElementById("logoutBtn")
    ?.addEventListener("click", async () => {
      await api.post("/api/auth/logout", {});
      location.href = "/";
    });
}

// Appel automatique si tu veux, ou sinon import et appel dans un <script type="module">
buildNavbar();
