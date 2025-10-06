import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, ... }
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
