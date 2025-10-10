// Ouvre/ferme le dropdown au survol via CSS ; ici on gère aussi le clavier
(function initSearchBar() {
  const form = document.querySelector(".searchbar");
  if (!form) return;

  const dropdown = form.querySelector(".dropdown-check");
  const btn = form.querySelector(".dropbtn");
  const menu = form.querySelector(".dropdown-content");

  // Accessibilité clavier
  btn?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dropdown.classList.toggle("open");
    }
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    dropdown.classList.toggle("open");
  });

  // Soumission : pour l'instant, on logge les valeurs (à remplacer par un fetch)
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      keywords: data.get("keywords")?.trim() || "",
      location: data.get("location")?.trim() || "",
      types: data.getAll("type[]"),
    };
    // TODO: rediriger vers /ads?… ou appeler /api/ads?…
    console.log("[search] payload:", payload);
    // Exemple redirection:
    const params = new URLSearchParams();
    if (payload.keywords) params.set("q", payload.keywords);
    if (payload.location) params.set("loc", payload.location);
    if (payload.types.length) params.set("type", payload.types.join(","));
    window.location.href = `/ads?${params.toString()}`;
  });
})();
