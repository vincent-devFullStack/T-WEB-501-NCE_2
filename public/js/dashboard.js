// js/dashboard.js
import { people, advertisements } from './mock-data.js';

// ==============================
// STATISTIQUES UTILISATEURS
// ==============================

function calculateUserStats() {
  const candidats = people.filter(p => p.person_type === 'candidat').length;
  const recruteurs = people.filter(p => p.person_type === 'recruteur').length;
  const admins = people.filter(p => p.person_type === 'admin').length;
  const total = candidats + recruteurs + admins;
  
  return { candidats, recruteurs, admins, total };
}

function updateUserKPI() {
  const stats = calculateUserStats();
  
  document.getElementById("total-users").textContent = stats.total;
  document.getElementById("candidats-count").textContent = stats.candidats;
  document.getElementById("recruteurs-count").textContent = stats.recruteurs;
  
  updateDonutChart('donut-chart-users', [
    { percent: (stats.candidats / stats.total) * 100, color: '#6366f1' },
    { percent: (stats.recruteurs / stats.total) * 100, color: '#f59e0b' }
  ]);
}

// ==============================
// STATISTIQUES ANNONCES
// ==============================

function calculateAdsStats() {
  const cdi = advertisements.filter(a => a.contract_type === 'cdi').length;
  const stage = advertisements.filter(a => a.contract_type === 'stage').length;
  const alternance = advertisements.filter(a => a.contract_type === 'alternance').length;
  const total = advertisements.length;
  
  return { cdi, stage, alternance, total };
}

function updateAdsKPI() {
  const stats = calculateAdsStats();
  
  document.getElementById("total-ads").textContent = stats.total;
  document.getElementById("cdi-count").textContent = stats.cdi;
  document.getElementById("stage-count").textContent = stats.stage;
  document.getElementById("alternance-count").textContent = stats.alternance;
  
  updateDonutChart('donut-chart-ads', [
    { percent: (stats.cdi / stats.total) * 100, color: '#10b981' },
    { percent: (stats.stage / stats.total) * 100, color: '#f59e0b' },
    { percent: (stats.alternance / stats.total) * 100, color: '#8b5cf6' }
  ]);
}

// ==============================
// GRAPHIQUE DONUT GÉNÉRIQUE
// ==============================

function updateDonutChart(elementId, segments) {
  const donut = document.getElementById(elementId);
  
  if (segments.length === 0) {
    donut.style.background = "#e5e7eb";
    return;
  }
  
  let gradient = "conic-gradient(";
  let currentPercent = 0;
  
  segments.forEach((segment, index) => {
    const nextPercent = currentPercent + segment.percent;
    gradient += `${segment.color} ${currentPercent}% ${nextPercent}%`;
    if (index < segments.length - 1) gradient += ", ";
    currentPercent = nextPercent;
  });
  
  gradient += ")";
  donut.style.background = gradient;
}

// ==============================
// LISTE DES UTILISATEURS
// ==============================

function displayUsersList() {
  const tbody = document.getElementById("users-table-body");
  
  if (people.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="loading-cell">Aucun utilisateur trouvé</td>
      </tr>`;
    return;
  }
  
  tbody.innerHTML = people
    .map(user => `
      <tr>
        <td>${user.first_name} ${user.last_name}</td>
        <td>${user.email}</td>
        <td><span class="role-badge ${user.person_type}">${user.person_type}</span></td>
        <td>${new Date(user.created_at).toLocaleDateString("fr-FR")}</td>
        <td class="table-actions">
          <button class="btn-action btn-edit" onclick="editUser(${user.person_id})">Modifier</button>
          <button class="btn-action btn-delete" onclick="deleteUser(${user.person_id})">Supprimer</button>
        </td>
      </tr>`)
    .join("");
}

// ==============================
// LISTE DES ANNONCES
// ==============================

function displayAdsList() {
  const tbody = document.getElementById("ads-table-body");
  
  if (advertisements.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-cell">Aucune annonce trouvée</td>
      </tr>`;
    return;
  }
  
  tbody.innerHTML = advertisements
    .map(ad => `
      <tr>
        <td>${ad.ad_id}</td>
        <td>${ad.job_title}</td>
        <td>${ad.company_name}</td>
        <td><span class="contract-badge ${ad.contract_type}">${ad.contract_type.toUpperCase()}</span></td>
        <td><span class="status-badge ${ad.status}">${ad.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
        <td>${new Date(ad.created_at).toLocaleDateString("fr-FR")}</td>
        <td class="table-actions">
          <button class="btn-action btn-view" onclick="viewAd(${ad.ad_id})">Consulter</button>
          <button class="btn-action btn-edit" onclick="editAd(${ad.ad_id})">Modifier</button>
          <button class="btn-action btn-delete" onclick="deleteAd(${ad.ad_id})">Supprimer</button>
        </td>
      </tr>`)
    .join("");
}

