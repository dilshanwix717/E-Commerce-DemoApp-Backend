import Inventory from "../models/inventory.stock.model.js";
import FinishedGoodTransaction from "../models/finishedgood_transaction.model.js";
import Product from "../models/product.model.js";
import BOM from "../models/bom.model.js";
import { createLog } from "../utils/logger.util.js";

// Get inventory stock changes for a specified time period
export const getInventoryStockReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { startDate, endDate, categoryId } = req.query;

        // Validate date parameters
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of day

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD format." });
        }

        // Find all inventory items for the company and shop
        let inventoryQuery = {
            companyId,
            shopId,
        };

        // Add category filter if provided
        if (categoryId) {
            inventoryQuery.categoryId = categoryId;
        }

        const inventoryItems = await Inventory.find(inventoryQuery);

        // Get all transactions within the date range
        const transactions = await FinishedGoodTransaction.find({
            companyId,
            shopId,
            transactionDateTime: { $gte: start, $lte: end },
            transactionStatus: { $in: ["Completed", "Partially Returned"] }
        }).sort({ transactionDateTime: 1 });

        // Prepare the results array
        const results = await Promise.all(inventoryItems.map(async (item) => {
            // Get the product details
            const product = await Product.findOne({ productId: item.productId });
            if (!product) {
                return null; // Skip if product not found
            }

            // Calculate transactions before the start date to determine beginning stock
            const beforeStartTransactions = await FinishedGoodTransaction.find({
                companyId,
                shopId,
                transactionDateTime: { $lt: start },
                transactionStatus: { $in: ["Completed", "Partially Returned"] }
            });

            // Initial values
            let beginningStock = item.totalQuantity;
            let incomingStock = 0;
            let outgoingStock = 0;
            let adjustments = 0;
            let wastage = 0;
            let returns = 0;

            // Calculate beginning stock by subtracting all transactions after now and adding back transactions in our date range
            for (const transaction of beforeStartTransactions) {
                const productImpact = getProductQuantityImpact(transaction, item.productId);
                beginningStock -= productImpact;
            }

            // Process transactions within the date range
            for (const transaction of transactions) {
                const quantityImpact = getProductQuantityImpact(transaction, item.productId);

                if (quantityImpact === 0) continue;

                switch (transaction.transactionType) {
                    case "Purchase":
                    case "GRN":
                        incomingStock += Math.abs(quantityImpact);
                        break;
                    case "Sales":
                        outgoingStock += Math.abs(quantityImpact);
                        break;
                    case "Adjustment":
                        adjustments += quantityImpact; // Can be positive or negative
                        break;
                    case "Wastage":
                        wastage += Math.abs(quantityImpact);
                        break;
                    case "Return":
                        returns += Math.abs(quantityImpact);
                        break;
                }
            }

            // Calculate ending stock
            const endingStock = beginningStock + incomingStock - outgoingStock + adjustments - wastage + returns;

            return {
                productId: item.productId,
                productName: product.name,
                categoryId: item.categoryId,
                beginningStock,
                incomingStock,
                outgoingStock,
                adjustments,
                wastage,
                returns,
                endingStock,
                uomId: product.uomId || 'N/A',
                minQty: item.minimumQuantity
            };
        }));

        // Filter out null results and sort by productName
        const filteredResults = results.filter(result => result !== null)
            .sort((a, b) => a.productName.localeCompare(b.productName));

        // Log the report generation
        createLog(companyId, shopId, req.userId, `Generated inventory stock report from ${startDate} to ${endDate}`);

        res.status(200).json({
            message: "Inventory stock report generated successfully",
            timeRange: { startDate, endDate },
            data: filteredResults
        });
    } catch (error) {
        console.error("Error generating inventory stock report:", error);
        next(error);
    }
};

// Helper function to determine quantity impact of a transaction on a specific product
function getProductQuantityImpact(transaction, productId) {
    // Direct impact if the transaction is for this finished good 
    if (transaction.finishedgoodId === productId) {
        const qty = transaction.finishedgoodQty || 0;
        return transaction.transactionInOut === "In" ? qty : -qty;
    }

    // Check used product details for raw materials
    if (transaction.usedProductDetails && transaction.usedProductDetails.length > 0) {
        const matchingProduct = transaction.usedProductDetails.find(
            detail => detail.productId === productId
        );

        if (matchingProduct) {
            const qty = matchingProduct.quantity || 0;
            return transaction.transactionInOut === "In" ? qty : -qty;
        }
    }

    return 0; // No impact on this product
}

