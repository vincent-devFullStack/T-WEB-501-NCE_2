// src/routes/api.ads.js
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ------------------------------------------------------------------
// Configuration de multer pour l'upload de CV
// ------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/cv"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cv-" + uniqueSuffix + ".pdf");
  },
});

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
    const [advertisements] = await pool.query(`
      SELECT 
        a.*,
        c.company_name
      FROM advertisements a
      LEFT JOIN companies c ON a.company_id = c.company_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);

    res.json({ ads: advertisements });
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
    const cvPath = req.file ? `/uploads/cv/${req.file.filename}` : null;

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
          `INSERT INTO people (email, first_name, last_name, phone, role, created_at)
           VALUES (?, ?, ?, ?, 'candidat', NOW())`,
          [email, firstName, lastName, phone]
        );
        personId = result.insertId;
      }
    }

    // Créer la candidature
    await pool.query(
      `INSERT INTO applications 
       (ad_id, person_id, cv_path, cover_letter, status, application_date)
       VALUES (?, ?, ?, ?, 'soumise', NOW())`,
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
// PATCH /api/ads/applications/:id - Modifier le statut d'une candidature
// ------------------------------------------------------------------
router.patch(
  "/applications/:id",
  requireAuth,
  requireRole("recruteur"),
  async (req, res) => {
    try {
      const appId = Number(req.params.id);
      const { status } = req.body;

      const validStatuses = [
        "soumise",
        "en_revision",
        "entretien_prevu",
        "rejetee",
        "acceptee",
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

      await pool.query(
        "UPDATE applications SET status = ? WHERE application_id = ?",
        [status, appId]
      );

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
