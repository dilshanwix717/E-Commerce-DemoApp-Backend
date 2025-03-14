import express from 'express';
import {
    getInventoryStockReport,
    getDailyInventoryReport,
    getWeeklyInventoryReport,
    getMonthlyInventoryReport,
    getLowStockReport
} from '../controllers/inventory.report.controller.js';
import { verifyToken } from '../middleware/jwt.js';


const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Custom inventory reports
router.get('/report', getInventoryStockReport);
router.get('/daily-report', getDailyInventoryReport);
router.get('/weekly-report', getWeeklyInventoryReport);
router.get('/monthly-report', getMonthlyInventoryReport);
router.get('/low-stock', getLowStockReport);

export default router;