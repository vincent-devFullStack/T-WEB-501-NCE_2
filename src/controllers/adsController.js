import { pool } from "../config/db.js";

export async function listAdsPage(req, res) {
  try {
    // Récupérer les annonces actives depuis la base de données
    const [ads] = await pool.query(`
      SELECT 
        a.*,
        c.company_name,
        CONCAT(p.first_name, ' ', p.last_name) as contact_name
      FROM advertisements a
      LEFT JOIN companies c ON a.company_id = c.company_id
      LEFT JOIN people p ON a.contact_person_id = p.person_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);

    return res.render("ads/index", {
      title: "Offres récentes",
      ads: ads,
    });
  } catch (error) {
    console.error("Erreur lors du chargement des annonces:", error);
    return res.render("ads/index", {
      title: "Offres récentes",
      ads: [],
    });
  }
}
