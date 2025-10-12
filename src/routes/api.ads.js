// src/routes/api.ads.js
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

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

// Helpers: statut UI -> statut DB
const STATUS_MAP = new Map([
  ["active", "active"],
  ["brouillon", "draft"],
  ["draft", "draft"],
  ["fermee", "inactive"],
  ["inactive", "inactive"],
]);

function toDbStatus(input) {
  if (!input) return null;
  const key = String(input).toLowerCase();
  return STATUS_MAP.get(key) ?? null;
}

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
