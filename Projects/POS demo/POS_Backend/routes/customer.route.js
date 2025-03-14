import express from "express";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import the controller file
import { createCustomer, getAllCustomers, getCustomerById, updateCustomer } from "../controllers/customer.controller.js";

// Product routes
router.post("/new-customer", verifyToken, createCustomer);    // Create a new customer
router.get("/", getAllCustomers);                            // Retrieve all customer
router.get("/:customerId", getCustomerById);                  // Retrieve a single customer by customerId
router.put("/update-customer", verifyToken, updateCustomer);

export default router;
