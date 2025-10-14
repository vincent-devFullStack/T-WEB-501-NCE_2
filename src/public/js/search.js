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
      types: data.getAll("type[]"),
    };

    // Construction de l'URL avec paramètres
    const params = new URLSearchParams();
    if (payload.keywords) params.set("q", payload.keywords);
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

  // Mots-clés : un tag par mot
  const q = params.get('q');
  if (q) {
    const terms = q.split(/\s+/).filter(t => t);
    terms.forEach(term => container.append(createTag(term, 'q', term)));
  }

  // Types de contrat
  const types = params.get('type')?.split(',')?.map(t => t.trim()).filter(t => t) || [];
  types.forEach(type => {
    container.append(createTag(type, 'type', type));
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

  } else if (key === 'q') {
    // Reconstruire q sans le terme supprimé
    const terms = params.get('q')?.split(/\s+/).filter(t => t && t !== value) || [];
    if (terms.length) params.set('q', terms.join(' '));
    else params.delete('q');

  } else {
    params.delete(key);
  }

  const base = window.location.pathname;
  const query = params.toString();
  window.location.href = query ? `${base}?${query}` : base;
}

// ==============================
// FILTRAGE CÔTÉ CLIENT (insensible à la casse, multi-mots-clés & multi-types)
// ==============================
function applyClientFilters() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q')?.toLowerCase().split(/\s+/).filter(t => t) || [];
  const types = params.get('type')?.split(',').map(t => t.toLowerCase()) || [];

  document.querySelectorAll('.job-card-wrapper').forEach(wrapper => {
    const front = wrapper.querySelector('.job-card-front');
    const title = front.querySelector('h3').textContent.toLowerCase();
    const contractEl = front.querySelector('.contract-type');
    const contract = contractEl ? contractEl.textContent.toLowerCase() : '';

    // Tous les mots-clés doivent matcher
    const matchQ = !q.length || q.every(term => title.includes(term));
    // Au moins un type doit matcher
    const matchType = !types.length || types.every(t => contract === t);
    wrapper.style.display = (matchQ && matchType) ? '' : 'none';
  });
}

// Appel au chargement de la page
renderFilterTags();
applyClientFilters();
