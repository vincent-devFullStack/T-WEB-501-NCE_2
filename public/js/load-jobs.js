// public/js/load-jobs.js
import { advertisements } from "./mock-data.js";

// NOUVEAU : Fonction pour générer le formulaire de candidature
function generateApplicationForm(jobId, context = 'mobile', userData = null) {
  const idSuffix = context === 'desktop' ? 'desktop' : jobId;
  const isDesktop = context === 'desktop';
  
  return `
    <form class="quick-apply-form" data-job-id="${jobId}" data-context="${context}">
      <div class="form-group">
        <label for="name-${idSuffix}">Nom complet *</label>
        <input 
          type="text" 
          id="name-${idSuffix}" 
          name="name"
          required 
          value="${userData?.name || ''}"
          placeholder="Jean Dupont"
        >
      </div>

      <div class="form-group">
        <label for="email-${idSuffix}">Email *</label>
        <input 
          type="email" 
          id="email-${idSuffix}" 
          name="email"
          required 
          value="${userData?.email || ''}"
          placeholder="jean.dupont@email.com"
        >
      </div>

      <div class="form-group">
        <label for="phone-${idSuffix}">Téléphone *</label>
        <input 
          type="tel" 
          id="phone-${idSuffix}" 
          name="phone"
          required 
          value="${userData?.phone || ''}"
          placeholder="06 12 34 56 78"
        >
      </div>

      <div class="form-group">
        <label for="cv-${idSuffix}">CV (PDF, max 5Mo) *</label>
        <input 
          type="file" 
          id="cv-${idSuffix}" 
          name="cv"
          accept=".pdf" 
          required
        >
      </div>

      ${isDesktop ? `
        <div class="form-group">
          <label for="message-${idSuffix}">Message de motivation</label>
          <textarea 
            id="message-${idSuffix}" 
            name="message"
            rows="4" 
            placeholder="Parlez-nous de vous..."
          ></textarea>
        </div>
      ` : ''}

      ${isDesktop ? `
        <button type="submit" class="btn btn-submit">Envoyer ma candidature</button>
      ` : `
        <div class="form-actions-flip">
          <button type="button" class="btn btn-secondary btn-back-flip">← Retour</button>
          <button type="submit" class="btn btn-submit">Envoyer</button>
        </div>
      `}
    </form>
  `;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSalary(min, max, currency = "EUR") {
  if (min == null && max == null) return "Salaire non communiqué";
  const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency });
  if (min != null && max != null)
    return `${fmt.format(min)} – ${fmt.format(max)}`;
  if (min != null) return `À partir de ${fmt.format(min)}`;
  return `Jusqu'à ${fmt.format(max)}`;
}

function adCard(a) {
  const salary = formatSalary(a.salary_min, a.salary_max, a.currency);
  return `
    <div class="job-card-wrapper" data-id="${a.ad_id}">
      <div class="job-card-inner">
        <!-- RECTO : L'annonce -->
        <article class="job-card job-card-front" data-id="${a.ad_id}">
          <h3>${esc(a.job_title)}</h3>
          <p>${esc(a.company_name ?? "")}</p>
          <p class="muted">${esc(a.location ?? "")} — ${esc(
    a.contract_type ?? ""
  )}</p>
          <p class="muted"><strong>Salaire :</strong> ${esc(salary)}</p>
          
          <div class="job-card-actions">
            <button class="btn btn-details js-more" data-id="${a.ad_id}">En savoir plus</button>
          </div>
        </article>

        <!-- VERSO : Le formulaire -->
        <div class="job-card job-card-back">
          <h3>Candidature rapide</h3>
          ${generateApplicationForm(a.ad_id, 'mobile', null)}
        </div>
      </div>
    </div>`;
}

async function loadJobs() {
  const wrap = document.getElementById("jobs-list");
  if (!wrap) return;

  const ads = advertisements;

  if (!ads?.length) {
    wrap.innerHTML = `<p class="error">Aucune offre à afficher.</p>`;
    return;
  }

  wrap.innerHTML = ads.map(adCard).join("");

  // NOUVEAU : Générer le formulaire sidebar
  const sidebarContainer = document.getElementById('sidebar-form-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = generateApplicationForm('general', 'desktop', null);
  }

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button.js-more[data-id]");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const ad = ads.find((x) => x.ad_id === id);
    if (!ad) return;

    const host = btn.closest(".job-card");

    // supprimer le conteneur des boutons
    host.querySelector(".job-card-actions")?.remove();

    // injecter les détails
    const salary = formatSalary(ad.salary_min, ad.salary_max, ad.currency);
    host.insertAdjacentHTML(
      "beforeend",
      `
      <div class="job-details">
        <h4>Détails</h4>
        <p><strong>Poste :</strong> ${esc(ad.job_title)}</p>
        <p><strong>Entreprise :</strong> ${esc(ad.company_name ?? "")}</p>
        <p><strong>Lieu :</strong> ${esc(ad.location ?? "")}</p>
        <p><strong>Contrat :</strong> ${esc(ad.contract_type ?? "")}</p>
        <p><strong>Salaire :</strong> ${esc(salary)}</p>
        <p><strong>Description :</strong><br>${esc(
          ad.job_description ?? ""
        )}</p>
        
        <div class="job-details-actions">
          <button class="btn btn-apply js-apply" data-id="${ad.ad_id}">Candidature rapide</button>
          <button class="btn btn-secondary js-close-details">Réduire</button>
        </div>
      </div>
      `
    );

    // quand on ferme, on retire le bloc et on remet le bouton
    host.querySelector(".js-close-details")?.addEventListener("click", () => {
      host.querySelector(".job-details")?.remove();
      host.insertAdjacentHTML(
        "beforeend",
        `
        <div class="job-card-actions">
          <button class="btn btn-details js-more" data-id="${ad.ad_id}">En savoir plus</button>
        </div>
        `
      );
    });
  });
    // NOUVEAU : Gestionnaire pour l'expansion
  wrap.addEventListener("click", (e) => {
    const applyBtn = e.target.closest("button.js-apply[data-id]");
    if (!applyBtn) return;
    
    if (window.innerWidth >= 1025) {
      const sidebar = document.getElementById('sidebar-form-container');
      if (sidebar) {
        sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    
    const id = Number(applyBtn.dataset.id);
    const wrapper = document.querySelector(`.job-card-wrapper[data-id="${id}"]`);
    
    if (wrapper) {
      wrapper.classList.add('expanded');
    }
  });

  // NOUVEAU : Gestionnaire pour le bouton retour
  wrap.addEventListener("click", (e) => {
    const backBtn = e.target.closest("button.btn-back-flip");
    if (!backBtn) return;
    
    const wrapper = backBtn.closest('.job-card-wrapper');
    if (wrapper) {
      wrapper.classList.remove('expanded');
    }
  });
}

loadJobs();