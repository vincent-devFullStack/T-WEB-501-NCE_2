// src/routes/api.auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { setAuthCookie, clearAuthCookie } from "../services/authTokens.js";

const r = Router();

// ---------- /api/auth/me ----------
r.get("/me", async (req, res) => {
  try {
    if (!req.user?.id) return res.json({ user: null });

    const [rows] = await pool.query(
      `
      SELECT
        p.person_id, p.first_name, p.last_name, p.email, p.phone,
        p.person_type AS role, p.company_id,
        c.company_name AS company_name
      FROM people p
      LEFT JOIN companies c ON c.company_id = p.company_id
      WHERE p.person_id = ?
      `,
      [req.user.id]
    );
    return res.json({ user: rows?.[0] ?? null });
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

    const [exists] = await pool.query(
      "SELECT person_id FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    if (exists.length) {
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
        const [c1] = await pool.query(
          "SELECT company_id FROM companies WHERE LOWER(company_name) = LOWER(?) LIMIT 1",
          [cname]
        );

        if (c1.length) {
          finalCompanyId = c1[0].company_id;
        } else {
          const [ins] = await pool.query(
            "INSERT INTO companies (company_name) VALUES (?)",
            [cname]
          );
          finalCompanyId = ins.insertId;
        }
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO people
        (first_name, last_name, email, password_hash, phone, linkedin_url, person_type, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        password_hash,
        phone,
        linkedin_url,
        person_type,
        finalCompanyId,
      ]
    );

    const userId = result.insertId;
    setAuthCookie(res, { id: userId, role: person_type });

    return res.status(201).json({
      ok: true,
      user: {
        person_id: userId,
        first_name,
        last_name,
        email,
        role: person_type,
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

    const [rows] = await pool.query(
      `
      SELECT person_id, email, password_hash, person_type AS role, company_id
      FROM people
      WHERE email = ?
      LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    const user = rows?.[0];
    if (!user?.password_hash) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides." });

    setAuthCookie(res, { id: user.person_id, role: user.role });

    return res.json({
      ok: true,
      user: {
        person_id: user.person_id,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
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