// ==============================
// MODAL DÉTAILS ANNONCE
// ==============================

window.viewAd = function(adId) {
  const ad = advertisements.find(a => a.ad_id === adId);
  if (!ad) return;
  
  const modal = document.getElementById("ad-details-modal");
  const modalBody = document.getElementById("modal-body");
  
  modalBody.innerHTML = `
    <div class="modal-detail-row">
      <div class="modal-detail-label">Titre du poste</div>
      <div class="modal-detail-value">${ad.job_title}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Entreprise</div>
      <div class="modal-detail-value">${ad.company_name}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Description</div>
      <div class="modal-detail-value">${ad.job_description}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Exigences</div>
      <div class="modal-detail-value">${ad.requirements}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Localisation</div>
      <div class="modal-detail-value">${ad.location}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Type de contrat</div>
      <div class="modal-detail-value"><span class="contract-badge ${ad.contract_type}">${ad.contract_type.toUpperCase()}</span></div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Salaire</div>
      <div class="modal-detail-value">${ad.salary_min ? `${ad.salary_min} - ${ad.salary_max} ${ad.currency}` : 'Non précisé'}</div>
    </div>
    <div class="modal-detail-row">
      <div class="modal-detail-label">Date limite</div>
      <div class="modal-detail-value">${new Date(ad.deadline_date).toLocaleDateString("fr-FR")}</div>
    </div>
  `;
  
  // Afficher la modal
  modal.style.display = "flex";
  
  // AJOUTER : Fonction pour fermer la modal
  function closeModal() {
    modal.style.display = "none";
  }
  
  // AJOUTER : Event listener sur le bouton X (retire l'ancien avant d'ajouter le nouveau)
  const closeBtn = document.getElementById("close-modal");
  closeBtn.onclick = closeModal;
  
  // AJOUTER : Event listener pour cliquer en dehors
  modal.onclick = function(e) {
    if (e.target === modal) {
      closeModal();
    }
  };
};

// ==============================
// ACTIONS (placeholder)
// ==============================

window.editUser = function(userId) {
  const user = people.find(p => p.person_id === userId);
  alert(`Modifier l'utilisateur: ${user.first_name} ${user.last_name}`);
};

window.deleteUser = function(userId) {
  const user = people.find(p => p.person_id === userId);
  if (confirm(`Êtes-vous sûr de vouloir supprimer ${user.first_name} ${user.last_name} ?`)) {
    alert("Fonctionnalité à implémenter");
  }
};

window.editAd = function(adId) {
  const ad = advertisements.find(a => a.ad_id === adId);
  alert(`Modifier l'annonce: ${ad.job_title}`);
};

window.deleteAd = function(adId) {
  const ad = advertisements.find(a => a.ad_id === adId);
  if (confirm(`Êtes-vous sûr de vouloir supprimer "${ad.job_title}" ?`)) {
    alert("Fonctionnalité à implémenter");
  }
};

// ==============================
// INITIALISATION
// ==============================

document.addEventListener("DOMContentLoaded", function() {
  // Mettre à jour les KPI
  updateUserKPI();
  updateAdsKPI();
  
  // Carte utilisateurs
  document.getElementById("users-card").addEventListener("click", function() {
    const listSection = document.getElementById("users-list-section");
    const isVisible = listSection.style.display === "block";
    
    // Cacher les annonces si elles sont ouvertes
    document.getElementById("ads-list-section").style.display = "none";
    
    listSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayUsersList();
      listSection.scrollIntoView({ behavior: "smooth" });
    }
  });
  
  // Carte annonces
  document.getElementById("ads-card").addEventListener("click", function() {
    const listSection = document.getElementById("ads-list-section");
    const isVisible = listSection.style.display === "block";
    
    // Cacher les utilisateurs si ils sont ouverts
    document.getElementById("users-list-section").style.display = "none";
    
    listSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayAdsList();
      listSection.scrollIntoView({ behavior: "smooth" });
    }
  });
document.addEventListener("DOMContentLoaded", function() {
  // Mettre à jour les KPI
  updateUserKPI();
  updateAdsKPI();
  
  // Carte utilisateurs
  document.getElementById("users-card").addEventListener("click", function() {
    const listSection = document.getElementById("users-list-section");
    const isVisible = listSection.style.display === "block";
    
    // Cacher les annonces si elles sont ouvertes
    document.getElementById("ads-list-section").style.display = "none";
    
    listSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayUsersList();
      listSection.scrollIntoView({ behavior: "smooth" });
    }
  });
  
  // Carte annonces
  document.getElementById("ads-card").addEventListener("click", function() {
    const listSection = document.getElementById("ads-list-section");
    const isVisible = listSection.style.display === "block";
    
    // Cacher les utilisateurs si ils sont ouverts
    document.getElementById("users-list-section").style.display = "none";
    
    listSection.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      displayAdsList();
      listSection.scrollIntoView({ behavior: "smooth" });
    }
  });

});

});
