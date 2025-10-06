import { pool } from "../db.js";

export async function listCompanies(_req, res) {
  const [rows] = await pool.query(
    "SELECT company_id, company_name FROM companies ORDER BY company_name"
  );
  res.json(rows);
}
