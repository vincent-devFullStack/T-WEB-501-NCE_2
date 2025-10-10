// src/routes/index.js
import { Router } from "express";
import { requireRole } from "../middleware/auth.js";

const r = Router();

r.get("/", (_req, res) => {
  res.render("home", { title: "Accueil" });
});

// Dashboard admin (SSR)
r.get("/dashboard", requireRole("admin"), (req, res) => {
  res.render("dashboard", { title: "Dashboard Admin" });
});

export default r;
