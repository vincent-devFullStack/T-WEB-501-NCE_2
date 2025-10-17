// src/routes/index.js
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ADMIN_TABLES } from "../config/adminTables.js";
import { Application } from "../models/Application.js";
import { Company } from "../models/Company.js";

const r = Router();

r.get("/", (_req, res) => {
  res.render("home", { title: "Accueil" });
});

r.get("/entreprise", async (req, res) => {
  try {
    const selectedIndustry = String(req.query.secteur ?? "").trim() || null;
    const industries = await Company.listIndustries();
    const rows = await Company.listWithActiveAds({
      industry: selectedIndustry,
    });
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    });
    const companies = rows.map((company) => ({
      ...company,
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

r.get(
  "/mes-candidatures",
  requireAuth,
  requireRole("candidat"),
  async (req, res) => {
    try {
      const PAGE_SIZE = 10;
      const REFUSED_STATUSES = ["refuse", "rejetee"];
      const ACTIVE_STATUSES = [
        "recu",
        "soumise",
        "en_revision",
        "a_appeler",
        "a_recevoir",
        "entretien_prevu",
        "recrute",
        "acceptee",
      ];

      const formatContractTypeLabel = (type) => {
        if (!type) return null;
        const value = String(type).trim().toLowerCase();
        if (value === "cdi" || value === "cdd") return value.toUpperCase();
        if (!value.length) return null;
        return value.charAt(0).toUpperCase() + value.slice(1);
      };

      const statusConfig = {
        recu: {
          key: "recu",
          label: "Reçu",
          tone: "pending",
          description: "En attente de traitement par le recruteur",
        },
        a_appeler: {
          key: "a_appeler",
          label: "À contacter",
          tone: "info",
          description: "Le recruteur prévoit de vous contacter",
        },
        a_recevoir: {
          key: "a_recevoir",
          label: "Entretien prévu",
          tone: "info",
          description: "Un échange est planifié avec le recruteur",
        },
        recrute: {
          key: "recrute",
          label: "Acceptée",
          tone: "success",
          description: "Votre candidature a été retenue",
        },
        refuse: {
          key: "refuse",
          label: "Refusée",
          tone: "danger",
          description: "La candidature n'a pas été retenue",
        },
        soumise: {
          key: "soumise",
          label: "Soumise",
          tone: "pending",
          description: "Candidature envoyée, en attente de traitement",
        },
        en_revision: {
          key: "en_revision",
          label: "En révision",
          tone: "info",
          description: "Le recruteur étudie votre candidature",
        },
        entretien_prevu: {
          key: "entretien_prevu",
          label: "Entretien prévu",
          tone: "info",
          description: "Un entretien est programmé",
        },
        rejetee: {
          key: "rejetee",
          label: "Refusée",
          tone: "danger",
          description: "La candidature n'a pas été retenue",
        },
        acceptee: {
          key: "acceptee",
          label: "Acceptée",
          tone: "success",
          description: "Candidature validée par le recruteur",
        },
      };

      const statusOrder = [
        "recu",
        "soumise",
        "en_revision",
        "a_appeler",
        "a_recevoir",
        "entretien_prevu",
        "recrute",
        "acceptee",
        "refuse",
        "rejetee",
      ];

      const view =
        String(req.query.view).toLowerCase() === "refused" ? "refused" : "active";
      const pageParam = Number.parseInt(req.query.page, 10);
      let currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

      const countsMap = await Application.countByStatusForPerson(req.user.id);

      const totalAll = Object.values(countsMap).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );

      const totalActive = ACTIVE_STATUSES.reduce(
        (sum, status) => sum + Number(countsMap[status] || 0),
        0
      );
      const totalRefused = REFUSED_STATUSES.reduce(
        (sum, status) => sum + Number(countsMap[status] || 0),
        0
      );

      const totalForView = view === "refused" ? totalRefused : totalActive;
      const totalPages =
        totalForView > 0 ? Math.ceil(totalForView / PAGE_SIZE) : 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const offset = (currentPage - 1) * PAGE_SIZE;

      const selectedStatuses =
        view === "refused" ? REFUSED_STATUSES : ACTIVE_STATUSES;

      const rows = await Application.listWithAdDetailsByPerson(req.user.id, {
        statuses: selectedStatuses,
        limit: PAGE_SIZE,
        offset,
      });

      const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      function formatSalary(min, max, currency = "EUR") {
        if (min == null && max == null) return null;
        const fmt = new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        });
        if (min != null && max != null)
          return `${fmt.format(min)} – ${fmt.format(max)}`;
        if (min != null) return `À partir de ${fmt.format(min)}`;
        return `Jusqu'à ${fmt.format(max)}`;
      }

      const applications = rows.map((row) => {
        const key = row.status || "inconnu";
        const config = statusConfig[key] ?? {
          key,
          label: key,
          tone: "neutral",
          description: "",
        };
        const appliedOn = row.application_date
          ? dateFormatter.format(row.application_date)
          : "Date inconnue";
        const updatedOn = row.updated_at
          ? dateFormatter.format(row.updated_at)
          : null;
        const salaryLabel = formatSalary(
          row.salary_min,
          row.salary_max,
          row.currency || "EUR"
        );
        const deadlineLabel = row.deadline_date
          ? dateFormatter.format(row.deadline_date)
          : null;
        const contractLabel = formatContractTypeLabel(row.contract_type);
        const hasDetails =
          Boolean(config.description && config.description.length) ||
          Boolean(salaryLabel) ||
          Boolean(deadlineLabel) ||
          Boolean(updatedOn && updatedOn !== appliedOn) ||
          Boolean(row.cover_letter) ||
          Boolean(contractLabel);

        return {
          ...row,
          status_key: config.key,
          status_label: config.label,
          status_tone: config.tone,
          status_description: config.description,
          applied_on: appliedOn,
          updated_on: updatedOn,
          salary_label: salaryLabel,
          deadline_label: deadlineLabel,
          contract_label: contractLabel,
          has_details: hasDetails,
        };
      });

      const summaryKeys = [];
      statusOrder.forEach((key) => {
        if (countsMap[key]) summaryKeys.push(key);
      });
      Object.keys(countsMap).forEach((key) => {
        if (!summaryKeys.includes(key)) summaryKeys.push(key);
      });

      const statusSummary = summaryKeys.map((key) => {
        const config = statusConfig[key] ?? {
          key,
          label: key,
          tone: "neutral",
          description: "",
        };
        return {
          key: config.key,
          label: config.label,
          tone: config.tone,
          description: config.description,
          count: Number(countsMap[key] || 0),
        };
      });

      const hasPreviousPage = currentPage > 1;
      const hasNextPage = currentPage < totalPages;

      const buildUrl = (page, targetView) => {
        const params = new URLSearchParams();
        if (targetView === "refused") params.set("view", "refused");
        if (page > 1) params.set("page", String(page));
        const query = params.toString();
        return `/mes-candidatures${query ? `?${query}` : ""}`;
      };

      return res.render("applications/list", {
        title: "Mes candidatures",
        applications,
        statusSummary,
        totalApplications: totalAll,
        totalActive,
        totalRefused,
        currentView: view,
        currentPage,
        totalPages,
        hasPreviousPage,
        hasNextPage,
        previousPageUrl: hasPreviousPage
          ? buildUrl(currentPage - 1, view)
          : null,
        nextPageUrl: hasNextPage ? buildUrl(currentPage + 1, view) : null,
        switchToRefusedUrl: buildUrl(1, "refused"),
        switchToActiveUrl: buildUrl(1, "active"),
      });
    } catch (e) {
      console.error(e);
      return res
        .status(500)
        .send("Erreur lors du chargement de vos candidatures.");
    }
  }
);

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
