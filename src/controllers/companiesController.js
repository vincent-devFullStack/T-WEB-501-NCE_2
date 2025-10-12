// Centralise la logique liée aux entreprises
import { pool } from "../config/db.js";

/** Crée l'entreprise si elle n'existe pas (par nom), et renvoie {company_id, company_name} */
export async function ensureCompanyByName(companyName) {
  const name = String(companyName || "").trim();
  if (!name) throw new Error("company_name_required");

  // Vérifie si elle existe déjà (insensibilité simple)
  const [existing] = await pool.query(
    "SELECT company_id, company_name FROM companies WHERE LOWER(company_name) = LOWER(?) LIMIT 1",
    [name]
  );
  if (existing.length) return existing[0];

  const [res] = await pool.query(
    "INSERT INTO companies (company_name, created_at) VALUES (?, NOW())",
    [name]
  );
  return { company_id: res.insertId, company_name: name };
}

/** Rattache une entreprise à un utilisateur (people.company_id) */
export async function attachCompanyToUser(personId, companyId) {
  await pool.query("UPDATE people SET company_id = ? WHERE person_id = ?", [
    companyId,
    personId,
  ]);
}

/** Récupère l’entreprise d’un utilisateur (si rattachée) */
export async function getUserCompany(personId) {
  const [rows] = await pool.query(
    `SELECT c.company_id, c.company_name
       FROM people p
       JOIN companies c ON c.company_id = p.company_id
      WHERE p.person_id = ?
      LIMIT 1`,
    [personId]
  );
  return rows[0] || null;
}
