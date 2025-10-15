// ==============================
// GESTION DE LA BARRE DE RECHERCHE
// ==============================
(function initSearchBar() {
  const form = document.querySelector(".searchbar");
  if (!form) return;

  const dropdown = form.querySelector(".dropdown-check");
  const btn = form.querySelector(".dropbtn");
  const keywordInput = form.querySelector('input[name="keywords"]');
  const locationInput = form.querySelector('input[name="location"]');

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
          .map((v) => `<option value="${v}"></option>`)
          .join("");
      } catch (err) {
        console.error("Auto-suggest error:", err);
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
    const currentParams = new URLSearchParams(window.location.search);
    const data = new FormData(form);
    const newKeywords = data.get("keywords")?.trim() || "";
    const newLocation = data.get("location")?.trim() || "";
    const newTypes = data.getAll("type[]");

    // Cumul des mots-clés
    if (newKeywords) {
      const existing = currentParams.get("q") || "";
      const all = existing
        ? `${existing} ${newKeywords}`.trim()
        : newKeywords;
      currentParams.set("q", all);
    }

    // Cumul de la localisation
    if (newLocation) {
      currentParams.set("loc", newLocation);
    }

    // Cumul des types de contrat
    if (newTypes.length) {
      const existing = currentParams.get("type")?.split(",") || [];
      const all = [...new Set([...existing, ...newTypes])];
      currentParams.set("type", all.join(","));
    }

    form.reset();
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

  // Mots-clés
  const q = params.get("q");
  if (q) {
    q.split(/\s+/).filter(Boolean)
     .forEach((t) => container.append(createTag(t, "q", t)));
  }

  // Localisation
  const loc = params.get("loc");
  if (loc) {
    container.append(createTag(loc, "loc", loc));
  }

  // Types de contrat
  const types =
    params.get("type")?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  types.forEach((t) => {
    container.append(createTag(t, "type", t));
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
    filtered.length
      ? params.set("type", filtered.join(","))
      : params.delete("type");
  } else if (key === "q") {
    const terms = params
      .get("q")
      ?.split(/\s+/)
      .filter((t) => t && t !== value) || [];
    terms.length
      ? params.set("q", terms.join(" "))
      : params.delete("q");
  } else if (key === "loc") {
    params.delete("loc");
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

  // Mots-clés normalisés
  const q = params
    .get("q")
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/\s+/)
    .filter(Boolean) || [];

  // Localisation normalisée
  const loc = params
    .get("loc")
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") || "";

  // Types de contrat
  const types = params
    .get("type")
    ?.split(",")
    .map((t) => t.toLowerCase()) || [];

  document.querySelectorAll(".job-card-wrapper").forEach((wrapper) => {
    const front = wrapper.querySelector(".job-card-front");

    // Récupération normalisée des champs
    const title = front
      .querySelector("h3").textContent
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

    const company = front
      .querySelector(".company-name").textContent
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

    const locationText = front
      .querySelector(".muted").textContent
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

    const contractEl = front.querySelector(".contract-type");
    const contract = contractEl ? contractEl.textContent.toLowerCase() : "";

    // Filtre mots-clés (AND logique sur titre OU entreprise)
    const matchQ =
      !q.length ||
      q.every((term) =>
        title.includes(term) || company.includes(term)
      );

    // Filtre localisation (contains sur localisation uniquement)
    const matchLoc = !loc || locationText.includes(loc);

    // Filtre type de contrat (OU logique)
    const matchType =
      !types.length || types.some((t) => contract === t);

    wrapper.style.display =
      matchQ && matchLoc && matchType ? "" : "none";
  });
}

// Appel au chargement de la page
renderFilterTags();
applyClientFilters();
