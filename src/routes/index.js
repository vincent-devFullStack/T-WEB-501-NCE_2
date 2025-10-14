// src/routes/index.js
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireRole } from "../middleware/auth.js";
import { ADMIN_TABLES } from "../config/adminTables.js";

const r = Router();

r.get("/", (_req, res) => {
  res.render("home", { title: "Accueil" });
});

r.get("/entreprise", async (req, res) => {
  try {
    const selectedIndustry = String(req.query.secteur ?? "").trim() || null;
    const [industriesRows] = await pool.query(
      `
      SELECT DISTINCT industry
      FROM companies
      WHERE industry IS NOT NULL AND industry <> ''
      ORDER BY industry ASC
      `
    );

    const industries = industriesRows
      .map((row) => row.industry)
      .filter((value) => Boolean(value));

    const filters = [];
    const params = [];

    if (selectedIndustry) {
      filters.push("c.industry = ?");
      params.push(selectedIndustry);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT 
        c.company_id,
        c.company_name,
        c.industry,
        c.created_at,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_ads_count
      FROM companies c
      LEFT JOIN advertisements a ON a.company_id = c.company_id
      ${whereClause}
      GROUP BY c.company_id, c.company_name, c.industry, c.created_at
      ORDER BY c.company_name ASC
      `,
      params
    );
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    });
    const companies = rows.map((company) => ({
      ...company,
      active_ads_count: Number(company.active_ads_count || 0),
      created_at_label: company.created_at
        ? formatter.format(company.created_at)
        : null,
    }));

    return res.render("companies/list", {
      title: "Trouver une entreprise",
      companies,
      industries,
      selectedIndustry,
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .send("Erreur lors du chargement des entreprises.");
  }
});

// Dashboard admin (SSR)
r.get("/dashboard", requireRole("admin"), (req, res) => {
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

  res.render("dashboard", {
    title: "Dashboard Admin",
    adminTables: tables,
  });
});

export default r;
