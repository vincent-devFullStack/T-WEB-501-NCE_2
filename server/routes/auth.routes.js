import { Router } from "express";
import { login, logout, me } from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();
r.post("/login", login);
r.post("/logout", logout);
r.get("/me", requireAuth, me);
export default r;
