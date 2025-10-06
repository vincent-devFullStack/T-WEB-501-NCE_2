import { Router } from "express";
import { listAds } from "../controller/ads.controller.js";
const r = Router();

r.get("/", listAds);

export default r;
