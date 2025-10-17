// src/routes/api.auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { setAuthCookie, clearAuthCookie } from "../services/authTokens.js";

const r = Router();

// ---------- /api/auth/me ----------
r.get("/me", async (req, res) => {
  try {
    if (!req.user?.id) return res.json({ user: null });

    const row = await User.fetchProfileRow(req.user.id);
    if (!row) return res.json({ user: null });

    const user = {
      person_id: row.person_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      company_id: row.company_id,
      company_name: row.company_name ?? null,
    };

    return res.json({ user });
  } catch (e) {
    console.error("GET /api/auth/me error:", e);
    return res.json({ user: null });
  }
});

// ---------- /api/auth/register ----------
r.post("/register", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone = null,
      linkedin_url = null,
      person_type = "candidat",
      company_id = null, // optional direct link
      company_name = null, // NEW: create/reuse company by name
    } = req.body || {};

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }

    const existing = await User.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: "Email déjà utilisé." });
    }

    // --- compute final company id for recruiters ---
    let finalCompanyId = company_id ?? null;

    if (person_type === "recruteur") {
      // If no company provided at all, refuse; or allow later via /api/account/company
      if (!finalCompanyId && !company_name) {
        return res.status(400).json({
          error: "Le nom de l’entreprise est requis pour un recruteur.",
        });
      }

      if (!finalCompanyId && company_name) {
        const cname = String(company_name).trim();
        if (!cname) {
          return res.status(400).json({
            error: "Le nom de l’entreprise est requis pour un recruteur.",
          });
        }

        // try reuse existing by name (case-insensitive)
        const company = await Company.ensureByName(cname);
        finalCompanyId = company?.company_id ?? company?.id ?? null;
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const created = await User.create({
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: password_hash,
      phone,
      linkedinUrl: linkedin_url,
      role: person_type,
      companyId: finalCompanyId,
    });

    setAuthCookie(res, { id: created.id, role: created.role });

    return res.status(201).json({
      ok: true,
      user: {
        person_id: created.id,
        first_name: created.firstName,
        last_name: created.lastName,
        email: created.email,
        role: created.role,
        company_id: finalCompanyId,
      },
    });
  } catch (e) {
    console.error("POST /api/auth/register error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ---------- /api/auth/login ----------
r.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const user = await User.findByEmail(email.trim().toLowerCase());

    if (!user?.passwordHash) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides." });

    setAuthCookie(res, { id: user.id, role: user.role });

    return res.json({
      ok: true,
      user: {
        person_id: user.id,
        email: user.email,
        role: user.role,
        company_id: user.companyId,
      },
    });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ---------- /api/auth/logout ----------
r.post("/logout", async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

export default r;
