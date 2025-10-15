// ==============================
// GESTION DE LA BARRE DE RECHERCHE
// ==============================
(function initSearchBar() {
  const form = document.querySelector(".searchbar");
  if (!form) return;

  const dropdown = form.querySelector(".dropdown-check");
  const btn = form.querySelector(".dropbtn");
  const keywordInput = form.querySelector('input[name="keywords"]');

  if (keywordInput) {
    const datalistId = "search-suggestions";
    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }
    keywordInput.setAttribute("list", datalistId);

    let suggestionsLoaded = false;
    const loadSuggestions = async () => {
      if (suggestionsLoaded) return;
      suggestionsLoaded = true;
      try {
        const res = await fetch("/api/ads", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const ads = Array.isArray(data) ? data : data.ads || [];
        const suggestions = new Set();
        ads.forEach((ad) => {
          if (ad?.job_title) suggestions.add(ad.job_title.trim());
          if (ad?.company_name) suggestions.add(ad.company_name.trim());
          if (ad?.location) suggestions.add(ad.location.trim());
        });
        datalist.innerHTML = Array.from(suggestions)
          .filter(Boolean)
          .slice(0, 20)
          .map((value) => `<option value="${value}"></option>`)
          .join("");
      } catch (error) {
        console.error("Auto-suggest error:", error);
      }
    };

    keywordInput.addEventListener("focus", loadSuggestions, { once: true });
    keywordInput.addEventListener("input", loadSuggestions, { once: true });
  }

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

  // Soumission du formulaire - VERSION CUMULATIVE
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Récupérer les paramètres actuels de l'URL
    const currentParams = new URLSearchParams(window.location.search);

    const data = new FormData(form);
    const newKeywords = data.get("keywords")?.trim() || "";
    const newTypes = data.getAll("type[]");

    // CUMUL DES MOTS-CLÉS
    if (newKeywords) {
      const existingKeywords = currentParams.get("q") || "";
      const allKeywords = existingKeywords
        ? `${existingKeywords} ${newKeywords}`.trim()
        : newKeywords;
      currentParams.set("q", allKeywords);
    }

    // CUMUL DES TYPES DE CONTRAT
    if (newTypes.length) {
      const existingTypes = currentParams.get("type")?.split(",") || [];
      const allTypes = [...new Set([...existingTypes, ...newTypes])];
      currentParams.set("type", allTypes.join(","));
    }

    // Réinitialiser le formulaire pour la prochaine saisie
    form.reset();

    // Redirection avec tous les filtres cumulés
    window.location.href = `/ads?${currentParams.toString()}`;
  });
})();

// ==============================
// AFFICHAGE DES TAGS DE FILTRES
// ==============================
function renderFilterTags() {
  const params = new URLSearchParams(window.location.search);
  const container = document.createElement("div");
  container.className = "filter-tags";

  function createTag(label, key, value) {
    const tag = document.createElement("span");
    tag.className = "filter-tag";
    tag.textContent = label;
    tag.dataset.key = key;
    tag.dataset.value = value;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-remove";
    btn.textContent = "×";
    btn.addEventListener("click", () => removeFilter(key, value));
    tag.append(btn);
    return tag;
  }

  // Mots-clés : un tag par mot
  const q = params.get("q");
  if (q) {
    const terms = q.split(/\s+/).filter((t) => t);
    terms.forEach((term) => container.append(createTag(term, "q", term)));
  }

  // Types de contrat
  const types =
    params.get("type")?.split(",")?.map((t) => t.trim()).filter((t) => t) ||
    [];
  types.forEach((type) => {
    container.append(createTag(type, "type", type));
  });

  const main = document.querySelector("main.container");
  if (container.children.length) {
    main.parentNode.insertBefore(container, main);
  }
}

function removeFilter(key, value) {
  const params = new URLSearchParams(window.location.search);

  if (key === "type") {
    const arr = params.get("type")?.split(",") || [];
    const filtered = arr.filter((v) => v !== value);
    if (filtered.length) params.set("type", filtered.join(","));
    else params.delete("type");
  } else if (key === "q") {
    const terms =
      params.get("q")?.split(/\s+/).filter((t) => t && t !== value) || [];
    if (terms.length) params.set("q", terms.join(" "));
    else params.delete("q");
  } else {
    params.delete(key);
  }

  const base = window.location.pathname;
  const query = params.toString();
  window.location.href = query ? `${base}?${query}` : base;
}

// ==============================
// FILTRAGE CÔTÉ CLIENT
// ==============================
function applyClientFilters() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q")?.toLowerCase().split(/\s+/).filter((t) => t) || [];
  const types = params.get("type")?.split(",").map((t) => t.toLowerCase()) || [];

  document.querySelectorAll(".job-card-wrapper").forEach((wrapper) => {
    const front = wrapper.querySelector(".job-card-front");
    const title = front.querySelector("h3").textContent.toLowerCase();
    const contractEl = front.querySelector(".contract-type");
    const contract = contractEl ? contractEl.textContent.toLowerCase() : "";

    const matchQ = !q.length || q.every((term) => title.includes(term));
    const matchType = !types.length || types.every((t) => contract === t);
    wrapper.style.display = matchQ && matchType ? "" : "none";
  });
}

// Appel au chargement de la page
renderFilterTags();
applyClient
