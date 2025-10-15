// /public/js/load-jobs.js

async function fetchAds() {
  try {
    const r = await fetch("/api/ads", { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return Array.isArray(data) ? data : data.ads || [];
  } catch (e) {
    console.error("fetchAds error:", e);
    return [];
  }
}

const adDetailsCache = new Map();

async function fetchAdDetails(adId) {
  const key = Number(adId);
  if (adDetailsCache.has(key)) return adDetailsCache.get(key);
  try {
    const r = await fetch(`/api/ads/${key}/detail`, {
      credentials: "include",
    });
    if (!r.ok) throw new Error(`fetch detail failed with ${r.status}`);
    const data = await r.json();
    const ad = data?.ad || null;
    if (ad) {
      adDetailsCache.set(key, ad);
    }
    return ad;
  } catch (e) {
    console.error("fetchAdDetails error:", e);
    return null;
  }
}

// Vérifier si l'utilisateur a déjà postulé
async function checkIfAlreadyApplied(adId) {
  try {
    const r = await fetch(`/api/ads/${adId}/check-applied`, {
      credentials: "include",
    });
    if (!r.ok) return false;
    const data = await r.json();
    return data.already_applied || false;
  } catch {
    return false;
  }
}

// Fonction pour activer le formulaire et afficher les infos de l'offre
function enableApplicationForm(adId, ad, alreadyApplied = false) {
  const fieldset = document.getElementById("apply-fieldset");
  const submitBtn = document.getElementById("apply-submit-btn");
  const adIdInput = document.getElementById("apply-ad-id");
  const jobInfo = document.getElementById("apply-job-info");
  const jobTitle = document.getElementById("apply-job-title");
  const companyName = document.getElementById("apply-company-name");

  if (adIdInput) adIdInput.value = adId;

  // Afficher les informations de l'offre
  if (jobInfo && jobTitle && companyName && ad) {
    jobTitle.textContent = ad.job_title || "";
    companyName.textContent = ad.company_name || "";
    jobInfo.style.display = "block";
  }

  if (fieldset) {
    if (alreadyApplied) {
      // Désactiver le formulaire
      fieldset.disabled = true;
      if (submitBtn) {
        submitBtn.textContent = "✓ Déjà postulé";
        submitBtn.style.backgroundColor = "#6c757d";
      }
    } else {
      // Activer le formulaire
      fieldset.disabled = false;
      if (submitBtn) {
        submitBtn.textContent = "Envoyer la candidature";
        submitBtn.style.backgroundColor = "";
      }
    }
  }
}

// ---- Helpers -------------------------------------------------
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

function formatContractType(type) {
  const labels = {
    cdi: "CDI",
    cdd: "CDD",
    interim: "Intérim",
    stage: "Stage",
    alternance: "Alternance",
    freelance: "Freelance",
  };
  return labels[type] || type;
}

// Formulaire de candidature (mobile = au dos de la carte ; desktop = sidebar)
function generateApplicationForm(jobId, context = "mobile", userData = null) {
  const idSuffix = context === "desktop" ? "desktop" : jobId;
  const isDesktop = context === "desktop";

  return `
    <form class="quick-apply-form" data-job-id="${jobId}" data-context="${context}">
      <div class="form-group">
        <label for="name-${idSuffix}">Nom complet *</label>
        <input type="text" id="name-${idSuffix}" name="name" required
               value="${esc(userData?.name || "")}" placeholder="Jean Dupont">
      </div>

      <div class="form-group">
        <label for="email-${idSuffix}">Email *</label>
        <input type="email" id="email-${idSuffix}" name="email" required
               value="${esc(
                 userData?.email || ""
               )}" placeholder="jean.dupont@email.com">
      </div>

      <div class="form-group">
        <label for="phone-${idSuffix}">Téléphone *</label>
        <input type="tel" id="phone-${idSuffix}" name="phone" required
               value="${esc(
                 userData?.phone || ""
               )}" placeholder="06 12 34 56 78">
      </div>

      <div class="form-group">
        <label for="cv-${idSuffix}">CV (PDF, max 5Mo) *</label>
        <input type="file" id="cv-${idSuffix}" name="cv" accept=".pdf" required>
      </div>

      ${
        isDesktop
          ? `
        <div class="form-group">
          <label for="message-${idSuffix}">Message de motivation</label>
          <textarea id="message-${idSuffix}" name="message" rows="4"
            placeholder="Parlez-nous de vous..."></textarea>
        </div>
        <button type="submit" class="btn btn-submit">Envoyer ma candidature</button>
      `
          : `
        <div class="form-actions-flip">
          <button type="button" class="btn btn-secondary btn-back-flip">← Retour</button>
          <button type="submit" class="btn btn-submit">Envoyer</button>
        </div>
      `
      }
    </form>
  `;
}

function adCard(a) {
  const salary = formatSalary(a.salary_min, a.salary_max, a.currency);
  return `
    <div class="job-card-wrapper" data-id="${a.ad_id}">
      <div class="job-card-inner">
        <!-- RECTO -->
        <article class="job-card job-card-front" data-id="${a.ad_id}">
          <h3>${esc(a.job_title)}</h3>
          <p class="company-name">${esc(a.company_name ?? "")}</p>
          <p class="muted">
            ${esc(a.location ?? "")}
            ${
              a.contract_type
                ? ` — <span class="contract-type">${esc(
                    formatContractType(a.contract_type)
                  )}</span>`
                : ""
            }
          </p>
          <p class="salary">${esc(salary)}</p>
          <div class="job-card-actions">
            <button class="btn btn-details js-more" data-id="${
              a.ad_id
            }">En savoir plus</button>
          </div>
        </article>

        <!-- VERSO (mobile) -->
        <div class="job-card job-card-back">
          <h3>Candidature rapide</h3>
          ${generateApplicationForm(a.ad_id, "mobile", null)}
        </div>
      </div>
    </div>
  `;
}

// ---- Main loader --------------------------------------------
async function loadJobs() {
  const wrap = document.getElementById("jobs-list");
  if (!wrap) return;

  const ads = await fetchAds();
  if (!ads?.length) {
    wrap.innerHTML = `<p class="error">Aucune offre à afficher.</p>`;
    return;
  }
  wrap.innerHTML = ads.map(adCard).join("");

  // Sidebar form (desktop)
  const sidebar = document.getElementById("sidebar-form-container");
  if (sidebar) {
    sidebar.innerHTML = `
      <h3 style="margin-top:0">Candidature rapide</h3>
      ${generateApplicationForm("general", "desktop", null)}
    `;
  }

  // ---------- Evénements (délégation sur le container) ----------

  // Déployer / replier les détails
    wrap.addEventListener("click", async (e) => {
    const moreBtn = e.target.closest("button.js-more[data-id]");
    if (!moreBtn) return;

    const id = Number(moreBtn.dataset.id);
    const summary = ads.find((x) => x.ad_id === id);
    if (!summary) return;

    const card = moreBtn.closest(".job-card");
    if (!card) return;

    const existing = card.querySelector(".job-details");
    if (existing) {
      existing.remove();
      if (!card.querySelector(".job-card-actions")) {
        card.insertAdjacentHTML(
          "beforeend",
          `<div class="job-card-actions">
             <button class="btn btn-details js-more" data-id="${id}">En savoir plus</button>
           </div>`
        );
      }
      return;
    }

    const detail = await fetchAdDetails(id);
    if (!detail) {
      console.error("Impossible de charger les details de l'offre:", id);
      return;
    }

    const combined = { ...summary, ...detail };
    const salary = formatSalary(
      combined.salary_min,
      combined.salary_max,
      combined.currency
    );

    card.querySelector(".job-card-actions")?.remove();

    const alreadyApplied = await checkIfAlreadyApplied(id);
    const applyButtonHTML = alreadyApplied
      ? `<button class="btn btn-apply js-apply" data-id="${id}" disabled style="background-color: #1fa435ff; transition:none; transform:none; box-shadow:none; pointer-events:none;">Deja postule</button>`
      : `<button class="btn btn-apply js-apply" data-id="${id}">Candidature rapide</button>`;

    card.insertAdjacentHTML(
      "beforeend",
      `
  <div class="job-details">
    <h4>Details</h4>
    <p><strong>Poste :</strong> ${esc(combined.job_title)}</p>
    <p><strong>Entreprise :</strong> ${esc(combined.company_name ?? "")}</p>
    <p><strong>Lieu :</strong> ${esc(combined.location ?? "")}</p>
    <p><strong>Contrat :</strong> ${esc(
      formatContractType(combined.contract_type) ?? ""
    )}</p>
    <p><strong>Salaire :</strong> ${esc(salary)}</p>
    ${
      combined.job_description
        ? `<p><strong>Description :</strong><br>${esc(
            combined.job_description
          )}</p>`
        : ""
    }
    ${
      combined.requirements
        ? `<p><strong>Besoins / Pre-requis :</strong><br>${esc(
            combined.requirements
          )}</p>`
        : ""
    }
    <div class="job-details-actions">
      ${applyButtonHTML}
      <button class="btn btn-secondary js-close-details" data-id="${id}">Reduire</button>
    </div>
  </div>
  `
    );
  });


  // Bouton "Réduire"
  wrap.addEventListener("click", (e) => {
    const closeBtn = e.target.closest(".js-close-details");
    if (!closeBtn) return;

    const card = closeBtn.closest(".job-card");
    card?.querySelector(".job-details")?.remove();
    const id = closeBtn.dataset.id;
    if (!card.querySelector(".job-card-actions")) {
      card.insertAdjacentHTML(
        "beforeend",
        `<div class="job-card-actions">
           <button class="btn btn-details js-more" data-id="${id}">En savoir plus</button>
         </div>`
      );
    }
  });

  // "Candidature rapide" -> vérifier si déjà postulé et activer le formulaire
  wrap.addEventListener("click", async (e) => {
    const applyBtn = e.target.closest("button.js-apply[data-id]");
    if (!applyBtn) return;

    const id = Number(applyBtn.dataset.id);

    // Si le bouton est déjà désactivé (déjà postulé), ne rien faire
    if (applyBtn.disabled) {
      return;
    }

    // Trouver l'annonce correspondante
    const ad = ads.find((x) => x.ad_id === id);

    // Vérifier si déjà postulé
    const alreadyApplied = await checkIfAlreadyApplied(id);

    // Activer le formulaire avec les infos de l'offre
    enableApplicationForm(id, ad, alreadyApplied);

    if (window.innerWidth >= 1025) {
      const side = document.querySelector(".sidebar-form");
      if (side) side.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const wrapper = document.querySelector(
      `.job-card-wrapper[data-id="${id}"]`
    );
    if (wrapper) wrapper.classList.add("expanded");
  });

  // Bouton retour du flip mobile
  wrap.addEventListener("click", (e) => {
    const backBtn = e.target.closest("button.btn-back-flip");
    if (!backBtn) return;
    backBtn.closest(".job-card-wrapper")?.classList.remove("expanded");
  });
}

// Go!
loadJobs();
