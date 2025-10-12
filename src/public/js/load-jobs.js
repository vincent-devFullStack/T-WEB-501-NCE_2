// /public/js/load-jobs.js
// (peut être chargé en <script type="module">)

async function fetchAds() {
  try {
    const r = await fetch("/api/ads", { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    // Attendu: { ads: [...] } ou directement [...]
    return Array.isArray(data) ? data : data.ads || [];
  } catch (e) {
    console.error("fetchAds error:", e);
    return [];
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
  wrap.addEventListener("click", (e) => {
    const moreBtn = e.target.closest("button.js-more[data-id]");
    if (!moreBtn) return;

    const id = Number(moreBtn.dataset.id);
    const ad = ads.find((x) => x.ad_id === id);
    if (!ad) return;

    const card = moreBtn.closest(".job-card");
    if (!card) return;

    const existing = card.querySelector(".job-details");
    if (existing) {
      // Repli
      existing.remove();
      // Réinjection du bouton "En savoir plus"
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

    // On déploie
    card.querySelector(".job-card-actions")?.remove();
    const salary = formatSalary(ad.salary_min, ad.salary_max, ad.currency);

    card.insertAdjacentHTML(
      "beforeend",
      `
  <div class="job-details">
    <h4>Détails</h4>
    <p><strong>Poste :</strong> ${esc(ad.job_title)}</p>
    <p><strong>Entreprise :</strong> ${esc(ad.company_name ?? "")}</p>
    <p><strong>Lieu :</strong> ${esc(ad.location ?? "")}</p>
    <p><strong>Contrat :</strong> ${esc(
      formatContractType(ad.contract_type) ?? ""
    )}</p>
    <p><strong>Salaire :</strong> ${esc(salary)}</p>
    ${
      ad.job_description
        ? `<p><strong>Description :</strong><br>${esc(ad.job_description)}</p>`
        : ""
    }
    ${
      ad.requirements
        ? `<p><strong>Besoins / Pré-requis :</strong><br>${esc(
            ad.requirements
          )}</p>`
        : ""
    }
    <div class="job-details-actions">
      <button class="btn btn-apply js-apply" data-id="${id}">Candidature rapide</button>
      <button class="btn btn-secondary js-close-details" data-id="${id}">Réduire</button>
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

  // "Candidature rapide" -> flip mobile ou scroll sidebar desktop
  wrap.addEventListener("click", (e) => {
    const applyBtn = e.target.closest("button.js-apply[data-id]");
    if (!applyBtn) return;

    const id = Number(applyBtn.dataset.id);

    // ✅ IMPORTANT : Mettre à jour l'ID dans le formulaire
    const adIdField = document.getElementById("apply-ad-id");
    if (adIdField) {
      adIdField.value = id;
      console.log("✅ Offre sélectionnée pour candidature:", id);
    } else {
      console.error("❌ Champ apply-ad-id introuvable");
    }

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
