import express from "express";
import { createCategory, getCategories, getCategoryById, getEnabledCategories, updateCategory, removeCategory, enableCategory } from "../controllers/category.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/create", verifyToken, createCategory);            // Create a new category
router.get("/", getCategories);                                 // Get all categories
router.get("/enabled", getEnabledCategories);                   // Get all enabled categories
router.get("/:categoryId", getCategoryById);                    // Get category by ID
router.put("/update/:categoryId", verifyToken, updateCategory); // Update category by ID
router.put("/remove/:categoryId", verifyToken, removeCategory); // Remove category by ID
router.put("/enable/:categoryId", verifyToken, enableCategory); // Enable category by ID

export default router;