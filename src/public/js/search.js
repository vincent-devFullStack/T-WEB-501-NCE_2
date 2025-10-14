// ==============================
// GESTION DE LA BARRE DE RECHERCHE
// ==============================
(function initSearchBar() {
  const form = document.querySelector(".searchbar");
  if (!form) return;

  const dropdown = form.querySelector(".dropdown-check");
  const btn = form.querySelector(".dropbtn");

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

  // Soumission du formulaire
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      keywords: data.get("keywords")?.trim() || "",
      location: data.get("location")?.trim() || "",
      types: data.getAll("type[]"),
    };

    // Construction de l'URL avec paramètres
    const params = new URLSearchParams();
    if (payload.keywords) params.set("q", payload.keywords);
    if (payload.location) params.set("loc", payload.location);
    if (payload.types.length) params.set("type", payload.types.join(","));

    // Redirection vers la page de résultats
    window.location.href = `/ads?${params.toString()}`;
  });
})();

// ==============================
// AFFICHAGE DES TAGS DE FILTRES
// ==============================
function renderFilterTags() {
  const params = new URLSearchParams(window.location.search);
  const container = document.createElement('div');
  container.className = 'filter-tags';

  function createTag(label, key, value) {
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.textContent = label;
    tag.dataset.key = key;
    tag.dataset.value = value;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-remove';
    btn.textContent = '×';
    btn.addEventListener('click', () => removeFilter(key, value));
    tag.append(btn);
    return tag;
  }

  const q = params.get('q');
  if (q) container.append(createTag(q, 'q', q));

  const loc = params.get('loc');
  if (loc) container.append(createTag(loc, 'loc', loc));

  const types = params.get('type')?.split(',') || [];
  types.forEach(type => {
    if (type) container.append(createTag(type, 'type', type));
  });

  const main = document.querySelector('main.container');
  if (container.children.length) {
    main.parentNode.insertBefore(container, main);
  }
}

function removeFilter(key, value) {
  const params = new URLSearchParams(window.location.search);

  if (key === 'type') {
    const arr = params.get('type')?.split(',') || [];
    const filtered = arr.filter(v => v !== value);
    if (filtered.length) params.set('type', filtered.join(','));
    else params.delete('type');
  } else {
    params.delete(key);
  }

  const base = window.location.pathname;
  const query = params.toString();
  window.location.href = query ? `${base}?${query}` : base;
}

// Appel au chargement de la page
renderFilterTags();
