import { pool } from "../config/db.js";

function normalizeName(name) {
  return String(name ?? "").trim();
}

export const Company = {
  async findByNameInsensitive(name) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const [rows] = await pool.query(
      "SELECT company_id, company_name FROM companies WHERE LOWER(company_name) = LOWER(?) LIMIT 1",
      [normalized]
    );
    return rows[0] || null;
  },

  async create({ name }) {
    const normalized = normalizeName(name);
    if (!normalized) throw new Error("company_name_required");
    const [res] = await pool.query(
      "INSERT INTO companies (company_name, created_at) VALUES (?, NOW())",
      [normalized]
    );
    return { company_id: res.insertId, company_name: normalized };
  },

  async ensureByName(name) {
    const existing = await this.findByNameInsensitive(name);
    if (existing) return existing;
    return this.create({ name });
  },

  async attachToUser(personId, companyId) {
    await pool.query("UPDATE people SET company_id = ? WHERE person_id = ?", [
      companyId,
      personId,
    ]);
  },

  async findByUserId(personId) {
    const [rows] = await pool.query(
      `SELECT c.company_id, c.company_name
         FROM people p
         JOIN companies c ON c.company_id = p.company_id
        WHERE p.person_id = ?
        LIMIT 1`,
      [personId]
    );
    return rows[0] || null;
  },
};

export default Company;
