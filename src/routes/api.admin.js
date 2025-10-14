import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN_TABLES, getTableConfig } from "../config/adminTables.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

function sanitizeSort(tableConfig, sortParam) {
  if (!sortParam) return tableConfig.defaultSort;
  const parts = sortParam.split(",").map((chunk) => chunk.trim()).filter(Boolean);
  if (!parts.length) return tableConfig.defaultSort;

  const allowedColumns = new Set(
    tableConfig.fields
      .map((field) => field.name)
      .filter((name) => name && name !== "password")
  );

  const parsed = [];
  for (const part of parts) {
    const [column, directionRaw] = part.split(":").map((s) => s?.trim() ?? "");
    const direction = directionRaw?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    if (!allowedColumns.has(column)) {
      continue;
    }
    parsed.push({ column, direction });
  }

  return parsed.length ? parsed : tableConfig.defaultSort;
}

function buildOrderByClause(sortArray) {
  if (!Array.isArray(sortArray) || !sortArray.length) return "";
  const fragments = sortArray.map(
    ({ column, direction }) => `\`${column}\` ${direction === "ASC" ? "ASC" : "DESC"}`
  );
  return fragments.length ? `ORDER BY ${fragments.join(", ")}` : "";
}

function buildWhereClause(tableConfig, searchValue, params) {
  if (!searchValue || !tableConfig.searchColumns?.length) return "";
  const like = `%${searchValue}%`;
  const clauses = tableConfig.searchColumns.map((col) => {
    params.push(like);
    return `\`${col}\` LIKE ?`;
  });
  return clauses.length ? `WHERE (${clauses.join(" OR ")})` : "";
}

function getSelectableColumns(tableConfig) {
  const columns = new Set([tableConfig.primaryKey]);
  for (const field of tableConfig.fields) {
    if (field.type === "password" || field.specialHandler) continue;
    if (field.name) columns.add(field.name);
  }
  return Array.from(columns);
}

function getEditableFields(tableConfig, mode) {
  return tableConfig.fields.filter((field) => {
    if (!field.name || field.name === tableConfig.primaryKey) return false;
    if (field.type === "readonly") return false;
    if (field.specialHandler) return true;
    if (mode === "create") return field.creatable !== false;
    return field.editable !== false;
  });
}

function normalizeFieldValue(field, raw) {
  if (raw === undefined) return { shouldUse: false };

  if (raw === null) return { shouldUse: true, value: null };

  const emptyLike = raw === "" || (typeof raw === "string" && raw.trim() === "");
  const baseType = field.type;

  if (field.specialHandler) {
    return { shouldUse: true, value: raw };
  }

  switch (baseType) {
    case "number": {
      if (emptyLike) return { shouldUse: true, value: null };
      const num = Number(raw);
      if (Number.isNaN(num)) {
        throw new Error(`Valeur numérique invalide pour ${field.label}`);
      }
      return { shouldUse: true, value: num };
    }
    case "boolean": {
      const truthy = raw === true || raw === "true" || raw === "1" || raw === 1;
      return { shouldUse: true, value: truthy ? 1 : 0 };
    }
    case "date":
    case "datetime": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    case "select": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    case "textarea":
    case "text":
    case "email":
    case "url": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw).trim() };
    }
    case "password": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    default: {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: raw };
    }
  }
}

async function buildMutationPayload(tableConfig, body, mode) {
  const errors = [];
  const columns = [];
  const values = [];

  const fields = getEditableFields(tableConfig, mode);

  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(body, field.name);
    if (!hasValue && mode === "create" && field.required && !field.specialHandler) {
      errors.push(`Le champ ${field.label} est requis.`);
      continue;
    }
    if (!hasValue) continue;

    const { shouldUse, value } = normalizeFieldValue(field, body[field.name]);
    if (!shouldUse) continue;

    if (field.specialHandler) {
      const specialResult = await field.specialHandler(value);
      if (specialResult && specialResult.column) {
        columns.push(`\`${specialResult.column}\``);
        values.push(specialResult.value);
      }
      continue;
    }

    if (field.type === "select" && field.options) {
      const allowed = new Set(field.options.map((opt) => opt.value));
      if (value != null && !allowed.has(value)) {
        errors.push(`Valeur invalide pour ${field.label}.`);
        continue;
      }
    }

    columns.push(`\`${field.name}\``);
    values.push(value);
  }

  if (errors.length) {
    const err = new Error(errors.join("\n"));
    err.statusCode = 422;
    throw err;
  }

  return { columns, values };
}

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
    const offset = (page - 1) * limit;

    const params = [];
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const whereClause = buildWhereClause(tableConfig, search, params);

    const sortArray = sanitizeSort(tableConfig, req.query.sort);
    const orderBy = buildOrderByClause(sortArray);

    const columns = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");

    const sql = `
      SELECT ${columns}
      FROM \`${tableKey}\`
      ${whereClause}
      ${orderBy}
      LIMIT ?
      OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM \`${tableKey}\`
      ${whereClause}
    `;

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(sql, queryParams);
    const [[{ total }]] = await pool.query(countSql, params);

    res.json({
      page,
      limit,
      total,
      rows,
      sort: sortArray,
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

    const columns = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");
    const sql = `
      SELECT ${columns}
      FROM \`${tableKey}\`
      WHERE \`${tableConfig.primaryKey}\` = ?
      LIMIT 1
    `;
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Identifiant invalide" });
    }
    const [rows] = await pool.query(sql, [id]);
    const row = rows?.[0];
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

    const { columns, values } = await buildMutationPayload(tableConfig, req.body ?? {}, "create");

    if (!columns.length) {
      return res.status(400).json({ error: "Aucun champ fourni pour la création." });
    }

    const placeholders = columns.map(() => "?").join(", ");
    const sql = `
      INSERT INTO \`${tableKey}\` (${columns.join(", ")})
      VALUES (${placeholders})
    `;
    const [result] = await pool.query(sql, values);
    const insertedId = result.insertId;

    const columnsToSelect = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");
    const [[row]] = await pool.query(
      `
        SELECT ${columnsToSelect}
        FROM \`${tableKey}\`
        WHERE \`${tableConfig.primaryKey}\` = ?
        LIMIT 1
      `,
      [insertedId]
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

    const { columns, values } = await buildMutationPayload(tableConfig, req.body ?? {}, "update");

    if (!columns.length) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour." });
    }

    const assignments = columns.map((col) => `${col} = ?`).join(", ");
    const sql = `
      UPDATE \`${tableKey}\`
      SET ${assignments}
      WHERE \`${tableConfig.primaryKey}\` = ?
      LIMIT 1
    `;

    await pool.query(sql, [...values, id]);

    const columnsToSelect = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");
    const [[row]] = await pool.query(
      `
        SELECT ${columnsToSelect}
        FROM \`${tableKey}\`
        WHERE \`${tableConfig.primaryKey}\` = ?
        LIMIT 1
      `,
      [id]
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

    const sql = `
      DELETE FROM \`${tableKey}\`
      WHERE \`${tableConfig.primaryKey}\` = ?
      LIMIT 1
    `;
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Enregistrement introuvable" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][DELETE]", error);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

export default router;
