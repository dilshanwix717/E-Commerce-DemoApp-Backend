import express from "express";
import { verifyToken } from "../middleware/jwt.js";
import { createPrice, updatePrice, deletePrice, getPrice, getPrices, getPricesByShop, /*getPriceDetails,*/ getFullPriceDetails } from "../controllers/price.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createPrice); // Create a new Price entry
router.put("/update/:priceId", verifyToken, updatePrice); // Update a Price by the priceId
router.delete("/delete/:priceId", verifyToken, deletePrice); // Delete a Price by the priceId
router.get("/:priceId", verifyToken, getPrice); // Get a Price by the priceId
router.get("/", verifyToken, getPrices); // Get all Prices
router.get("/getAllbyShop/:shopId", verifyToken, getPricesByShop); // Get all Prices by the shopId
//router.get("/getPriceDetails/:companyId/:shopId/:productId", verifyToken, getPriceDetails); // Get a Price by the companyId, shopId and productId
router.get("/getFullPriceDetails/:companyId/:shopId/:productId/:sellingTypeId", verifyToken, getFullPriceDetails); // Get a Price by the companyId and shopId

export default router;