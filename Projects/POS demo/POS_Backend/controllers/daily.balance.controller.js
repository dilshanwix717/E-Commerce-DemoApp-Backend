import DailyBalance from "../models/daily.balance.model.js";
import Payment_Transaction from "../models/payment_transaction.model.js";
import { createLog } from "../utils/logger.util.js";
import User from "../models/user.model.js";
import moment from 'moment';

// Function to create a new daily balance entry
export const createDailyBalance = async (req, res, next) => {
    const { companyId, shopId, createdBy, startAmount } = req.body;
    const date = new Date().toISOString().split('T')[0]; // current date in YYYY-MM-DD format
    const dayStart = new Date().toISOString(); // current date-time
    try {
        // Check if a daily balance entry already exists for the current date
        const existingEntry = await DailyBalance.findOne({ date, companyId, shopId });
        if (existingEntry) {
            return res.status(400).json({ message: "A daily balance entry already exists for today." });
        }
        // Create a new daily balance entry
        const newDailyBalance = new DailyBalance({
            //dailyId: "Id-1",
            companyId,
            shopId,
            createdBy,
            date,
            dayStart,
            startAmount,
            dayEnd: "",
            closeAmount: "",
            remarks: ""
        });

        // Save the new entry
        const savedDailyBalance = await newDailyBalance.save();

        // Create a log entry
        await createLog(companyId, shopId, createdBy, `Created daily balance entry for dailyId: ${savedDailyBalance.dailyId}`);

        // Return the saved entry
        res.status(201).json(savedDailyBalance);
    } catch (error) {
        next(error);
    }
};

// Function to update the end-of-day details for a daily balance entry
export const updateDailyBalance = async (req, res, next) => {
    const { companyId, shopId, createdBy, closeAmount, remarks } = req.body;
    const date = new Date().toISOString().split('T')[0]; // current date in YYYY-MM-DD format
    const dayEnd = new Date().toISOString(); // current date-time

    try {
        // Find the existing daily balance entry for the current date
        const dailyBalance = await DailyBalance.findOne({ date, companyId, shopId });
        if (!dailyBalance) {
            return res.status(404).json({ message: "No daily balance entry found for today." });
        }

        if (!companyId || !shopId || !createdBy || closeAmount == null) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Convert closeAmount to a number if it's not already one
        const closeAmountNumber = Number(closeAmount);
        if (isNaN(closeAmountNumber)) {
            return res.status(400).json({ message: "closeAmount must be a valid number." });
        }

        // Ensure dailyBalance.closeAmount is a number before adding
        const currentCloseAmount = dailyBalance.closeAmount || 0;
        dailyBalance.closeAmount = Number(currentCloseAmount) + closeAmountNumber;

        // Update the end-of-day details
        dailyBalance.dayEnd = dayEnd;
        dailyBalance.remarks = remarks;

        // Save the updated entry
        const updatedDailyBalance = await dailyBalance.save();

        // Create a log entry
        await createLog(companyId, shopId, createdBy, `Updated daily balance entry: ${updatedDailyBalance.dailyId}`);

        // You can choose to return the updated balance if needed
        // res.status(200).json(updatedDailyBalance);
    } catch (error) {
        next(error);
    }
};


// Function to get the daily balance entry for a specific date, companyId, and shopId
export const getDailyBalanceByDate = async (req, res, next) => {
    const { companyId, shopId, date } = req.params;

    try {
        // Find the daily balance entry for the specified date
        const dailyBalance = await DailyBalance.findOne({ companyId, shopId, date });
        if (!dailyBalance) {
            return res.status(404).json({ message: "No daily balance entry found for the specified date." });
        }
        // Return the found entry
        res.status(200).json(dailyBalance);
    } catch (error) {
        next(error);
    }
};

// Function to get all daily balance entries for a company and shop
export const getAllDailyBalancesByShop = async (req, res, next) => {
    const { companyId, shopId } = req.params;
    try {
        // Find all daily balance entries for the specified company and shop
        const dailyBalances = await DailyBalance.find({ companyId, shopId }).sort({ date: -1 });
        // Return the found entries
        res.status(200).json(dailyBalances);
    } catch (error) {
        next(error);
    }
};

// Function to get all daily balance entries
export const getAllDailyBalances = async (req, res, next) => {
    try {
        // Find all daily balance entries
        const dailyBalances = await DailyBalance.find({}).sort({ date: -1 });

        // Return the found entries
        res.status(200).json(dailyBalances);
    } catch (error) {
        next(error);
    }
};


