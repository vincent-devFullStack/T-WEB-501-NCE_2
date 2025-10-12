// src/routes/ads.js
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

/**
 * GET /ads/new – page de création (réservée aux recruteurs)
 */
r.get("/new", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        p.email,
        p.company_id,
        c.*
      FROM people p
      LEFT JOIN companies c ON c.company_id = p.company_id
      WHERE p.person_id = ?
      `,
      [req.user.id]
    );

    const u = rows?.[0] || {};

    // Fallbacks possibles selon la colonne réellement présente dans "companies"
    const computedCompanyName =
      u.company_name ?? u.name ?? u.nom ?? u.title ?? null;

    return res.render("ads/create", {
      title: "Créer une offre",
      userHasCompany: Boolean(u?.company_id),
      companyName: computedCompanyName,
      userEmail: u?.email || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors du chargement de la page.");
  }
});

/**
 * GET /ads/my-ads - Mes offres (réservée aux recruteurs)
 */
r.get("/my-ads", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    const [ads] = await pool.query(
      `
      SELECT 
        a.*,
        c.company_name
      FROM advertisements a
      LEFT JOIN companies c ON a.company_id = c.company_id
      WHERE a.contact_person_id = ?
      ORDER BY a.created_at DESC
      `,
      [req.user.id]
    );

    return res.render("ads/my-ads", {
      title: "Mes offres",
      ads: ads,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors du chargement de vos offres.");
  }
});

/**
 * POST /ads – crée l'annonce (réservée aux recruteurs)
 */
r.post("/", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    // Récupérer company_id du recruteur connecté
    const [[me]] = await pool.query(
      "SELECT company_id, email FROM people WHERE person_id = ?",
      [req.user.id]
    );

    if (!me?.company_id) {
      // Pas d'entreprise rattachée -> on ré-affiche la page avec un état adapté
      return res.status(400).render("ads/create", {
        title: "Créer une offre",
        userHasCompany: false,
        companyName: null,
        userEmail: me?.email || null,
      });
    }

    // Whitelist des champs autorisés
    const {
      job_title,
      location,
      job_description,
      requirements,
      contract_type,
      working_time,
      experience_level,
      remote_option,
      salary_min,
      salary_max,
      currency,
      deadline_date,
      status,
    } = req.body || {};

    // Validation minimale côté serveur
    if (!job_title || !contract_type || !status) {
      return res.status(422).send("Champs requis manquants.");
    }

    // Insertion de l'offre
    await pool.query(
      `
      INSERT INTO advertisements
        (company_id, contact_person_id, job_title, job_description, requirements, location,
         contract_type, working_time, experience_level, remote_option,
         salary_min, salary_max, currency, deadline_date, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        me.company_id,
        req.user.id,
        job_title?.trim(),
        job_description?.trim() || null,
        requirements?.trim() || null,
        location?.trim() || null,
        contract_type || null,
        working_time || null,
        experience_level || null,
        remote_option || null,
        salary_min ? Number(salary_min) : null,
        salary_max ? Number(salary_max) : null,
        currency || "EUR",
        deadline_date || null,
        status || null,
      ]
    );

    // Redirection simple après création
    return res.redirect("/");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors de la création de l'offre.");
  }
});

export default r;
