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

  async findById(id) {
    if (!id) return null;
    const [rows] = await pool.query(
      `
        SELECT
          company_id,
          company_name,
          industry,
          company_size,
          website,
          city,
          country,
          created_at,
          updated_at
        FROM companies
        WHERE company_id = ?
        LIMIT 1
      `,
      [id]
    );
    return rows[0] || null;
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

  async updateName(companyId, name) {
    const normalized = normalizeName(name);
    if (!companyId) throw new Error("company_id_required");
    if (!normalized) throw new Error("company_name_required");
    await pool.query(
      "UPDATE companies SET company_name = ? WHERE company_id = ?",
      [normalized, companyId]
    );
    return this.findById(companyId);
  },

  async listIndustries() {
    const rows = await pool.query(
      `
        SELECT DISTINCT industry
        FROM companies
        WHERE industry IS NOT NULL AND industry <> ''
        ORDER BY industry ASC
      `
    );
    return rows
      .map((row) => row.industry)
      .filter((value) => Boolean(value));
  },

  async listWithActiveAds({ industry = null } = {}) {
    const filters = [];
    const params = [];

    if (industry) {
      filters.push("c.industry = ?");
      params.push(industry);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
        SELECT
          c.company_id,
          c.company_name,
          c.industry,
          c.created_at,
          COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_ads_count
        FROM companies c
        LEFT JOIN advertisements a ON a.company_id = c.company_id
        ${whereClause}
        GROUP BY c.company_id, c.company_name, c.industry, c.created_at
        ORDER BY c.company_name ASC
      `,
      params
    );
    return rows.map((company) => ({
      ...company,
      active_ads_count: Number(company.active_ads_count || 0),
    }));
  },
};

export default Company;
