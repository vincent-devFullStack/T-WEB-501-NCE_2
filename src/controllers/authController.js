import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ---------- Service commun ---------- */
async function getUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT * FROM people WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}
function signAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24, // 1 jour
  });
}

/* ---------- API JSON (pour navbar.js) ---------- */
export async function apiLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Email et mot de passe requis" });
  try {
    const user = await getUserByEmail(email);
    if (!user)
      return res.status(401).json({ error: "Utilisateur introuvable" });
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

    signAuthCookie(res, { id: user.person_id, role: user.person_type });
    return res.json({
      message: "Connecté",
      user: { id: user.person_id, role: user.person_type },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function apiLogout(_req, res) {
  res.clearCookie("token");
  return res.json({ message: "Déconnecté" });
}

export async function apiRegister(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone = null,
      linkedin_url = null,
      person_type = "candidat",
    } = req.body || {};

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }
    if (!["candidat", "recruteur"].includes(person_type)) {
      return res.status(400).json({ error: "Type utilisateur invalide" });
    }
    const [existing] = await pool.query(
      "SELECT person_id FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length)
      return res.status(409).json({ error: "Email déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO people
       (first_name, last_name, email, password_hash, phone, linkedin_url, person_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [first_name, last_name, email, hash, phone, linkedin_url, person_type]
    );
    signAuthCookie(res, { id: r.insertId, role: person_type });
    return res
      .status(201)
      .json({
        message: "Compte créé",
        user: { id: r.insertId, role: person_type },
      });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

export function apiMe(req, res) {
  // req.user est rempli par requireAuth
  return res.json({ user: req.user });
}

/* ---------- Pages SSR (formulaires HTML) ---------- */
export function pageLoginGet(_req, res) {
  res.render("auth/login", { title: "Connexion" });
}
export async function pageLoginPost(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res
      .status(400)
      .render("auth/login", { title: "Connexion", error: "Champs requis" });
  try {
    const user = await getUserByEmail(email);
    if (!user)
      return res
        .status(401)
        .render("auth/login", {
          title: "Connexion",
          error: "Utilisateur introuvable",
        });
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok)
      return res
        .status(401)
        .render("auth/login", {
          title: "Connexion",
          error: "Mot de passe incorrect",
        });

    signAuthCookie(res, { id: user.person_id, role: user.person_type });
    return res.redirect("/"); // success → retour à l’accueil
  } catch (e) {
    console.error("pageLoginPost:", e);
    return res
      .status(500)
      .render("auth/login", { title: "Connexion", error: "Erreur serveur" });
  }
}

export function pageSignupGet(_req, res) {
  res.render("auth/signup", { title: "Inscription" });
}
export async function pageSignupPost(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      person_type = "candidat",
    } = req.body || {};
    if (!first_name || !last_name || !email || !password) {
      return res
        .status(400)
        .render("auth/signup", {
          title: "Inscription",
          error: "Champs requis",
        });
    }
    if (!["candidat", "recruteur"].includes(person_type)) {
      return res
        .status(400)
        .render("auth/signup", {
          title: "Inscription",
          error: "Type utilisateur invalide",
        });
    }
    const [existing] = await pool.query(
      "SELECT person_id FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length) {
      return res
        .status(409)
        .render("auth/signup", {
          title: "Inscription",
          error: "Email déjà utilisé",
        });
    }

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO people (first_name,last_name,email,password_hash,person_type,is_active)
       VALUES (?,?,?,?,?,1)`,
      [first_name, last_name, email, hash, person_type]
    );
    signAuthCookie(res, { id: r.insertId, role: person_type });
    return res.redirect("/");
  } catch (e) {
    console.error("pageSignupPost:", e);
    return res
      .status(500)
      .render("auth/signup", { title: "Inscription", error: "Erreur serveur" });
  }
}

export function pageLogout(_req, res) {
  res.clearCookie("token");
  return res.redirect("/");
}
