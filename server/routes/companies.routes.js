import { Router } from "express";
import { listCompanies } from "../controller/companies.controller.js";
const r = Router();

r.get("/", listCompanies);

export default r;
