import express from "express";
import { check } from "express-validator";
import { verifyToken } from "../middleware/jwt.js";
const router = express.Router();

// Import POS controllers
import { createDailyBalance, updateDailyBalance, getDailyBalanceByDate, getAllDailyBalances, getAllDailyBalancesByShop, getCashierDetails, getAllCashierDetails } from "../controllers/daily.balance.controller.js";


// Daily balance routes
router.post("/daily-balance/day-start", createDailyBalance); // Create a new daily balance entry
//router.put("/daily-balance/day-end", verifyToken, updateDailyBalance); // remove this later
router.get("/daily-balance/get/:companyId/:shopId/:date", getDailyBalanceByDate); // Get the daily balance entry for a specific date
router.get("/daily-balance/getAllbyShop/:companyId/:shopId", getAllDailyBalancesByShop); // Get all daily balance entries for a company specific shop
router.get("/daily-balance/getAll", getAllDailyBalances); // Get all daily balance entries for all company shops
router.get("/daily-balance/getCashierDetails/:userId/:date", getCashierDetails);
router.get("/daily-balance/getAllCashierDetails/:date", getAllCashierDetails);
export default router;
