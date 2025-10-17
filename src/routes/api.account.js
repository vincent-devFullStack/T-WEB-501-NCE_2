import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";

const r = Router();

// ========================================
// Profil utilisateur
// ========================================

/**
 * POST /api/account/profile
 * Mettre à jour les infos de profil (prénom, nom, téléphone, linkedin)
 */
r.post("/profile", requireAuth, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone = null,
      linkedin_url = null,
    } = req.body || {};

    if (!first_name || !last_name) {
      return res.status(400).json({ error: "Prénom et nom sont requis." });
    }

    await User.update(req.user.id, {
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      phone: phone || null,
      linkedinUrl: linkedin_url || null,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/account/profile error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ========================================
// Gestion d'entreprise (recruteur)
// ========================================

/**
 * GET /api/account/company
 * Renvoie l'entreprise rattachée à l'utilisateur courant (ou null)
 */
r.get("/company", requireAuth, async (req, res) => {
  try {
    const company = await Company.findByUserId(req.user.id);
    res.json({ company: company || null });
  } catch (e) {
    console.error("GET /api/account/company error:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * POST /api/account/company
 * body: { company_name }
 * Crée (si besoin) l'entreprise et la rattache à l'utilisateur courant
 */
r.post("/company", requireAuth, async (req, res) => {
  try {
    const { company_name } = req.body || {};
    if (!company_name?.trim()) {
      return res
        .status(400)
        .json({ error: "Le nom de l'entreprise est requis." });
    }

    const name = company_name.trim();
    const ensured = await Company.ensureByName(name);
    const companyId = ensured?.company_id ?? ensured?.id;

    await Company.attachToUser(req.user.id, companyId);

    return res
      .status(201)
      .json({ ok: true, company_id: companyId, company_name: name });
  } catch (e) {
    console.error("POST /api/account/company error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * PUT /api/account/company
 * body: { company_name }
 * Modifie le nom de l'entreprise rattachée à l'utilisateur
 */
r.put("/company", requireAuth, async (req, res) => {
  try {
    const { company_name } = req.body || {};
    if (!company_name?.trim()) {
      return res
        .status(400)
        .json({ error: "Le nom de l'entreprise est requis." });
    }

    // Récupérer l'entreprise actuelle de l'utilisateur
    const company = await Company.findByUserId(req.user.id);

    if (!company?.company_id) {
      return res.status(400).json({ error: "Aucune entreprise rattachée." });
    }

    await Company.updateName(company.company_id, company_name.trim());

    return res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/account/company error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default r;
