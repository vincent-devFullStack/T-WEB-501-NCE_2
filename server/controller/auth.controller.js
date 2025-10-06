// server/controller/auth.controller.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM people WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Mot de passe incorrect" });

    // JWT
    const token = jwt.sign(
      { id: user.person_id, role: user.person_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    // Cookie sécurisé
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS en prod
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 jour
    });

    res.json({
      message: "Connecté",
      user: { id: user.person_id, role: user.person_type },
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function logout(req, res) {
  res.clearCookie("token");
  res.json({ message: "Déconnecté" });
}

export async function me(req, res) {
  // `requireAuth` aura injecté `req.user`
  res.json({ user: req.user });
}