// Function to get  daily Cashier details by userId and date
export const getCashierDetails = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const date = req.params.date;

        // Find the cashier details
        const cashier = await User.findOne({ role: "cashier", userId: userId });
        if (!cashier) {
            return res.status(404).json({ message: "No cashier found with the specified userId." });
        }

        // Find the daily balance entry for the specified date
        const dailyBalance = await DailyBalance.findOne({ date, createdBy: userId });
        if (!dailyBalance) {
            return res.status(404).json({ message: "No daily balance entry found for the specified date and userId." });
        }

        // Calculate the cash in hand amount
        const cashInHand = parseFloat(dailyBalance.closeAmount) - parseFloat(dailyBalance.startAmount);
        const closeAmount = dailyBalance.closeAmount;
        const openAmount = dailyBalance.startAmount;
        const startDate = moment(date).startOf('day').toDate();
        const endDate = moment(date).endOf('day').toDate();
        // Calculate additional data from Payment_Transaction
        const paymentTransactions = await Payment_Transaction.find({
            createdBy: userId,
            transactionDateTime: { $gte: startDate, $lt: endDate },
            transactionStatus: "Completed"
        }); const totalTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.billTotal, 0);
        const totalCashTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.cashAmount, 0);
        const totalCardTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.cardAmount, 0);
        const totalWalletTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.walletIn - curr.walletOut, 0);
        const totalOtherTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.otherPayment, 0);

        // Return the cashier details with additional data
        res.json({
            _id: cashier._id,
            userId: cashier.userId,
            name: cashier.name,
            companyId: cashier.companyId,
            tel: cashier.tel,
            address: cashier.address,
            email: cashier.email,
            shopId: cashier.shopId,
            cashInHand: cashInHand.toString(),
            date,
            closeAmount: closeAmount,
            openAmount: openAmount,
            totalCashTransactions: totalCashTransactions.toString(),
            totalCardTransactions: totalCardTransactions.toString(),
            totalWalletTransactions: totalWalletTransactions.toString(),
            totalOtherTransactions: totalOtherTransactions.toString(),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// Function to get all daily Cashier details
export const getAllCashierDetails = async (req, res, next) => {
    try {
        const date = req.params.date;

        // Find all cashiers
        const cashiers = await User.find({ role: "cashier" });
        if (!cashiers) {
            return res.status(404).json({ message: "No cashiers found." });
        }

        const cashierDetails = [];

        // Loop through each cashier
        for (const cashier of cashiers) {
            const userId = cashier.userId;

            // Find the daily balance entry for the specified date
            const dailyBalance = await DailyBalance.findOne({ date, createdBy: userId });
            if (!dailyBalance) {
                continue; // skip if no daily balance entry found
            }

            // Calculate the cash in hand amount
            const cashInHand = dailyBalance.startAmount; /*parseFloat(dailyBalance.closeAmount) - parseFloat(dailyBalance.startAmount);*/
            const closeAmount = dailyBalance.closeAmount;
            const openAmount = dailyBalance.startAmount;
            const startDate = moment(date).startOf('day').toDate();
            const endDate = moment(date).endOf('day').toDate();

            // Calculate additional data from Payment_Transaction
            const paymentTransactions = await Payment_Transaction.find({
                createdBy: userId,
                transactionDateTime: { $gte: startDate, $lt: endDate },
                transactionStatus: "Completed"
            }); const totalTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.billTotal, 0);
            const totalCashTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.cashAmount, 0);
            const totalCardTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.cardAmount, 0);
            const totalWalletTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.walletIn - curr.walletOut, 0);
            const totalOtherTransactions = paymentTransactions.reduce((acc, curr) => acc + curr.otherPayment, 0);

            // Add cashier details to the result array
            cashierDetails.push({
                _id: cashier._id,
                userId: cashier.userId,
                name: cashier.name,
                companyId: cashier.companyId,
                tel: cashier.tel,
                address: cashier.address,
                email: cashier.email,
                shopId: cashier.shopId,
                cashInHand: cashInHand.toString(),
                date,
                closeAmount: closeAmount,
                openAmount: openAmount,
                totalCashTransactions: totalCashTransactions.toString(),
                totalCardTransactions: totalCardTransactions.toString(),
                totalWalletTransactions: totalWalletTransactions.toString(),
                totalOtherTransactions: totalOtherTransactions.toString(),
            });
        }

        res.json(cashierDetails);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};