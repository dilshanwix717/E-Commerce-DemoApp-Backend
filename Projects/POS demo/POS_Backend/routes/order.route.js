import express from 'express';
import { createOrder, cancelOrder, getAllOrders, getOrder, getSales, orderReturn } from '../controllers/order.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.post('/create-new', verifyToken, createOrder);                       // Create a new order
router.post('/cancel-order/:transactionCode', verifyToken, cancelOrder);    // Cancel an order
router.post('/return-order', verifyToken, orderReturn);
router.get('/', verifyToken, getAllOrders);                                 // Get all orders
router.get('/:transactionCode', verifyToken, getOrder);                     // Get an order by transaction code
router.get('/Sales/:startDate/:endDate', verifyToken, getSales);            // Get all Sales

export default router;
