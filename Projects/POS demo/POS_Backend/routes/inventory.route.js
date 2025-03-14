import express from "express";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import the controller file
import { getAllInventories, getInventoryById, getInventoriesByCompanyIdAndShopId, getInventoriesByCompanyId } from "../controllers/inventory.controller.js";

// Product routes
router.get("/", getAllInventories);                            // Retrieve all inventories
router.get("/getInventoryById/:inventoryId", getInventoryById);                  // Retrieve a single inventory by inventoryId
router.get("/getInventoriesByCompanyId", verifyToken, getInventoriesByCompanyId);                // Retrieve a single inventory by inventoryId
router.get("/getInventoriesByCompanyIdAndShopId", verifyToken, getInventoriesByCompanyIdAndShopId);                // Retrieve a single inventory by inventoryId

export default router;
