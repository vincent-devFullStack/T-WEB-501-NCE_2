// public/js/dashboard.js

// ==============================
// Chargement des données (API -> fallback mock)
// ==============================
let people = [];
let advertisements = [];
let companies = []; // <— NEW

async function fetchJSON(url) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function uniqBy(arr, keyFn) {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, it);
  }
  return Array.from(m.values());
}

async function loadData() {
  try {
    // 1) Annonces
    const adsRes = await fetchJSON("/api/ads");
    advertisements = Array.isArray(adsRes) ? adsRes : adsRes.ads || [];

    // 2) Utilisateurs (si route dispo)
    try {
      const usersRes = await fetchJSON("/api/admin/people");
      people = Array.isArray(usersRes) ? usersRes : usersRes.people || [];
    } catch {
      const m = await import("./mock-data.js");
      if (!people.length) people = m.people || [];
    }

    // 3) Entreprises (NOUVEAU)
    try {
      const compRes = await fetchJSON("/api/companies");
      const list = Array.isArray(compRes) ? compRes : compRes.companies || [];
      companies = list
        .filter(Boolean)
        .map((c) => ({
          company_id: c.company_id ?? c.id ?? null,
          company_name: c.company_name ?? c.name ?? "Entreprise",
        }))
        .filter((c) => c.company_name);
    } catch {
      // Fallback : reconstituer depuis les annonces
      const derived = advertisements
        .filter((a) => a && (a.company_id != null || a.company_name))
        .map((a) => ({
          company_id:
            a.company_id ?? `name:${(a.company_name || "").toLowerCase()}`,
          company_name: a.company_name || "Entreprise",
        }));
      companies = uniqBy(derived, (c) => c.company_id ?? c.company_name);
    }
  } catch {
    // Fallback complet
    const m = await import("./mock-data.js");
    people = m.people || [];
    advertisements = m.advertisements || [];

    // Fallback entreprises depuis mock ads
    const derived = advertisements
      .filter((a) => a && (a.company_id != null || a.company_name))
      .map((a) => ({
        company_id:
          a.company_id ?? `name:${(a.company_name || "").toLowerCase()}`,
        company_name: a.company_name || "Entreprise",
      }));
    companies = uniqBy(derived, (c) => c.company_id ?? c.company_name);
  }
}

// ==============================
// Helpers DOM safe
// ==============================
const $id = (id) => document.getElementById(id);
const setText = (id, txt) => {
  const el = $id(id);
  if (el) el.textContent = txt;
};

// ==============================
// STATISTIQUES UTILISATEURS
// ==============================
function calculateUserStats() {
  const candidats = people.filter((p) => p.person_type === "candidat").length;
  const recruteurs = people.filter((p) => p.person_type === "recruteur").length;
  const admins = people.filter((p) => p.person_type === "admin").length;
  const total = candidats + recruteurs + admins;
  return { candidats, recruteurs, admins, total };
}

function updateUserKPI() {
  const stats = calculateUserStats();
  if (!stats.total) {
    setText("total-users", "0");
    setText("candidats-count", "0");
    setText("recruteurs-count", "0");
    updateDonutChart("donut-chart-users", []);
    return;
  }
  setText("total-users", stats.total);
  setText("candidats-count", stats.candidats);
  setText("recruteurs-count", stats.recruteurs);

  updateDonutChart("donut-chart-users", [
    { percent: (stats.candidats / stats.total) * 100, color: "#6366f1" },
    { percent: (stats.recruteurs / stats.total) * 100, color: "#f59e0b" },
  ]);
}

// ==============================
// STATISTIQUES ANNONCES
// ==============================
function calculateAdsStats() {
  const cdi = advertisements.filter((a) => a.contract_type === "cdi").length;
  const stage = advertisements.filter(
    (a) => a.contract_type === "stage"
  ).length;
  const alternance = advertisements.filter(
    (a) => a.contract_type === "alternance"
  ).length;
  const total = advertisements.length;
  return { cdi, stage, alternance, total };
}

function updateAdsKPI() {
  const stats = calculateAdsStats();
  if (!stats.total) {
    setText("total-ads", "0");
    setText("cdi-count", "0");
    setText("stage-count", "0");
    setText("alternance-count", "0");
    updateDonutChart("donut-chart-ads", []);
    return;
  }
  setText("total-ads", stats.total);
  setText("cdi-count", stats.cdi);
  setText("stage-count", stats.stage);
  setText("alternance-count", stats.alternance);

  updateDonutChart("donut-chart-ads", [
    { percent: (stats.cdi / stats.total) * 100, color: "#10b981" },
    { percent: (stats.stage / stats.total) * 100, color: "#f59e0b" },
    { percent: (stats.alternance / stats.total) * 100, color: "#8b5cf6" },
  ]);
}