// Get daily inventory stock changes
export const getDailyInventoryReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { date, categoryId } = req.query;

        // Set start and end of the specified day
        const reportDate = new Date(date);
        const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999));

        if (isNaN(startOfDay.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD format." });
        }

        // Create query parameters for the main report function
        req.query.startDate = startOfDay.toISOString().split('T')[0];
        req.query.endDate = endOfDay.toISOString().split('T')[0];

        // Call the main report function
        await getInventoryStockReport(req, res, next);
    } catch (error) {
        console.error("Error generating daily inventory report:", error);
        next(error);
    }
};

// Get weekly inventory stock changes
export const getWeeklyInventoryReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { date, categoryId } = req.query;

        // Set start as the beginning of the week containing the specified date
        const reportDate = new Date(date);
        const dayOfWeek = reportDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(reportDate);
        startOfWeek.setDate(reportDate.getDate() - dayOfWeek); // Go back to Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        // Set end as the end of the week (Saturday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        if (isNaN(startOfWeek.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD format." });
        }

        // Create query parameters for the main report function
        req.query.startDate = startOfWeek.toISOString().split('T')[0];
        req.query.endDate = endOfWeek.toISOString().split('T')[0];

        // Call the main report function
        await getInventoryStockReport(req, res, next);
    } catch (error) {
        console.error("Error generating weekly inventory report:", error);
        next(error);
    }
};

// Get monthly inventory stock changes
export const getMonthlyInventoryReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { year, month, categoryId } = req.query;

        // Validate year and month
        const yearNum = parseInt(year);
        const monthNum = parseInt(month) - 1; // JS months are 0-indexed

        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
            return res.status(400).json({ message: "Invalid year or month format. Month should be 1-12." });
        }

        // Set start as the first day of the month
        const startOfMonth = new Date(yearNum, monthNum, 1, 0, 0, 0, 0);

        // Set end as the last day of the month
        const endOfMonth = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

        // Create query parameters for the main report function
        req.query.startDate = startOfMonth.toISOString().split('T')[0];
        req.query.endDate = endOfMonth.toISOString().split('T')[0];

        // Call the main report function
        await getInventoryStockReport(req, res, next);
    } catch (error) {
        console.error("Error generating monthly inventory report:", error);
        next(error);
    }
};

// Get inventory items below minimum quantity threshold
export const getLowStockReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { categoryId } = req.query;

        // Find all inventory items for the company and shop
        let inventoryQuery = {
            companyId,
            shopId
        };

        // Add category filter if provided
        if (categoryId) {
            inventoryQuery.categoryId = categoryId;
        }

        const inventoryItems = await Inventory.find(inventoryQuery);

        const lowStockItems = await Promise.all(inventoryItems.map(async (item) => {
            // Get the product details
            const product = await Product.findOne({ productId: item.productId });
            if (!product) {
                return null; // Skip if product not found
            }

            // Only include items where current stock is below minimum quantity
            if (item.totalQuantity <= item.minimumQuantity) {
                return {
                    productId: item.productId,
                    productName: product.name,
                    categoryId: item.categoryId,
                    currentStock: item.totalQuantity,
                    minimumQuantity: item.minimumQuantity,
                    deficit: item.minimumQuantity - item.totalQuantity,
                    uomId: product.uomId || 'N/A'
                };
            }

            return null;
        }));

        // Filter out null results and sort by deficit (highest first)
        const filteredResults = lowStockItems.filter(item => item !== null)
            .sort((a, b) => b.deficit - a.deficit);

        // Log the report generation
        createLog(companyId, shopId, req.userId, "Generated low stock inventory report");

        res.status(200).json({
            message: "Low stock inventory report generated successfully",
            data: filteredResults
        });
    } catch (error) {
        console.error("Error generating low stock report:", error);
        next(error);
    }
};