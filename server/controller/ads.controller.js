import { pool } from "../db.js";

export async function listAds(_req, res) {
  const [rows] = await pool.query(
    `SELECT a.ad_id, a.job_title, a.status, c.company_name
     FROM advertisements a
     JOIN companies c ON c.company_id=a.company_id
     WHERE a.status='active'
     ORDER BY a.created_at DESC
     LIMIT 50`
  );
  res.json(rows);
}
