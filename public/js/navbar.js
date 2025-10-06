(async () => {
  const nav = document.getElementById("navbar");
  let user = null;
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (r.ok) user = (await r.json()).user;
  } catch {}
  nav.innerHTML = user
    ? `
    <a href="/">Accueil</a>
    <a href="/profil.html">Mon profil</a>
    ${user.role === "admin" ? '<a href="/admin.html">Admin</a>' : ""}
    <button id="logout">Déconnexion</button>
  `
    : `
    <a href="/">Accueil</a>
    <a href="/login.html">Connexion</a>
  `;
  document.getElementById("logout")?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    location.href = "/";
  });
})();
