import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const r = Router();

function signAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  });
}

r.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Champs requis" });
  const [rows] = await pool.query(
    "SELECT * FROM people WHERE email=? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
  const ok = await bcrypt.compare(password, user.password_hash || "");
  if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });
  signAuthCookie(res, { id: user.person_id, role: user.person_type });
  res.json({
    message: "Connecté",
    user: { id: user.person_id, role: user.person_type },
  });
});

r.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    person_type = "candidat",
  } = req.body || {};
  if (!first_name || !last_name || !email || !password)
    return res.status(400).json({ error: "Champs requis" });
  if (!["candidat", "recruteur"].includes(person_type))
    return res.status(400).json({ error: "Type invalide" });
  const [exists] = await pool.query(
    "SELECT person_id FROM people WHERE email=? LIMIT 1",
    [email]
  );
  if (exists.length)
    return res.status(409).json({ error: "Email déjà utilisé" });
  const hash = await bcrypt.hash(password, 10);
  const [r2] = await pool.query(
    `INSERT INTO people (first_name,last_name,email,password_hash,person_type,is_active)
     VALUES (?,?,?,?,?,1)`,
    [first_name, last_name, email, hash, person_type]
  );
  signAuthCookie(res, { id: r2.insertId, role: person_type });
  res
    .status(201)
    .json({
      message: "Compte créé",
      user: { id: r2.insertId, role: person_type },
    });
});

r.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Déconnecté" });
});

r.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default r;
