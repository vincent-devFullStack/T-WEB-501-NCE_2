// public/js/load-jobs.js
import { advertisements } from "./mock-data.js";

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
  return `Jusqu’à ${fmt.format(max)}`;
}

function adCard(a) {
  const salary = formatSalary(a.salary_min, a.salary_max, a.currency);
  return `
    <article class="job-card" data-id="${a.ad_id}">
      <h3>${esc(a.job_title)}</h3>
      <p>${esc(a.company_name ?? "")}</p>
      <p class="muted">${esc(a.location ?? "")} — ${esc(
    a.contract_type ?? ""
  )}</p>
      <p class="muted"><strong>Salaire :</strong> ${esc(salary)}</p>
      <button class="btn js-more" data-id="${a.ad_id}">En savoir plus</button>
    </article>`;
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

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button.js-more[data-id]");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const ad = ads.find((x) => x.ad_id === id);
    if (!ad) return;

    const host = btn.closest(".job-card");

    // supprimer le bouton “En savoir plus”
    btn.remove();

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
        <button class="btn btn-secondary js-close-details">Fermer</button>
      </div>
      `
    );

    // quand on ferme, on retire le bloc et on remet le bouton
    host.querySelector(".js-close-details")?.addEventListener("click", () => {
      host.querySelector(".job-details")?.remove();
      host.insertAdjacentHTML(
        "beforeend",
        `<button class="btn js-more" data-id="${ad.ad_id}">En savoir plus</button>`
      );
    });
  });
}

loadJobs();
