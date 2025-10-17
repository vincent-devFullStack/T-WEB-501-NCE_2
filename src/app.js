// src/app.js
import expressLayouts from "express-ejs-layouts";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB
import { assertDbConnection } from "./config/db.js";

// Auth
import { attachUserIfAny } from "./middleware/auth.js";

// Routes
import indexRoutes from "./routes/index.js"; // SSR /
import authRoutes from "./routes/auth.js"; // SSR /auth/*
import adsRoutes from "./routes/ads.js"; // SSR /ads
import apiAdsRoutes from "./routes/api.ads.js"; // API /api/ads
import apiAuthRoutes from "./routes/api.auth.js"; // API /api/auth
import profileRoutes from "./routes/profile.js"; // SSR /profile
import apiAccountRoutes from "./routes/api.account.js"; // API /api/account
import apiAdminRoutes from "./routes/api.admin.js"; // API /api/admin
import { System } from "./models/System.js";

console.log("[BOOT]", {
  file: import.meta.url,
  pid: process.pid,
  cwd: process.cwd(),
});

await assertDbConnection().catch((e) => {
  console.error("[DB] Connection failed:", e.message);
  process.exit(1);
});

const app = express();
app.set("trust proxy", 1);

// CORS
const allowedOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

// Parsers & static
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Vues
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Auth + locals (avant routes)
app.use(attachUserIfAny);
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// ==========================
// DIAG: place ces 3 blocs TÔT
// ==========================

// 1) Logger ultra-tôt
app.use((req, _res, next) => {
  console.log("[REQ EARLY]", req.method, req.url);
  next();
});

// 2) Ping simple
app.get("/__ping", (_req, res) => {
  res.type("text").send("PING OK");
});

// Healthz
app.get("/healthz", async (_req, res) => {
  try {
    const dbOk = await System.ping();
    res.json({ ok: true, db: dbOk });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---- Routes SSR (⚠️ ordre important)
app.use("/auth", authRoutes); // d'abord /auth
app.use("/", indexRoutes); // puis /
app.use("/ads", adsRoutes);

// ---- Routes API
app.use("/api/auth", apiAuthRoutes);
app.use("/api/ads", apiAdsRoutes);
app.use("/api/admin", apiAdminRoutes);
app.use("/profil", profileRoutes); // SSR
app.use("/api/account", apiAccountRoutes);

// 404
app.use((req, res) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "Not Found" });
  return res.status(404).render("404", { title: "404" });
});

// Errors
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  if (req?.path?.startsWith?.("/api/"))
    return res.status(500).json({ error: "Internal Server Error" });
  return res.status(500).send("Erreur interne");
});

// Start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
