// Gestion de la barre de recherche avec dropdown et soumission
(function initSearchBar() {
  const form = document.querySelector(".searchbar");
  if (!form) return;

  const dropdown = form.querySelector(".dropdown-check");
  const btn = form.querySelector(".dropbtn");
  const menu = form.querySelector(".dropdown-content");

  if (!dropdown || !btn) return;

  // Toggle dropdown au clic
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  // Accessibilité clavier
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const isOpen = dropdown.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    // Échap pour fermer
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // Fermer en cliquant ailleurs
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  // Soumission du formulaire
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const data = new FormData(form);
    const payload = {
      keywords: data.get("keywords")?.trim() || "",
      location: data.get("location")?.trim() || "",
      types: data.getAll("type[]"),
    };

    console.log("[search] payload:", payload);

    // Construction de l'URL avec paramètres
    const params = new URLSearchParams();
    if (payload.keywords) params.set("q", payload.keywords);
    if (payload.location) params.set("loc", payload.location);
    if (payload.types.length) params.set("type", payload.types.join(","));

    // Redirection vers la page de résultats
    window.location.href = `/ads?${params.toString()}`;
  });
})();
