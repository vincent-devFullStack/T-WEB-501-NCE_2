import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN_TABLES, getTableConfig } from "../config/adminTables.js";
import { AdminRepository } from "../models/AdminRepository.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/meta", (_req, res) => {
  const tables = Object.entries(ADMIN_TABLES).map(([key, config]) => ({
    table: key,
    label: config.label,
    description: config.description,
    primaryKey: config.primaryKey,
    fields: config.fields.map(({ specialHandler, ...field }) => ({
      ...field,
      creatable: field.creatable !== false,
      editable: field.editable !== false,
    })),
  }));
  res.json({ tables });
});

router.get("/:table", async (req, res) => {
  try {
    const tableKey = req.params.table;
    const tableConfig = getTableConfig(tableKey);
    if (!tableConfig) return res.status(404).json({ error: "Table inconnue" });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort : null;

    const { items, total } = await AdminRepository.list(tableKey, tableConfig, {
      page,
      limit,
      search,
      sort,
    });

    res.json({
      page,
      limit,
      total,
      rows: items,
      sort: AdminRepository.sanitizeSort(tableConfig, sort),
    });
  } catch (error) {
    console.error("[ADMIN][LIST]", error);
    res.status(500).json({ error: "Erreur lors du chargement des données." });
  }
});

router.get("/:table/:id", async (req, res) => {
  try {
    const tableKey = req.params.table;
    const tableConfig = getTableConfig(tableKey);
    if (!tableConfig) return res.status(404).json({ error: "Table inconnue" });

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Identifiant invalide" });
    }
    const row = await AdminRepository.findById(tableKey, tableConfig, id);
    if (!row) return res.status(404).json({ error: "Enregistrement introuvable" });
    res.json({ row });
  } catch (error) {
    console.error("[ADMIN][GET_ONE]", error);
    res.status(500).json({ error: "Erreur lors du chargement de l'enregistrement." });
  }
});

router.post("/:table", async (req, res) => {
  try {
    const tableKey = req.params.table;
    const tableConfig = getTableConfig(tableKey);
    if (!tableConfig) return res.status(404).json({ error: "Table inconnue" });

    const row = await AdminRepository.create(
      tableKey,
      tableConfig,
      req.body ?? {}
    );

    res.status(201).json({ row });
  } catch (error) {
    console.error("[ADMIN][CREATE]", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Erreur lors de la création." });
  }
});

router.patch("/:table/:id", async (req, res) => {
  try {
    const tableKey = req.params.table;
    const tableConfig = getTableConfig(tableKey);
    if (!tableConfig) return res.status(404).json({ error: "Table inconnue" });

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Identifiant invalide" });
    }

    const row = await AdminRepository.update(
      tableKey,
      tableConfig,
      id,
      req.body ?? {}
    );

    res.json({ row });
  } catch (error) {
    console.error("[ADMIN][UPDATE]", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
});

router.delete("/:table/:id", async (req, res) => {
  try {
    const tableKey = req.params.table;
    const tableConfig = getTableConfig(tableKey);
    if (!tableConfig) return res.status(404).json({ error: "Table inconnue" });

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Identifiant invalide" });
    }

    const success = await AdminRepository.remove(tableKey, tableConfig, id);
    if (!success) {
      return res.status(404).json({ error: "Enregistrement introuvable" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][DELETE]", error);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
