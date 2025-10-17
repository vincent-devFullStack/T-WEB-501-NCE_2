// src/routes/api.ads.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { Ad } from "../models/Ad.js";
import { Application } from "../models/Application.js";
import { User } from "../models/User.js";

const router = Router();

// ------------------------------------------------------------------
// Configuration de multer avec Cloudinary
// ------------------------------------------------------------------
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont acceptés"));
    }
  },
});

// ------------------------------------------------------------------
// GET /api/ads  -> liste des annonces actives (publique)
// ------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const limitParam = Number.parseInt(req.query.limit, 10);
    const pageParam = Number.parseInt(req.query.page, 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const offset = (page - 1) * limit;

    const { items = [], total = 0 } = await Ad.listPublicActive({
      limit,
      offset,
      withTotal: true,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      ads: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevious: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des annonces:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------------------------------------------
// Helpers: statut UI -> statut DB
// ------------------------------------------------------------------
const STATUS_MAP = new Map([
  ["active", "active"],
  ["brouillon", "brouillon"],
  ["draft", "brouillon"],
  ["fermee", "fermee"],
  ["inactive", "fermee"],
]);

function toDbStatus(input) {
  if (!input) return null;
  const key = String(input).toLowerCase();
  return STATUS_MAP.get(key) ?? null;
}

// ------------------------------------------------------------------
// ⚠️ IMPORTANT : Routes spécifiques AVANT les routes avec :id
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// GET /api/ads/notifications/count - Compter les candidatures non traitées (recruteur)
// ------------------------------------------------------------------
router.get(
  "/notifications/count",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const count = await Application.countNewForRecruiter(req.user.id);
      res.json({ count });
    } catch (e) {
      console.error("Erreur notifications count:", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ------------------------------------------------------------------
// PATCH /api/ads/applications/:id - Modifier le statut d'une candidature (Kanban)
// ------------------------------------------------------------------
router.patch(
  "/applications/:id",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const appId = Number(req.params.id);
      const { status } = req.body;

      // Statuts valides pour le kanban
      const validStatuses = [
        "recu",
        "a_appeler",
        "a_recevoir",
        "refuse",
        "recrute",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      // Vérifier que la candidature appartient à une offre du recruteur
      const updated = await Application.updateStatusForRecruiter(
        appId,
        req.user.id,
        status
      );

      if (!updated) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      res.json({ ok: true, message: "Statut mis à jour" });
    } catch (e) {
      console.error("Erreur update status:", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ------------------------------------------------------------------
// Routes avec :id (doivent être APRÈS les routes spécifiques)
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// GET /api/ads/:id/notifications/count - Compter les candidatures "reçues" pour une offre
// ------------------------------------------------------------------
router.get(
  "/:id/notifications/count",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const adId = Number(req.params.id);

      const owned = await Ad.ensureOwnership(adId, req.user.id);
      if (!owned) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      const count = await Application.countNewForAd(adId, req.user.id);

      res.json({ count });
    } catch (e) {
      console.error("Erreur notifications count:", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ------------------------------------------------------------------
// Vérifier si l'utilisateur a déjà postulé (sauf si refusé)
// ------------------------------------------------------------------
async function sendAdDetail(req, res) {
  try {
    const adId = Number(req.params.id);
    if (!Number.isInteger(adId) || adId <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }
    const ad = await Ad.findPublicById(adId);
    if (!ad) {
      return res.status(404).json({ error: "Offre introuvable" });
    }
    return res.json({ ad });
  } catch (e) {
    console.error("Erreur lors du chargement du detail d'offre:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

router.get("/:id/detail", sendAdDetail);

router.get("/:id/check-applied", async (req, res) => {
  try {
    const adId = Number(req.params.id);
    if (!Number.isInteger(adId) || adId <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }
    if (!req.user?.id) {
      return res.json({ already_applied: false });
    }

    const alreadyApplied = await Application.hasNonRefusedForPerson(
      adId,
      req.user.id
    );

    return res.json({ already_applied: alreadyApplied });
  } catch (e) {
    console.error("Check applied error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:id", sendAdDetail);

// ------------------------------------------------------------------
// POST /api/ads/:id/apply - Soumettre une candidature
// ------------------------------------------------------------------
router.post("/:id/apply", upload.single("cv"), async (req, res) => {
  try {
    const adId = Number(req.params.id);

    // Vérifier que l'offre existe et est active
    const ad = await Ad.findActiveById(adId);

    if (!ad) {
      return res.status(404).json({ error: "Offre introuvable ou inactive" });
    }

    const { full_name, email, phone, message } = req.body;

    // Cloudinary retourne l'URL dans req.file.path
    const cvPath = req.file ? req.file.path : null;

    // Validation
    if (!full_name || !email || !phone || !cvPath) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    // Vérifier si l'utilisateur est connecté
    let personId = req.user?.id || null;

    if (!personId) {
      personId = await User.ensureCandidateByEmail({
        email,
        fullName: full_name,
        phone,
      });
    }

    const result = await Application.createOrReapply({
      adId,
      personId,
      cvPath,
      coverLetter: message || null,
    });

    if (result.status === "exists") {
      return res.status(409).json({
        error: "Vous avez déjà postulé à cette offre",
      });
    }

    res.json({ ok: true, message: "Candidature envoyée avec succès" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur lors de l'envoi de la candidature" });
  }
});

// ------------------------------------------------------------------
// DELETE /api/ads/:id  -> supprimer une offre (recruteur propriétaire)
// ------------------------------------------------------------------
router.delete(
  "/:id",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const adId = Number(req.params.id);
      if (!adId) return res.status(400).json({ error: "ID invalide" });

      const ownership = await Ad.ensureOwnership(adId, req.user.id);
      if (!ownership) {
        const existing = await Ad.findById(adId);
        return res
          .status(existing ? 403 : 404)
          .json({ error: existing ? "Non autorisé" : "Non trouvé" });
      }

      await Ad.removeForRecruiter(adId, req.user.id);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ------------------------------------------------------------------
// PATCH /api/ads/:id  -> modifier le statut (recruteur propriétaire)
// Body: { status: "active" | "brouillon" | "fermee" | "inactive" }
// ------------------------------------------------------------------
router.patch(
  "/:id",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const adId = Number(req.params.id);
      if (!adId) return res.status(400).json({ error: "ID invalide" });

      const dbStatus = toDbStatus(req.body?.status);
      if (!dbStatus) return res.status(400).json({ error: "Statut invalide" });

      const updated = await Ad.updateStatusForRecruiter(
        adId,
        req.user.id,
        dbStatus
      );
      if (!updated) {
        const existing = await Ad.findById(adId);
        return res
          .status(existing ? 403 : 404)
          .json({ error: existing ? "Non autorisé" : "Non trouvé" });
      }

      res.json({ ok: true, status: dbStatus });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
