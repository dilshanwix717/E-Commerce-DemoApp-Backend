import DailyBalance from "../models/daily.balance.model.js";
import billofmaterials from '../models/bom.model.js';
import finishedgood_transaction from "../models/finishedgood_transaction.model.js";
import Inventory_Stock from '../models/inventory.stock.model.js';
import Product from '../models/product.model.js'; // Import the Product model
import { createLog } from "../utils/logger.util.js";
import RawMaterialTransaction from '../models/raw_material_transaction.model.js';


/**
 * Generate inventory movement report for a given time period
 * Shows beginning inventory, purchases, sales, and ending inventory
 */

export const getInventoryMovementReport = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { startDate, endDate } = req.query;

        // Validate date inputs
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        parsedEndDate.setHours(23, 59, 59, 999); // Include the entire end date

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD format." });
        }

        // Get inventory items, products, and raw material transactions in a single batch
        const [inventoryItems, products, rawMaterialTransactions] = await Promise.all([
            Inventory_Stock.find({ companyId, shopId }).lean(),
            Product.find({ companyId }).lean(),
            RawMaterialTransaction.find({
                companyId,
                shopId,
                transactionDateTime: { $lte: parsedEndDate },
                transactionStatus: { $ne: 'Cancelled' }
            }).lean()
        ]);

        if (!inventoryItems.length) {
            return res.status(404).json({ message: "No inventory items found." });
        }

        // Create mappings for faster lookups
        const productMap = {};
        products.forEach(product => {
            productMap[product.productId] = product;
        });

        // Get all product IDs from inventory
        const productIds = inventoryItems.map(item => item.productId);

        // Get all finished good transactions in one go
        const [allFinishedTransactions, bomItems] = await Promise.all([
            finishedgood_transaction.find({
                companyId,
                shopId,
                $or: [
                    { finishedgoodId: { $in: productIds } },
                    { "usedProductDetails.productId": { $in: productIds } }
                ],
                transactionDateTime: { $lte: parsedEndDate },
                transactionStatus: { $ne: 'Cancelled' }
            }).lean(),
            billofmaterials.find({ companyId }).lean()
        ]);

        // Create a map for BOMs for faster lookups
        const bomMap = {};
        bomItems.forEach(bom => {
            bomMap[bom.finishedGoodId] = bom;
        });

        // Organize transactions by product and type
        const transactionsByProduct = {};

        // Initialize data structure for each product
        productIds.forEach(productId => {
            transactionsByProduct[productId] = {
                beforePeriodPurchases: 0,
                beforePeriodDirectSales: 0,
                beforePeriodIndirectSales: 0,
                periodPurchases: 0,
                periodDirectSales: 0,
                periodIndirectSales: 0
            };
        });

        // Process raw material transactions (GRNs)
        rawMaterialTransactions.forEach(transaction => {
            const { productId, transactionType, rawMatInOut, transactionDateTime, quantity } = transaction;
            const transactionDate = new Date(transactionDateTime);
            const isPeriodTransaction = transactionDate >= parsedStartDate && transactionDate <= parsedEndDate;

            // Only process if it's a product we're tracking and it's an inbound GRN
            if (productIds.includes(productId) && transactionType === 'GRN' && rawMatInOut === 'In') {
                if (isPeriodTransaction) {
                    transactionsByProduct[productId].periodPurchases += quantity;
                } else if (transactionDate < parsedStartDate) {
                    transactionsByProduct[productId].beforePeriodPurchases += quantity;
                }
            }
        });

        // Process all finished good transactions
        allFinishedTransactions.forEach(transaction => {
            const { finishedgoodId, transactionType, transactionInOut, transactionDateTime, finishedgoodQty, usedProductDetails, transactionStatus } = transaction;
            const transactionDate = new Date(transactionDateTime);
            const isPeriodTransaction = transactionDate >= parsedStartDate && transactionDate <= parsedEndDate;

            // Direct transactions (product itself was sold)
            if (productIds.includes(finishedgoodId)) {
                if (transactionType === "Sales" && transactionInOut === "Out" && transactionStatus === "Completed") {
                    if (isPeriodTransaction) {
                        transactionsByProduct[finishedgoodId].periodDirectSales += finishedgoodQty;
                    } else if (transactionDate < parsedStartDate) {
                        transactionsByProduct[finishedgoodId].beforePeriodDirectSales += finishedgoodQty;
                    }
                }
            }

            // Indirect transactions (product used as raw material)
            if (transactionType === "Sales" && transactionInOut === "Out" && transactionStatus === "Completed" && usedProductDetails && usedProductDetails.length > 0) {
                usedProductDetails.forEach(detail => {
                    const { productId, quantity } = detail;
                    if (productIds.includes(productId)) {
                        if (isPeriodTransaction) {
                            transactionsByProduct[productId].periodIndirectSales += quantity;
                        } else if (transactionDate < parsedStartDate) {
                            transactionsByProduct[productId].beforePeriodIndirectSales += quantity;
                        }
                    }
                });
            }
        });

        // Generate report data
        const reportData = inventoryItems.map(item => {
            const productId = item.productId;
            const product = productMap[productId];

            if (!product) {
                return null; // Skip if product not found
            }

            const transactions = transactionsByProduct[productId];

            // Calculate beginning inventory based on transactions before the period
            const beginningInventory = Math.max(0,
                transactions.beforePeriodPurchases -
                transactions.beforePeriodDirectSales -
                transactions.beforePeriodIndirectSales
            );

            // Calculate ending inventory
            const endingInventory = Math.max(0,
                beginningInventory +
                transactions.periodPurchases -
                transactions.periodDirectSales -
                transactions.periodIndirectSales
            );

            return {
                productId,
                productName: product.name,
                pluCode: product.pluCode,
                categoryId: product.categoryId,
                beginningInventory,
                purchases: transactions.periodPurchases,
                directSales: transactions.periodDirectSales,
                indirectSales: transactions.periodIndirectSales,
                totalSales: transactions.periodDirectSales + transactions.periodIndirectSales,
                endingInventory,
                currentInventory: item.totalQuantity,
                minimumQuantity: item.minimumQuantity,
                needsRestock: item.totalQuantity < item.minimumQuantity
            };
        }).filter(Boolean); // Remove null items

        // Sort reportData by totalSales in descending order (highest sales first)
        reportData.sort((a, b) => b.totalSales - a.totalSales);

        // Log the successful report generation
        createLog(companyId, shopId, req.userId, `Inventory movement report generated for period ${startDate} to ${endDate}`);

        res.status(200).json({
            message: "Inventory movement report generated successfully",
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            reportData
        });
    } catch (error) {
        console.error("Error generating inventory movement report:", error);
        next(error);
    }
};









