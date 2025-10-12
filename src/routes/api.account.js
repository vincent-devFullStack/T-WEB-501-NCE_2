import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

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

    await pool.query(
      `UPDATE people
       SET first_name = ?, last_name = ?, phone = ?, linkedin_url = ?
       WHERE person_id = ?`,
      [
        first_name.trim(),
        last_name.trim(),
        phone || null,
        linkedin_url || null,
        req.user.id,
      ]
    );

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
    const [rows] = await pool.query(
      `SELECT c.company_id, c.company_name
       FROM people p
       JOIN companies c ON c.company_id = p.company_id
       WHERE p.person_id = ?
       LIMIT 1`,
      [req.user.id]
    );
    res.json({ company: rows[0] || null });
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

    // Chercher une entreprise de même nom (insensible à la casse)
    const [existing] = await pool.query(
      `SELECT company_id, company_name FROM companies WHERE LOWER(company_name) = LOWER(?) LIMIT 1`,
      [name]
    );

    let companyId = existing[0]?.company_id;
    if (!companyId) {
      // Créer la nouvelle entreprise
      const [ins] = await pool.query(
        `INSERT INTO companies (company_name, created_at) VALUES (?, NOW())`,
        [name]
      );
      companyId = ins.insertId;
    }

    // Attacher l'utilisateur à cette entreprise
    await pool.query(`UPDATE people SET company_id = ? WHERE person_id = ?`, [
      companyId,
      req.user.id,
    ]);

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
    const [[user]] = await pool.query(
      `SELECT company_id FROM people WHERE person_id = ?`,
      [req.user.id]
    );

    if (!user?.company_id) {
      return res.status(400).json({ error: "Aucune entreprise rattachée." });
    }

    // Mettre à jour le nom de l'entreprise
    await pool.query(
      `UPDATE companies SET company_name = ? WHERE company_id = ?`,
      [company_name.trim(), user.company_id]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/account/company error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default r;
