import express from "express";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import the controller file
import { getProductsWithPrices, createProduct, updateProduct, getAllProducts, getProductById, deleteProduct, getAllProductsWithStock } from "../controllers/product.controller.js";

// Product routes
router.post("/new-product", verifyToken, createProduct);    // Create a new product
router.get("/", getAllProducts);                            // Retrieve all products
router.get("/get-products-with-prices", getProductsWithPrices);                            // Retrieve all products

router.get("/:productId", getProductById);                  // Retrieve a single product by productId
router.put("/update-product/:productId", verifyToken, updateProduct);    // Update a product by productId
router.get("/product-stock/all", verifyToken, getAllProductsWithStock);    // Retrieve all products with stock details
// Will not work if the Server Origin Policy is not set for DELETE method
router.delete("/delete-product/:productId", deleteProduct); // Delete a product by productId

export default router;