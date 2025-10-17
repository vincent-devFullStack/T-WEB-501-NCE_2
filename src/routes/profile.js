import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

const r = Router();

// Affiche la page profil pour l'utilisateur connecté
r.get("/", requireAuth, async (req, res) => {
  try {
    const row = await User.fetchProfileRow(req.user.id);
    const u = row
      ? {
          person_id: row.person_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          linkedin_url: row.linkedin_url,
          role: row.role,
          company_id: row.company_id,
          company_name: row.company_name ?? null,
        }
      : null;

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
