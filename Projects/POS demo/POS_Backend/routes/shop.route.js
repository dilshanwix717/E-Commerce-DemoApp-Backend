import express from "express";
import { createShop, getShops, updateShop, getShop, enableShop, removeShop, assignUserToShop, unassignUserFromShop } from "../controllers/shop.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/create", verifyToken, createShop);        // Create a new shop
router.get("/", getShops);                              // Get all shops
router.put("/update/:shopId", verifyToken, updateShop); // Update shop by ID
router.get("/:shopId", getShop);                        // Get shop by ID
router.put("/enable/:shopId", verifyToken, enableShop); // Enable shop by ID
router.put("/remove/:shopId", verifyToken, removeShop); // Remove shop by ID
router.put('/assign-users/:companyId/:shopId', verifyToken, assignUserToShop); // Assign users to shop
router.put('/unassign-users/:companyId/:shopId', verifyToken, unassignUserFromShop); // Remove users from shop

export default router;