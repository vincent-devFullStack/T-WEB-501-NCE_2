// src/routes/ads.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Ad } from "../models/Ad.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Application } from "../models/Application.js";

const r = Router();

/**
 * GET /ads - Liste publique de toutes les offres actives
 */
r.get("/", async (req, res) => {
  try {
    const companyIdParam = req.query.company_id;
    const companyId = companyIdParam ? Number.parseInt(companyIdParam, 10) : null;
    const PAGE_SIZE = 9;
    const pageParam = Number.parseInt(req.query.page, 10);
    let currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const finalCompanyId = Number.isInteger(companyId) && companyId > 0 ? companyId : null;

    let { items: advertisements = [], total } = await Ad.listPublicActive({
      companyId: finalCompanyId,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    });
    total = Number.isFinite(total) ? total : 0;

    const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
    if (total > 0 && currentPage > totalPages) {
      currentPage = totalPages;
      ({ items: advertisements = [] } = await Ad.listPublicActive({
        companyId: finalCompanyId,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      }));
    }

    const params = new URLSearchParams(req.query);
    params.delete("page");
    const baseQuery = params.toString();
    const queryPrefix = baseQuery ? `${baseQuery}&` : "";

    let companyInfo = null;
    if (finalCompanyId) {
      companyInfo = await Company.findById(finalCompanyId);
    }

    return res.render("ads/list", {
      title: companyInfo
        ? `Offres chez ${companyInfo.company_name}`
        : "Toutes les offres",
      offres: advertisements,
      companyFilter: companyInfo,
      pagination: {
        currentPage,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
        previousPage: currentPage - 1,
        nextPage: currentPage + 1,
        queryPrefix,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors du chargement des offres.");
  }
});


/**
 * GET /ads/new – page de création (réservée aux recruteurs)
 */
r.get("/new", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    const u = await User.getRecruiterContext(req.user.id);

    const computedCompanyName = u?.company_name ?? null;

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
    const ads = await Ad.listForRecruiter(req.user.id);

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
 * GET /ads/:id/candidatures - Gestion des candidatures (Kanban)
 */
r.get(
  "/:id/candidatures",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const adId = Number(req.params.id);

      // Vérifier que l'offre appartient bien à l'utilisateur
      const ad = await Ad.findForRecruiter(adId, req.user.id);

      if (!ad) {
        return res.status(403).send("Accès refusé ou offre introuvable.");
      }

      // Récupérer toutes les candidatures pour cette offre
      const applications = await Application.listWithCandidateByAd(adId);

      return res.render("ads/candidatures", {
        title: `Candidatures - ${ad.job_title}`,
        ad: ad,
        applications: applications,
      });
    } catch (e) {
      console.error(e);
      return res
        .status(500)
        .send("Erreur lors du chargement des candidatures.");
    }
  }
);

/**
 * POST /ads – crée l'annonce (réservée aux recruteurs)
 */
r.post("/", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    // Récupérer company_id du recruteur connecté
    const me = await User.getRecruiterContext(req.user.id);

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
    await Ad.createForRecruiter({
      recruiterId: req.user.id,
      companyId: me.company_id,
      data: {
        job_title,
        job_description,
        requirements,
        location,
        contract_type,
        working_time,
        experience_level,
        remote_option,
        salary_min,
        salary_max,
        currency,
        deadline_date,
        status,
      },
    });

    // Redirection simple après création
    return res.redirect("/");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors de la création de l'offre.");
  }
});

/**
 * GET /ads/:id/edit - Page de modification d'une offre
 */
r.get("/:id/edit", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    const adId = Number(req.params.id);

    // Récupérer l'offre et vérifier qu'elle appartient à l'utilisateur
    const ad = await Ad.findForRecruiter(adId, req.user.id);

    if (!ad) {
      return res.status(403).send("Accès refusé ou offre introuvable.");
    }

    return res.render("ads/edit", {
      title: `Modifier - ${ad.job_title}`,
      ad: ad,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors du chargement de l'offre.");
  }
});

/**
 * POST /ads/:id/edit - Mise à jour d'une offre
 */
r.post("/:id/edit", requireAuth, requireRole("recruteur"), async (req, res) => {
  try {
    const adId = Number(req.params.id);

    // Vérifier que l'offre appartient à l'utilisateur
    const ad = await Ad.ensureOwnership(adId, req.user.id);

    if (!ad) {
      return res.status(403).send("Accès refusé.");
    }

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

    // Validation
    if (!job_title || !contract_type || !status) {
      return res.status(422).send("Champs requis manquants.");
    }

    // ⚠️ IMPORTANT: Convertir le statut avec le même mapping que l'API
    const STATUS_MAP = {
      active: "active",
      brouillon: "brouillon",
      draft: "brouillon",
      fermee: "fermee",
      inactive: "fermee",
    };

    const dbStatus = STATUS_MAP[status.toLowerCase()] || status;

    // Mise à jour
    await Ad.updateForRecruiter(adId, req.user.id, {
      job_title,
      job_description,
      requirements,
      location,
      contract_type,
      working_time,
      experience_level,
      remote_option,
      salary_min,
      salary_max,
      currency,
      deadline_date,
      status: dbStatus,
    });

    return res.redirect("/ads/my-ads");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Erreur lors de la modification de l'offre.");
  }
});

export default r;
