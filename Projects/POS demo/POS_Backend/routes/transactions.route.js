import express from 'express';
import { getAllPaymentTransactions, getPaymentTransactionsByDate, getAllFinishedGoodTransactions, getAllRawMaterialTransactionHeaders, getAllRawMaterialTransactions } from '../controllers/transactions.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.get('/getPaymentTransactionsByDate/:startDate/:endDate', getPaymentTransactionsByDate); // get  transaction for a date range
router.get('/getAllPaymentTransactions', getAllPaymentTransactions); // get all payment transactions
router.get('/getAllFinishedGoodTransactions', getAllFinishedGoodTransactions); // get all finished good transactions
router.get('/getAllRawMaterialTransactionHeaders', getAllRawMaterialTransactionHeaders); // get all Raw Material Transaction Headers transactions
router.get('/getAllRawMaterialTransactions', getAllRawMaterialTransactions); // get all  Raw Material Transaction transactions


export default router;
