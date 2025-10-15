// ==============================
// GESTION DES INTERACTIONS CARDS
// ==============================

const jobsList = document.getElementById('jobs-list');

if (!jobsList) {
  console.error('❌ Element #jobs-list non trouvé');
}

// ==============================
// BOUTON "EN SAVOIR PLUS"
// ==============================
jobsList?.addEventListener('click', async (e) => {
  const moreBtn = e.target.closest('.js-more');
  if (!moreBtn) return;

  const id = moreBtn.dataset.id;
  const card = moreBtn.closest('.job-card-front');
  if (!card) return;

  const existing = card.querySelector('.job-details');
  
  if (existing) {
    // Fermer les détails
    existing.remove();
    // Remettre le bouton "En savoir plus"
    const actionsDiv = card.querySelector('.job-card-actions');
    if (actionsDiv) {
      actionsDiv.innerHTML = `
        <button class="btn btn-details js-more" data-id="${id}">En savoir plus</button>
      `;
    }
    console.log('✅ Détails fermés');
    return;
  }

  // Ouvrir les détails
  console.log('🔄 Chargement des détails pour l\'offre', id);
  
  try {
    const job = await fetchJobDetails(id);
    if (!job) {
      console.error('❌ Offre non trouvée');
      return;
    }

    // Supprimer le bouton "En savoir plus"
    card.querySelector('.job-card-actions')?.remove();

    const detailsHTML = `
      <div class="job-details">
        <h4>Détails de l'offre</h4>
        <p><strong>Poste :</strong> ${escapeHtml(job.job_title)}</p>
        <p><strong>Entreprise :</strong> ${escapeHtml(job.company_name)}</p>
        <p><strong>Lieu :</strong> ${escapeHtml(job.location || 'Non spécifié')}</p>
        <p><strong>Contrat :</strong> ${escapeHtml(job.contract_type || 'Non spécifié')}</p>
        ${job.job_description ? `<p><strong>Description :</strong><br>${escapeHtml(job.job_description)}</p>` : ''}
        ${job.requirements ? `<p><strong>Prérequis :</strong><br>${escapeHtml(job.requirements)}</p>` : ''}
        
        <div class="job-details-actions">
          <button class="btn btn-apply js-apply" data-id="${id}">Candidature rapide</button>
          <button class="btn btn-secondary js-close-details" data-id="${id}">Réduire</button>
        </div>
      </div>
    `;

    card.insertAdjacentHTML('beforeend', detailsHTML);
    console.log('✅ Détails affichés');
  } catch (err) {
    console.error('❌ Erreur lors du chargement des détails:', err);
  }
});

// ==============================
// BOUTON "RÉDUIRE"
// ==============================
jobsList?.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('.js-close-details');
  if (!closeBtn) return;

  const card = closeBtn.closest('.job-card-front');
  const details = card?.querySelector('.job-details');
  const id = closeBtn.dataset.id;
  
  if (details) {
    details.remove();
    // Remettre le bouton "En savoir plus"
    card.insertAdjacentHTML('beforeend', `
      <div class="job-card-actions">
        <button class="btn btn-details js-more" data-id="${id}">En savoir plus</button>
      </div>
    `);
    console.log('✅ Détails réduits');
  }
});

// ==============================
// BOUTON "CANDIDATURE RAPIDE" → FADE
// ==============================
jobsList?.addEventListener('click', (e) => {
  const applyBtn = e.target.closest('.js-apply');
  if (!applyBtn) return;

  const id = applyBtn.dataset.id;
  const wrapper = document.querySelector(`.job-card-wrapper[data-id="${id}"]`);
  
  if (wrapper) {
    wrapper.classList.add('expanded');
    console.log('✅ Affichage du formulaire');
  }
});

// ==============================
// BOUTON "← RETOUR"
// ==============================
jobsList?.addEventListener('click', (e) => {
  const backBtn = e.target.closest('.btn-back-flip');
  if (!backBtn) return;

  const wrapper = backBtn.closest('.job-card-wrapper');
  if (wrapper) {
    wrapper.classList.remove('expanded');
    console.log('✅ Retour à la card');
  }
});

// ==============================
// SOUMISSION DU FORMULAIRE
// ==============================
jobsList?.addEventListener('submit', async (e) => {
  const form = e.target.closest('.quick-apply-form');
  if (!form) return;
  
  e.preventDefault();
  
  const jobId = form.dataset.jobId;
  const formData = new FormData(form);
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Envoi...';
  submitBtn.disabled = true;
  
  console.log('📤 Envoi de la candidature pour l\'offre', jobId);
  
  try {
    const response = await fetch(`/api/ads/${jobId}/apply`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (response.ok) {
      alert('✅ Candidature envoyée avec succès !');
      form.reset();
      form.closest('.job-card-wrapper')?.classList.remove('expanded');
      console.log('✅ Candidature envoyée');
    } else {
      const error = await response.json();
      alert('❌ Erreur : ' + (error.error || 'Une erreur est survenue'));
      console.error('❌ Erreur API:', error);
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err);
    alert('❌ Erreur lors de l\'envoi de la candidature');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// ==============================
// HELPERS
// ==============================
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

async function fetchJobDetails(id) {
  try {
    const response = await fetch('/api/ads', { credentials: 'include' });
    if (!response.ok) throw new Error('Erreur API');
    
    const data = await response.json();
    const ads = Array.isArray(data) ? data : data.ads || [];
    
    return ads.find(ad => ad.ad_id === Number(id));
  } catch (error) {
    console.error('❌ Erreur fetchJobDetails:', error);
    return null;
  }
}

console.log('✅ Script ads-list.js chargé');

// ==============================
// NORMALISATION DES PASTILLES DE CONTRAT
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.job-card .contract-type').forEach(el => {
    const raw = el.textContent.trim().toLowerCase();
    let text;
    if (raw === 'cdi' || raw === 'cdd') {
      text = raw.toUpperCase();           // CDI ou CDD
    } else {
      text = raw.charAt(0).toUpperCase()   // Alternance, Stage…
           + raw.slice(1).toLowerCase();
    }
    el.textContent = text;
  });
});
