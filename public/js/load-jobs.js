// load-jobs.js
import { advertisements } from './mock-data.js';

console.log('✅ Données chargées:', advertisements);

function displayJobs(jobs) {
  const container = document.getElementById('jobs-list');
  
  if (!container) {
    console.error('❌ Conteneur jobs-list introuvable');
    return;
  }
  
  if (!jobs || jobs.length === 0) {
    container.innerHTML = '<p>Aucune offre disponible pour le moment.</p>';
    return;
  }
  
  container.innerHTML = jobs.map(job => `
    <div class="job-card">
      <h3>${job.job_title}</h3>
      <p class="company">${job.company_name} — ${job.location}</p>
      <p class="salary">
        ${job.salary_min && job.salary_max 
          ? `De ${job.salary_min}€ à ${job.salary_max}€ par an` 
          : 'Salaire non communiqué'}
      </p>
      <p class="contract">${job.contract_type.toUpperCase()} • ${job.working_time.replace('_', ' ')}</p>
      <button class="apply-btn" onclick="location.href='/offre/${job.ad_id}'">
        Voir l'offre
      </button>
    </div>
  `).join('');
  
  console.log('✅ Offres affichées avec succès');
}

displayJobs(advertisements);
