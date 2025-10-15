// Centralise la logique liée aux entreprises via le modèle
import { Company } from "../models/Company.js";

/** Crée l'entreprise si elle n'existe pas (par nom) et renvoie {company_id, company_name} */
export async function ensureCompanyByName(companyName) {
  return Company.ensureByName(companyName);
}

/** Rattache une entreprise à un utilisateur (people.company_id) */
export async function attachCompanyToUser(personId, companyId) {
  await Company.attachToUser(personId, companyId);
}

/** Récupère l'entreprise d'un utilisateur (si rattachée) */
export async function getUserCompany(personId) {
  return Company.findByUserId(personId);
}

