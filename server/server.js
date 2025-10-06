// server/server.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { pool } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import adsRoutes from "./routes/ads.routes.js";
import companiesRoutes from "./routes/companies.routes.js";
// Optional hardening (si tu installes les deps) :
// import helmet from "helmet";
// import compression from "compression";

const app = express();

// ---- Config générique
app.set("trust proxy", 1); // cookies secure quand tu seras derrière un proxy (Railway/Vercel/Nginx)

// CORS: précise les origines autorisées
const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, cb) {
      // autorise requêtes sans Origin (ex: curl, postman) et celles whitelisteées
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" })); // évite payloads démesurés
app.use(cookieParser());
// if you installed them:
// app.use(helmet());
// app.use(compression());

// ---- Routes API
app.use("/api/auth", authRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/companies", companiesRoutes);

// ---- Healthcheck (API + DB)
app.get("/healthz", async (_req, res) => {
  try {
    const [r] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---- Front statique
app.use(express.static("public"));

// ---- 404 API/static
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

// ---- Middleware d'erreurs
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---- Start
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
