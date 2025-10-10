import { Router } from "express";
import { advertisements } from "../data/mockAds.js";

const router = Router();
router.get("/", (_req, res) => res.json({ ads: advertisements }));
export default router;
