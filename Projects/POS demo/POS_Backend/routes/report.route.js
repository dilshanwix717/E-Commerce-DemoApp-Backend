import express from 'express';
import { salesAndProfit, getInventoryMovementReport } from '../controllers/report.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.get('/salesAndProfit', salesAndProfit); // get sales and profits
router.get('/inventoryReport', verifyToken, getInventoryMovementReport); // get sales and profits
//router.get('/salesAndProfit', salesAndProfit); // get sales and profits

export default router;