import express from "express";
const router = express.Router();

// Import the controller file
import { createUOM, getUOMs, getUOMById, updateUOM, deleteUOM } from "../controllers/unitof.material.controller.js";
import { verifyToken } from "../middleware/jwt.js";


// Unit of Material routes
router.post("/create-new", verifyToken, createUOM); // Create a new UOM
router.get("/", getUOMs);                           // Retrieve all UOMs
router.get("/:uomId", getUOMById);                  // Retrieve a single UOM by uomId
router.put("/update-uom/:uomId", verifyToken, updateUOM);        // Update a UOM by uomId
// Will not work if the Server Origin Policy is not set for DELETE method
router.delete("/delete-uom/:uomId", verifyToken, deleteUOM);     // Delete a UOM by uomId

export default router;
