import express from "express";
import { createSupplier, getSuppliers, getSupplierById, updateSupplier, enableSupplier, removeSupplier } from "../controllers/supplier.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/create", verifyToken, createSupplier);            // Create a new supplier
router.get("/", getSuppliers);                                  // Get all suppliers
router.get("/:supplierId", getSupplierById);                    // Get supplier by supplier ID
router.put("/update/:supplierId", verifyToken, updateSupplier); // Update supplier by supplier ID
router.put("/enable/:supplierId", verifyToken, enableSupplier); // Enable supplier by supplier ID
router.put("/remove/:supplierId", verifyToken, removeSupplier); // Remove supplier by supplier ID

export default router;