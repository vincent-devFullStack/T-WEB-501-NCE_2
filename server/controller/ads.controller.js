// import { pool } from "../db.js";

// export async function listAds(_req, res) {
//   const [rows] = await pool.query(
//     `SELECT a.ad_id, a.job_title, a.status, c.company_name
//      FROM advertisements a
//      JOIN companies c ON c.company_id=a.company_id
//      WHERE a.status='active'
//      ORDER BY a.created_at DESC
//      LIMIT 50`
//   );
//   res.json(rows);
// }

// server/controller/ads.controller.js
import { pool } from "../db.js";

// Si tu veux pouvoir forcer les mocks: mets USE_MOCK=1 dans .env
const USE_MOCK = process.env.USE_MOCK === "1";

export async function listAds(_req, res) {
  try {
    if (USE_MOCK) {
      // fallback mock (chargé dynamiquement pour éviter les soucis ESM)
      const { advertisements } = await import("../../public/js/mock-data.js");
      return res.json(advertisements);
    }

    // ⚠️ corrige bien la jointure (typo vue dans ta capture: "company_ida")
    const [rows] = await pool.query(`
      SELECT
        a.ad_id,
        a.job_title,
        a.status,
        a.location,
        a.contract_type,
        c.company_name
      FROM advertisements a
      LEFT JOIN companies c ON c.company_id = a.company_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    res.json(rows);
  } catch (err) {
    console.error("listAds error:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des annonces" });
  }
}
