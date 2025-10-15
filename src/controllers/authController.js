import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ---------- Service commun ---------- */
async function getUserByEmail(email) {
  return User.findByEmail(email);
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
    const ok = await bcrypt.compare(password, user?.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

    signAuthCookie(res, { id: user.id, role: user.role });
    return res.json({
      message: "Connecte",
      user: { id: user.id, role: user.role },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function apiLogout(_req, res) {
  res.clearCookie("token");
  return res.json({ message: "Deconnecte" });
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
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: "Email deja utilise" });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName: first_name,
      lastName: last_name,
      email,
      passwordHash: hash,
      phone,
      linkedinUrl: linkedin_url,
      role: person_type,
      isActive: 1,
    });
    signAuthCookie(res, { id: newUser.id, role: newUser.role });
    return res.status(201).json({
      message: "Compte cree",
      user: { id: newUser.id, role: newUser.role },
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
    const ok = await bcrypt.compare(password, user?.passwordHash || "");
    if (!ok)
      return res
        .status(401)
        .render("auth/login", {
          title: "Connexion",
          error: "Mot de passe incorrect",
        });

    signAuthCookie(res, { id: user.id, role: user.role });
    return res.redirect("/"); // success: retour a l'accueil
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
    const existing = await User.findByEmail(email);
    if (existing) {
      return res
        .status(409)
        .render("auth/signup", {
          title: "Inscription",
          error: "Email deja utilise",
        });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName: first_name,
      lastName: last_name,
      email,
      passwordHash: hash,
      role: person_type,
      isActive: 1,
    });
    signAuthCookie(res, { id: newUser.id, role: newUser.role });
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
