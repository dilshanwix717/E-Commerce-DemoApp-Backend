import express from "express";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import the controller file
import { createUOM, getUOMs, getUOMById, updateUOM, deleteUOM } from "../controllers/unitof.material.controller.js";
import { createProduct, updateProduct, getAllProducts, getProductById, deleteProduct } from "../controllers/product.controller.js";
import { createGRN } from "../controllers/grn.controller.js";
/*
// Unit of Material routes
router.post("/new-uom", createUOM); // Create a new UOM
router.get("/uoms", getUOMs); // Retrieve all UOMs
router.get("/uomById/:uomId", getUOMById); // Retrieve a single UOM by uomId
router.put("/uom-update/:uomId", updateUOM); // Update a UOM by uomId
// Will not work if the Server Origin Policy is not set for DELETE method
router.delete("/uom-delete/:uomId", deleteUOM); // Delete a UOM by uomId
*/
/*
// Product routes
router.post("/new-product", createProduct); // Create a new product
router.get("/products", getAllProducts); // Retrieve all products
router.get("/productById/:productId", getProductById); // Retrieve a single product by productId
router.put("/product-update/:productId", updateProduct); // Update a product by productId
// Will not work if the Server Origin Policy is not set for DELETE method
router.delete("/product-delete/:productId", deleteProduct); // Delete a product by productId
*/
// GRN routes
router.post("/new-grn", createGRN); // Create a new GRN

export default router;
