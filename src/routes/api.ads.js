// src/routes/api.ads.js
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { Ad } from "../models/Ad.js";

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
router.get("/", async (_req, res) => {
  try {
    const ads = await Ad.listPublicActive();
    res.json({ ads });
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
      const [[result]] = await pool.query(
        `SELECT COUNT(*) as count
         FROM applications ap
         JOIN advertisements ad ON ap.ad_id = ad.ad_id
         WHERE ad.contact_person_id = ? AND ap.status = 'recu'`,
        [req.user.id]
      );

      res.json({ count: result.count || 0 });
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
      const [[app]] = await pool.query(
        `SELECT ap.* FROM applications ap
         JOIN advertisements ad ON ap.ad_id = ad.ad_id
         WHERE ap.application_id = ? AND ad.contact_person_id = ?`,
        [appId, req.user.id]
      );

      if (!app) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      // Mettre à jour le statut
      await pool.query(
        "UPDATE applications SET status = ? WHERE application_id = ?",
        [status, appId]
      );

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

      // Vérifier que l'offre appartient au recruteur
      const [[ad]] = await pool.query(
        "SELECT ad_id FROM advertisements WHERE ad_id = ? AND contact_person_id = ?",
        [adId, req.user.id]
      );

      if (!ad) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      // Compter les candidatures avec statut 'recu'
      const [[result]] = await pool.query(
        `SELECT COUNT(*) as count
         FROM applications 
         WHERE ad_id = ? AND status = 'recu'`,
        [adId]
      );

      res.json({ count: result.count || 0 });
    } catch (e) {
      console.error("Erreur notifications count:", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// ------------------------------------------------------------------
// Vérifier si l'utilisateur a déjà postulé (sauf si refusé)
// ------------------------------------------------------------------
router.get("/:id/detail", async (req, res) => {
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
});

router.get("/:id/check-applied", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.json({ already_applied: false });
    }

    // Vérifier s'il existe une candidature NON refusée
    const [rows] = await pool.query(
      `SELECT application_id, status
       FROM applications 
       WHERE ad_id = ? AND person_id = ? AND status != 'refuse'
       LIMIT 1`,
      [req.params.id, req.user.id]
    );

    return res.json({ already_applied: rows.length > 0 });
  } catch (e) {
    console.error("Check applied error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------------------------------------------
// POST /api/ads/:id/apply - Soumettre une candidature
// ------------------------------------------------------------------
router.post("/:id/apply", upload.single("cv"), async (req, res) => {
  try {
    const adId = Number(req.params.id);

    // Vérifier que l'offre existe et est active
    const [[ad]] = await pool.query(
      "SELECT ad_id FROM advertisements WHERE ad_id = ? AND status = 'active'",
      [adId]
    );

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

    // Si pas connecté, créer ou trouver une personne avec cet email
    if (!personId) {
      const [[existingPerson]] = await pool.query(
        "SELECT person_id FROM people WHERE email = ?",
        [email]
      );

      if (existingPerson) {
        personId = existingPerson.person_id;
      } else {
        // Créer un compte candidat temporaire
        const [firstName, ...lastNameParts] = full_name.split(" ");
        const lastName = lastNameParts.join(" ") || "";

        const [result] = await pool.query(
          `INSERT INTO people (email, first_name, last_name, phone, person_type, created_at)
           VALUES (?, ?, ?, ?, 'candidat', NOW())`,
          [email, firstName, lastName, phone]
        );
        personId = result.insertId;
      }
    }

    // Vérifier s'il existe déjà une candidature pour cette offre
    const [[existingApp]] = await pool.query(
      `SELECT application_id, status 
       FROM applications 
       WHERE ad_id = ? AND person_id = ?
       LIMIT 1`,
      [adId, personId]
    );

    if (existingApp) {
      // Si la candidature existe mais n'est PAS refusée, bloquer
      if (existingApp.status !== "refuse") {
        return res.status(409).json({
          error: "Vous avez déjà postulé à cette offre",
        });
      }

      // Si refusée, mettre à jour l'ancienne candidature
      await pool.query(
        `UPDATE applications 
         SET cv_path = ?, cover_letter = ?, status = 'recu', application_date = NOW()
         WHERE application_id = ?`,
        [cvPath, message || null, existingApp.application_id]
      );

      return res.json({ ok: true, message: "Candidature envoyée avec succès" });
    }

    // Sinon, créer une nouvelle candidature
    await pool.query(
      `INSERT INTO applications 
       (ad_id, person_id, cv_path, cover_letter, status, application_date)
       VALUES (?, ?, ?, ?, 'recu', NOW())`,
      [adId, personId, cvPath, message || null]
    );

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

      const [[ad]] = await pool.query(
        "SELECT contact_person_id FROM advertisements WHERE ad_id = ?",
        [adId]
      );

      if (!ad) return res.status(404).json({ error: "Non trouvé" });
      if (ad.contact_person_id !== req.user.id) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      await pool.query("DELETE FROM advertisements WHERE ad_id = ?", [adId]);
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

      const [[ad]] = await pool.query(
        "SELECT contact_person_id FROM advertisements WHERE ad_id = ?",
        [adId]
      );
      if (!ad) return res.status(404).json({ error: "Non trouvé" });
      if (ad.contact_person_id !== req.user.id) {
        return res.status(403).json({ error: "Non autorisé" });
      }

      await pool.query("UPDATE advertisements SET status = ? WHERE ad_id = ?", [
        dbStatus,
        adId,
      ]);

      res.json({ ok: true, status: dbStatus });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
