import Payment_Transaction from "../models/payment_transaction.model.js";
import finishedgood_transaction from "../models/finishedgood_transaction.model.js";
import raw_material_transaction_header from "../models/raw_material_transaction_header.model.js";
import raw_material_transaction from "../models/raw_material_transaction.model.js";


import { createLog } from "../utils/logger.util.js";


// Function to get all  Payment_Transaction 
export const getAllPaymentTransactions = async (req, res, next) => {
    try {
        const transactions = await Payment_Transaction.find();
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Function to get   Payment_Transaction by date range
export const getPaymentTransactionsByDate = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.params;
        const transactions = await Payment_Transaction.find({
            transactionDateTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Function to get all  finishedgood_transaction 
export const getAllFinishedGoodTransactions = async (req, res, next) => {
    try {
        const transactions = await finishedgood_transaction.find();
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Function to get all  raw_material_transaction_headers 
export const getAllRawMaterialTransactionHeaders = async (req, res, next) => {
    try {
        const transactions = await raw_material_transaction_header.find();
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Function to get all  raw_material_transactions
export const getAllRawMaterialTransactions = async (req, res, next) => {
    try {
        const transactions = await raw_material_transaction.find();
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};