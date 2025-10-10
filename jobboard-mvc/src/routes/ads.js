import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
// import { pool } from "../config/db.js"; // si tu fais le POST ensuite

const r = Router();

// Formulaire de création (recruteur/admin uniquement)
r.get("/create", requireAuth, requireRole("recruteur", "admin"), (req, res) => {
  res.render("ads/create", { title: "Créer une offre" });
});

// (Optionnel) Traitement du POST – à faire plus tard
// r.post("/", requireAuth, requireRole("recruteur", "admin"), async (req, res) => {
//   try {
//     // TODO: validations + INSERT dans `advertisements`
//     res.redirect("/"); // ou /ads
//   } catch (e) {
//     console.error(e);
//     res.status(500).render("500", { title: "Erreur serveur" });
//   }
// });

export default r;
