import express from "express";
import { createCompany, getCompanies, getCompany, updateCompany, enableCompany, removeCompany } from "../controllers/company.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/create", verifyToken, createCompany);
router.get("/", getCompanies);
router.get("/:companyId", getCompany);
router.put("/update/:companyId", verifyToken, updateCompany);
router.put("/enable/:companyId", verifyToken, enableCompany);
router.put("/remove/:companyId", verifyToken, removeCompany);

export default router;