// server/controller/auth.controller.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ------------------ Auth: LOGIN ------------------ */
export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash || "");
    if (!match) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.person_id, role: user.person_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 jour
    });

    return res.json({
      message: "Connecté",
      user: { id: user.person_id, role: user.person_type },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ------------------ Auth: LOGOUT ------------------ */
export async function logout(_req, res) {
  res.clearCookie("token");
  return res.json({ message: "Déconnecté" });
}

/* ------------------ Auth: ME ------------------ */
export async function me(req, res) {
  // requireAuth a injecté req.user
  return res.json({ user: req.user });
}

/* ------------------ Auth: REGISTER ------------------ */
export async function register(req, res) {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone = null,
      linkedin_url = null,
      person_type = "candidat", // on n'autorise pas 'admin' ici
    } = req.body || {};

    // validations minimales
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }
    if (!["candidat", "recruteur"].includes(person_type)) {
      return res.status(400).json({ error: "Type utilisateur invalide" });
    }

    // email unique
    const [existing] = await pool.query(
      "SELECT person_id FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length) {
      return res.status(409).json({ error: "Email déjà utilisé" });
    }

    // hash + insertion
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO people
       (first_name, last_name, email, password_hash, phone, linkedin_url, person_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [first_name, last_name, email, hash, phone, linkedin_url, person_type]
    );

    const newId = r.insertId;

    // login automatique après inscription
    const token = jwt.sign(
      { id: newId, role: person_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(201).json({
      message: "Compte créé",
      user: { id: newId, role: person_type },
    });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
