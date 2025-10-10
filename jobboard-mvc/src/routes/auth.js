// src/routes/auth.js
import { Router } from "express";

const r = Router();

// /auth/login -> rend la vue EJS "views/auth/login.ejs"
r.get("/login", (req, res) => {
  console.log("[SSR] /auth/login RENDER");
  res.render("auth/login", { title: "Connexion" });
});

// (optionnel) /auth/signup si tu veux une page séparée
r.get("/signup", (req, res) => {
  res.render("auth/login", { title: "Inscription" }); // même page avec le pane signup
});

export default r;