export const salesAndProfit = async (req, res, next) => {
    try {
        const transactions = await finishedgood_transaction.find();

        const results = await Promise.all(
            transactions.map(async (transaction) => {
                const finishedgoodId = transaction.finishedgoodId;
                const quantity = transaction.quantity;
                const sellingPrice = transaction.sellingPrice;
                const discountAmount = transaction.discountAmount;

                // Get the product to check if it has raw materials
                const product = await Product.findOne({ productId: finishedgoodId });

                if (!product) {
                    throw new Error(`Product not found with ID ${finishedgoodId}`);
                }

                let cost = 0;

                // Calculate cost based on whether the product has raw materials
                if (product.hasRawMaterials) {
                    // Get the bill of materials for the finished good
                    const bom = await billofmaterials.findOne({ finishedgoodId });
                    if (!bom) {
                        // Log warning but continue with cost as 0
                        console.warn(`Bill of materials not found for finished good ${finishedgoodId} although hasRawMaterials is true`);
                    } else {
                        // Calculate the cost of the finished good using raw materials
                        cost = await calculateCost(bom, quantity);
                    }
                } else {
                    // For products without raw materials, try to get cost from inventory stock if available
                    const inventory = await Inventory_Stock.findOne({ productId: finishedgoodId });
                    if (inventory && inventory.weightedAverageCost) {
                        cost = inventory.weightedAverageCost * quantity;
                    }
                    // If no inventory cost found, cost remains 0
                }

                // Calculate the total price after discount and quantity
                const totalPrice = (sellingPrice - discountAmount) * quantity;

                // Calculate the profit
                const profit = totalPrice - cost;

                // Create the sales and profit object
                const salesAndProfit = {
                    companyId: transaction.companyId,
                    shopId: transaction.shopId,
                    finishedgoodId,
                    sellingType: transaction.sellingType,
                    OrderNo: transaction.OrderNo,
                    customerId: transaction.customerId,
                    quantity,
                    discountAmount,
                    sellingPrice,
                    totalPrice,
                    cost,
                    profit,
                    transactionDateTime: transaction.transactionDateTime,
                    transactionCode: transaction.transactionCode,
                    hasRawMaterials: product.hasRawMaterials,
                };

                return salesAndProfit;
            })
        );

        res.status(200).json(results);
    } catch (error) {
        console.error(error);
        next(error);
    }
};


async function calculateCost(bom, quantity) {
    let cost = 0;
    for (const item of bom.items) {
        const productId = item.productId;
        const qty = item.qty * quantity;
        const inventory = await Inventory_Stock.findOne({ productId });
        if (!inventory) {
            throw new Error(`Inventory not found for product ${productId}`);
        }
        const productCost = inventory.weightedAverageCost * qty;
        cost += productCost;
    }
    return cost;
}
