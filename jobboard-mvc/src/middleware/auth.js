// src/middleware/auth.js
import jwt from "jsonwebtoken";

/** Vrai si la requête est une API (JSON) */
function isApi(req) {
  return (
    req.path.startsWith("/api/") ||
    req.get("accept")?.includes("application/json")
  );
}

/** Attache req.user si un JWT valide est présent (ne bloque pas) */
export function attachUserIfAny(req, _res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, role: payload.role };
    } catch {
      // token invalide/expiré -> on ignore
    }
  }
  next();
}

/** Bloque si non connecté (JSON pour API, redirection pour pages) */
export function requireAuth(req, res, next) {
  if (req.user) return next();

  if (isApi(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const backTo = encodeURIComponent(req.originalUrl || "/");
  return res.redirect(`/auth/login?next=${backTo}`);
}

/** Bloque si le rôle ne correspond pas (ex: 'admin') */
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role === role) return next();

    if (isApi(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(403).render("403", { title: "Accès refusé" });
  };
}
