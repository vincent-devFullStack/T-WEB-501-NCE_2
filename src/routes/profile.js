import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// Affiche la page profil pour l'utilisateur connecté
r.get("/", requireAuth, async (req, res) => {
  try {
    const [[u]] = await pool.query(
      `
      SELECT p.person_id, p.first_name, p.last_name, p.email, p.phone, p.linkedin_url,
             p.person_type AS role, p.company_id, c.company_name
      FROM people p
      LEFT JOIN companies c ON c.company_id = p.company_id
      WHERE p.person_id = ?
      `,
      [req.user.id]
    );

    if (!u) return res.status(404).render("404", { title: "404" });

    return res.render("profile/index", {
      title: "Mon profil",
      userData: u,
    });
  } catch (e) {
    console.error("GET /profil error:", e);
    return res.status(500).send("Erreur lors du chargement du profil.");
  }
});

export default r;
