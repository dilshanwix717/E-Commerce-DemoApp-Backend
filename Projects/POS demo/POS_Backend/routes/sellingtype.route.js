import express from "express";
import { createSellingType, updateSellingType, getSellingTypes, getSellingTypeById, deleteSellingType, toggleSellingType } from "../controllers/sellingType.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// Daily balance routes
router.post("/create", verifyToken, createSellingType);                     // Create a new Selling Type
router.put("/update/:sellingTypeId", verifyToken, updateSellingType);       // Update a Selling Type
router.get("/", getSellingTypes);                                           // Retrieve all Selling Types
router.get("/:sellingTypeId", getSellingTypeById);                          // Retrieve a single Selling Type by ID
router.delete("/delete/:sellingTypeId", verifyToken, deleteSellingType);    // Delete a Selling Type by ID
router.put("/enable/:sellingTypeId", verifyToken, toggleSellingType);       // Toggle a Selling Type by ID

export default router;