// ==============================
// GRAPHIQUE DONUT GÉNÉRIQUE
// ==============================
function updateDonutChart(elementId, segments) {
  const donut = $id(elementId);
  if (!donut) return;

  if (!segments.length) {
    donut.style.background = "#e5e7eb";
    return;
  }

  let gradient = "conic-gradient(";
  let currentPercent = 0;
  segments.forEach((segment, index) => {
    const next = currentPercent + (segment.percent || 0);
    gradient += `${segment.color} ${currentPercent}% ${next}%`;
    if (index < segments.length - 1) gradient += ", ";
    currentPercent = next;
  });
  gradient += ")";
  donut.style.background = gradient;
}

// ==============================
// LISTE DES UTILISATEURS
// ==============================
function displayUsersList() {
  const tbody = $id("users-table-body");
  if (!tbody) return;

  if (!people.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">Aucun utilisateur trouvé</td></tr>`;
    return;
  }

  tbody.innerHTML = people
    .map(
      (user) => `
    <tr>
      <td>${user.first_name ?? ""} ${user.last_name ?? ""}</td>
      <td>${user.email ?? ""}</td>
      <td><span class="role-badge ${user.person_type}">${
        user.person_type
      }</span></td>
      <td>${
        user.created_at
          ? new Date(user.created_at).toLocaleDateString("fr-FR")
          : "-"
      }</td>
      <td class="table-actions">
        <button class="btn-action btn-edit"   onclick="editUser(${
          user.person_id
        })">Modifier</button>
        <button class="btn-action btn-delete" onclick="deleteUser(${
          user.person_id
        })">Supprimer</button>
      </td>
    </tr>
  `
    )
    .join("");
}

// ==============================
// LISTE DES ANNONCES
// ==============================
function displayAdsList() {
  const tbody = $id("ads-table-body");
  if (!tbody) return;

  if (!advertisements.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">Aucune annonce trouvée</td></tr>`;
    return;
  }

  tbody.innerHTML = advertisements
    .map(
      (ad) => `
    <tr>
      <td>${ad.ad_id}</td>
      <td>${ad.job_title ?? ""}</td>
      <td>${ad.company_name ?? ""}</td>
      <td><span class="contract-badge ${ad.contract_type}">${String(
        ad.contract_type || ""
      ).toUpperCase()}</span></td>
      <td><span class="status-badge ${ad.status}">${
        ad.status === "active" ? "Actif" : "Inactif"
      }</span></td>
      <td>${
        ad.created_at
          ? new Date(ad.created_at).toLocaleDateString("fr-FR")
          : "-"
      }</td>
      <td class="table-actions">
        <button class="btn-action btn-view"   onclick="viewAd(${
          ad.ad_id
        })">Consulter</button>
        <button class="btn-action btn-edit"   onclick="editAd(${
          ad.ad_id
        })">Modifier</button>
        <button class="btn-action btn-delete" onclick="deleteAd(${
          ad.ad_id
        })">Supprimer</button>
      </td>
    </tr>
  `
    )
    .join("");
}

// ==============================
// MODAL DÉTAILS ANNONCE
// ==============================
window.viewAd = function (adId) {
  const ad = advertisements.find((a) => a.ad_id === adId);
  if (!ad) return;

  const modal = $id("ad-details-modal");
  const modalBody = $id("modal-body");
  const closeBtn = $id("close-modal");
  if (!modal || !modalBody || !closeBtn) return;

  modalBody.innerHTML = `
    <div class="modal-detail-row"><div class="modal-detail-label">Titre du poste</div><div class="modal-detail-value">${
      ad.job_title ?? ""
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Entreprise</div><div class="modal-detail-value">${
      ad.company_name ?? ""
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Description</div><div class="modal-detail-value">${
      ad.job_description ?? ""
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Exigences</div><div class="modal-detail-value">${
      ad.requirements ?? ""
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Localisation</div><div class="modal-detail-value">${
      ad.location ?? ""
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Type de contrat</div><div class="modal-detail-value"><span class="contract-badge ${
      ad.contract_type
    }">${String(ad.contract_type || "").toUpperCase()}</span></div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Salaire</div><div class="modal-detail-value">${
      ad.salary_min
        ? `${ad.salary_min} - ${ad.salary_max} ${ad.currency || ""}`
        : "Non précisé"
    }</div></div>
    <div class="modal-detail-row"><div class="modal-detail-label">Date limite</div><div class="modal-detail-value">${
      ad.deadline_date
        ? new Date(ad.deadline_date).toLocaleDateString("fr-FR")
        : "-"
    }</div></div>
  `;

  const closeModal = () => {
    modal.style.display = "none";
  };
  closeBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  modal.style.display = "flex";
};

// ==============================
// Champ Entreprise : ID -> Nom (SELECT)
// ==============================

