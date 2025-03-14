import express from "express";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import the controller file
import { createGRN, getAllGRNs, cancelGRN, getGRNWithTransactions, getGRNWithTransactionsAndDetails, getGRNsBySupplier, getGRNsByShop, getGRNsByCompany, settleGRN, updateGRN } from "../controllers/grn.controller.js";

// GRN routes
router.post("/new-grn", verifyToken, createGRN);   // Create a new GRN
router.post("/cancel-grn/:transactionCode/:companyId/:shopId", verifyToken, cancelGRN); // Cancel Full GRN by transaction ID and who is returning the GRN
router.post("/settle-grn/:transactionCode/:companyId/:shopId", verifyToken, settleGRN); // Settle Full GRN by transaction ID and who is returning the GRN
router.put("/update-grn/:transactionCode/:companyId/:shopId", verifyToken, updateGRN); // Update GRN by transaction ID and who is returning the GRN

router.get("/", getAllGRNs);                       // Get all GRNs
router.get("/:companyId", getGRNsByCompany);       // Get all GRNs by Company ID
router.get("/:companyId/:shopId/:transactionCode/", getGRNWithTransactions);   // Get GRN by GRN ID
router.get("/grn-details/:companyId/:shopId/:transactionCode/transactions", getGRNWithTransactionsAndDetails); // Get GRN by GRN ID with transactions
router.get("/supplier/grn-details/:companyId/:shopId/:supplierId", getGRNsBySupplier); // Get GRN by Supplier ID with transactions
router.get("/shop/grn-details/:companyId/:shopId", getGRNsByShop); // Get GRN by Shop ID with transactions

export default router;