function populateCompanySelect(selectEl, currentCompanyId = null) {
  if (!selectEl) return;
  // Nettoyage
  selectEl.innerHTML = "";

  // Placeholder
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— Sélectionner une entreprise —";
  selectEl.appendChild(opt0);

  // Options entreprises
  companies
    .slice()
    .sort((a, b) =>
      a.company_name.localeCompare(b.company_name, "fr", {
        sensitivity: "base",
      })
    )
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.company_id ?? "";
      opt.textContent = c.company_name || `Entreprise ${c.company_id ?? ""}`;
      if (
        currentCompanyId != null &&
        String(currentCompanyId) === String(c.company_id)
      ) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
}

/**
 * Transforme l’input [name="company_id"] en <select> affichant les NOMS
 * - value = company_id (pour le backend)
 * - label visible = company_name
 */
function upgradeCompanyField(defaultCompanyId = null) {
  const form = document.querySelector("#admin-form");
  if (!form) return;

  // Cherche un champ existant "company_id" (input ou select déjà présent)
  let field = form.querySelector('[name="company_id"]');
  if (!field) {
    // Essaye avec un id fallback
    field = form.querySelector("#company_id");
  }
  if (!field) return;

  if (field.tagName.toLowerCase() === "select") {
    // Déjà un select : juste peupler
    populateCompanySelect(field, defaultCompanyId ?? field.value ?? null);
    return;
  }

  // Remplacer l'input par un select
  const select = document.createElement("select");
  select.name = "company_id";
  select.id = field.id || "company_id";
  select.className = field.className || "";
  select.required = field.required || false;

  // Copie des attributs utiles
  ["disabled"].forEach((attr) => {
    if (field.hasAttribute(attr))
      select.setAttribute(attr, field.getAttribute(attr));
  });

  // Insère le select à la place de l’input
  field.parentNode.replaceChild(select, field);

  // Peuple avec les noms d’entreprises
  populateCompanySelect(select, defaultCompanyId);
}

// ==============================
// ACTIONS (placeholder)
// ==============================
window.editUser = function (userId) {
  const user = people.find((p) => p.person_id === userId);

  // Si tu as déjà un modal ouvert côté HTML, on se contente d’améliorer le champ entreprise :
  //  - on tente d’inférer la valeur courante (company_id) depuis l’utilisateur si dispo
  const currentCompanyId =
    user &&
    (user.company_id != null ? user.company_id : user.company?.company_id);

  // Upgrade du champ “ID entreprise” -> select par nom
  upgradeCompanyField(currentCompanyId);

  // (garde l’ancien comportement si aucun modal n’est branché)
  if (!user) {
    alert(`Modifier l'utilisateur: ${userId}`);
  } else {
    // Si tu veux pré-remplir les autres champs, fais-le ici en ciblant #admin-form …
    // Ex:
    // const f = document.querySelector("#admin-form");
    // f.elements.first_name.value = user.first_name || "";
    // ...
  }
};

window.deleteUser = function (userId) {
  const user = people.find((p) => p.person_id === userId);
  if (
    confirm(
      `Êtes-vous sûr de vouloir supprimer ${
        user ? user.first_name + " " + user.last_name : userId
      } ?`
    )
  ) {
    alert("Fonctionnalité à implémenter");
  }
};

window.editAd = function (adId) {
  const ad = advertisements.find((a) => a.ad_id === adId);
  alert(`Modifier l'annonce: ${ad ? ad.job_title : adId}`);
};

window.deleteAd = function (adId) {
  const ad = advertisements.find((a) => a.ad_id === adId);
  if (
    confirm(
      `Êtes-vous sûr de vouloir supprimer "${ad ? ad.job_title : adId}" ?`
    )
  ) {
    alert("Fonctionnalité à implémenter");
  }
};

// ==============================
// INITIALISATION
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  // charge data (API -> fallback)
  await loadData();

  // KPI
  updateUserKPI();
  updateAdsKPI();

  // Upgrade du champ entreprise au chargement (pour le cas "nouvel enregistrement")
  upgradeCompanyField(null);

  // Clicks cartes -> listes
  const usersCard = $id("users-card");
  const adsCard = $id("ads-card");
  const usersListSection = $id("users-list-section");
  const adsListSection = $id("ads-list-section");

  usersCard?.addEventListener("click", () => {
    if (!usersListSection || !adsListSection) return;
    const isVisible = usersListSection.style.display === "block";
    adsListSection.style.display = "none";
    usersListSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayUsersList();
      usersListSection.scrollIntoView({ behavior: "smooth" });
    }
  });

  adsCard?.addEventListener("click", () => {
    if (!usersListSection || !adsListSection) return;
    const isVisible = adsListSection.style.display === "block";
    usersListSection.style.display = "none";
    adsListSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayAdsList();
      adsListSection.scrollIntoView({ behavior: "smooth" });
    }
  });
});
