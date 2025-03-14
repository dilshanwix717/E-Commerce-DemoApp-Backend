import FinishedGoodTransaction from "../models/finishedgood_transaction.model.js";
import PaymentTransaction from "../models/payment_transaction.model.js";
import { generateNewCodeNumber } from "../utils/code.generator.util.js";
import { createLog } from "../utils/logger.util.js";
import Inventory from "../models/inventory.stock.model.js";
import BOM from "../models/bom.model.js";
import Product from "../models/product.model.js";
import Wastage from "../models/wastage.model.js";
import { io } from "../server.js";
import { updateDailyBalance } from "./daily.balance.controller.js"

// Create a new order
export const createOrder = async (req, res, next) => {
    try {
        const { companyId, shopId, userId } = req;
        const { order } = req.body;

        // Generate a new transaction code
        const description = "SalesID"; // or another relevant description
        const codeGen = await generateNewCodeNumber(companyId, shopId, userId, description);
        const transactionCode = codeGen.code_number;

        // Create the payment transaction
        const paymentTransaction = new PaymentTransaction({
            paymentID: "PaymentID-1", // This will be auto-generated by pre-save hook
            companyId,
            shopId,
            transactionDateTime: new Date(),
            invoiceID: order.invoiceID,
            transactionType: "Sales",
            transactionCode,
            billTotal: order.billTotal,//close amount
            cashAmount: order.cashAmount,
            cardAmount: order.cardAmount,
            cardDigits: order.cardDigits,
            walletIn: order.walletIn,
            walletOut: order.walletOut,
            otherPayment: order.otherPayment,
            loyaltyPoints: order.loyaltyPoints,
            transactionInOut: "In",
            transactionStatus: "Completed",
            customerId: order.customerId,
            sellingTypeID: order.sellingTypeID,
            sellingTypeCharge: order.sellingTypeCharge,
            sellingTypeAmount: order.sellingTypeAmount,
            createdBy: userId
        });

        await paymentTransaction.save();
        // Log the successful creation
        createLog(companyId, shopId, userId, `Order created with transaction code: ${transactionCode}`);

        // Process each order item
        for (const orderItem of order.items) {
            // Get product details to determine how to process
            const product = await Product.findOne({ productId: orderItem.productId });
            if (!product) {
                throw new Error(`Product not found for product ID: ${orderItem.productId}`);
            }

            let usedProductDetails = [];

            // Process BOM if product has raw materials
            if (product.hasRawMaterials) {
                const bom = await BOM.findOne({ finishedGoodId: orderItem.productId });
                console.log("ordered product", orderItem.productId);

                if (bom && bom.items && bom.items.length > 0) {
                    // Process each BOM item
                    for (const bomItem of bom.items) {
                        const inventoryItem = await Inventory.findOne({
                            companyId,
                            shopId,
                            productId: bomItem.productId
                        });

                        if (!inventoryItem) {
                            throw new Error(`Inventory not found for raw material: ${bomItem.productId}`);
                        }

                        const usedProductDetail = {
                            productId: bomItem.productId,
                            quantity: bomItem.qty * orderItem.quantity,
                            currentWAC: inventoryItem.weightedAverageCost
                        };

                        usedProductDetails.push(usedProductDetail);

                        // Reduce inventory stock
                        inventoryItem.totalQuantity -= usedProductDetail.quantity;

                        if (inventoryItem.totalQuantity < 0) {
                            throw new Error(`Insufficient inventory for raw material: ${bomItem.productId}`);
                        }
                        io.emit("updateInventory", inventoryItem);
                        await inventoryItem.save();
                    }
                } else {
                    throw new Error(`BOM not found or empty for product with ID: ${orderItem.productId}`);
                }
            }
            // Only check direct inventory if the product doesn't have raw materials
            else if (product.requiresGRN) {
                // Find inventory for this product
                const inventoryItem = await Inventory.findOne({
                    companyId,
                    shopId,
                    productId: orderItem.productId
                });

                if (!inventoryItem) {
                    throw new Error(`Inventory not found for direct product: ${orderItem.productId}`);
                }

                // Add to usedProductDetails for transaction record
                usedProductDetails.push({
                    productId: orderItem.productId,
                    quantity: orderItem.quantity,
                    currentWAC: inventoryItem.weightedAverageCost
                });

                // Reduce inventory stock
                inventoryItem.totalQuantity -= orderItem.quantity;

                if (inventoryItem.totalQuantity < 0) {
                    throw new Error(`Insufficient inventory for direct product: ${orderItem.productId}`);
                }
                io.emit("updateInventory", inventoryItem);
                await inventoryItem.save();
            }

            // Create finished good transaction
            const finishedGoodTransaction = new FinishedGoodTransaction({
                ftId: "FTID-1", // This will be auto-generated by pre-save hook
                companyId,
                shopId,
                finishedgoodId: orderItem.productId, // The finished good ID
                usedProductDetails,
                transactionDateTime: new Date(),
                transactionType: "Sales",
                OrderNo: order.invoiceID,
                transactionCode,
                sellingType: order.sellingType,
                sellingPrice: orderItem.sellingPrice,
                discountAmount: orderItem.discountAmount,
                customerId: order.customerId,
                transactionInOut: "Out",
                finishedgoodQty: orderItem.quantity, // Quantity of finished good
                transactionStatus: "Completed",
                createdBy: userId
            });

            await finishedGoodTransaction.save();
        }

        // Call updateDailyBalance logic
        const dailyBalanceReq = {
            body: {
                companyId,
                shopId,
                createdBy: userId,
                closeAmount: order.billTotal, // Adjust this depending on how you calculate closeAmount
                remarks: `Order processed with transaction code: ${transactionCode}`
            }
        };
        await updateDailyBalance(dailyBalanceReq, res, next);

        res.status(201).json({ message: "Order and transactions created successfully", transactionCode });
    } catch (error) {
        console.error("Error creating order:", error);
        next(error);
    }
};


// Cancel an order (Reverse the transactions)
export const cancelOrder = async (req, res, next) => {
    try {
        const { companyId, shopId, userId } = req;
        const { transactionCode } = req.params;

        // Find the payment transaction
        const paymentTransaction = await PaymentTransaction.findOne({ transactionCode });

        if (!paymentTransaction) {
            return res.status(404).json({ message: "Payment transaction not found." });
        }

        // Find all related finished good transactions
        const finishedGoodTransactions = await FinishedGoodTransaction.find({ transactionCode });

        if (!finishedGoodTransactions.length) {
            return res.status(404).json({ message: "Finished good transactions not found." });
        }

        // Revert inventory stock for each transaction
        for (const transaction of finishedGoodTransactions) {
            const productId = transaction.finishedgoodId;

            // Get product details to determine how to process
            const product = await Product.findOne({ productId });
            if (!product) {
                throw new Error(`Product not found for product ID: ${productId}`);
            }

            // Process used product details to revert inventory
            if (transaction.usedProductDetails && transaction.usedProductDetails.length > 0) {
                for (const usedProductDetail of transaction.usedProductDetails) {
                    const inventoryItem = await Inventory.findOne({
                        companyId,
                        shopId,
                        productId: usedProductDetail.productId
                    });

                    if (!inventoryItem) {
                        throw new Error(`Inventory not found for product ID: ${usedProductDetail.productId}`);
                    }

                    inventoryItem.totalQuantity += usedProductDetail.quantity;
                    io.emit("updateInventory", inventoryItem);
                    await inventoryItem.save();
                }
            }
        }

        // Update status of payment transaction
        paymentTransaction.transactionStatus = "Cancelled";
        io.emit("cancelOrder", paymentTransaction);
        await paymentTransaction.save();

        // Update status of finished good transactions
        for (const transaction of finishedGoodTransactions) {
            transaction.transactionStatus = "Cancelled";
            await transaction.save();
        }

        io.emit("cancelFinishedGoodTransactions", finishedGoodTransactions);

        // Log the cancellation
        createLog(companyId, shopId, userId, `Order cancelled with transaction code: ${transactionCode}`);

        res.status(200).json({ message: "Order and transactions cancelled successfully", transactionCode });
    } catch (error) {
        console.error("Error cancelling order:", error);
        next(error);
    }
};

//////////////////////////////// - Product Return Item vise - /////////////////////////////////////////////
// Return specific items in an order (Partial return)
// According to item condition, the inventory will be updated and wastage will be created
export const orderReturn = async (req, res, next) => {
    try {
        const { companyId, shopId, userId } = req;
        const { transactionCode, itemsToReturn } = req.body; // itemsToReturn is an array of objects containing { productId, quantity, condition }

        // Find the payment transaction
        const paymentTransaction = await PaymentTransaction.findOne({ transactionCode });

        if (!paymentTransaction) {
            return res.status(404).json({ message: "Payment transaction not found." });
        }

        // Find all related finished good transactions
        const finishedGoodTransactions = await FinishedGoodTransaction.find({ transactionCode });

        if (!finishedGoodTransactions.length) {
            return res.status(404).json({ message: "Finished good transactions not found." });
        }

        // Process each item specified for return
        for (const returnItem of itemsToReturn) {
            const { productId, quantity, condition } = returnItem;

            // Find the corresponding finished good transaction for the product
            const transaction = finishedGoodTransactions.find(trans =>
                trans.finishedgoodId === productId && trans.transactionStatus === "Completed");

            if (!transaction) {
                return res.status(404).json({ message: `Transaction not found for product ID: ${productId}` });
            }

            // Ensure the quantity to return does not exceed the original transaction quantity
            if (quantity > transaction.finishedgoodQty) {
                return res.status(400).json({ message: `Return quantity exceeds original quantity for product ID: ${productId}` });
            }

            // Get product details to determine how to process the return
            const product = await Product.findOne({ productId });
            if (!product) {
                throw new Error(`Product not found for product ID: ${productId}`);
            }

            // Check the condition of the product (Good, Damaged, Expired)
            if (condition === "Good") {
                // Handle return based on product type
                if (product.hasRawMaterials) {
                    // Return raw materials to inventory using BOM
                    const bom = await BOM.findOne({ finishedGoodId: productId });

                    if (!bom) {
                        throw new Error(`BOM not found for finished good ID: ${productId}`);
                    }

                    for (const bomItem of bom.items) {
                        const inventoryItem = await Inventory.findOne({
                            companyId,
                            shopId,
                            productId: bomItem.productId
                        });

                        if (!inventoryItem) {
                            throw new Error(`Inventory not found for product ID: ${bomItem.productId}`);
                        }

                        inventoryItem.totalQuantity += bomItem.qty * quantity; // Adjust by the returned quantity
                        io.emit("updateInventory", inventoryItem);
                        await inventoryItem.save();
                    }
                } else if (product.requiresGRN) {
                    // For direct inventory products, return the product to inventory
                    const inventoryItem = await Inventory.findOne({
                        companyId,
                        shopId,
                        productId
                    });

                    if (!inventoryItem) {
                        throw new Error(`Inventory not found for direct product ID: ${productId}`);
                    }

                    inventoryItem.totalQuantity += quantity;
                    io.emit("updateInventory", inventoryItem);
                    await inventoryItem.save();
                }
            } else if (condition === "Damaged" || condition === "Expired") {
                // Create a wastage entry regardless of product type
                const wastage = new Wastage({
                    wastageId: 'wastageId-1',
                    productId,
                    quantity,
                    uomId: "Unit", // Assuming uomId is known or can be derived
                    reason: "Returned Order",
                    condition,
                    companyId,
                    shopId,
                    date: new Date(),
                    userId
                });

                await wastage.save();
            }

            // Adjust the finished good transaction for partial return
            transaction.finishedgoodQty -= quantity;
            if (transaction.finishedgoodQty === 0) {
                transaction.transactionStatus = "Returned";
            } else {
                transaction.transactionStatus = "Partially Returned";
            }

            await transaction.save();
        }

        // Update the payment transaction status based on overall return status
        const allReturned = finishedGoodTransactions.every(trans =>
            trans.transactionStatus === 'Returned' || trans.transactionStatus === 'Partially Returned');
        paymentTransaction.transactionStatus = allReturned ? "Returned" : "Partially Returned";
        io.emit("orderReturned", paymentTransaction);
        await paymentTransaction.save();

        // Log the return action
        createLog(companyId, shopId, userId, `Order partially returned with transaction code: ${transactionCode}`);

        res.status(200).json({ message: "Specified items returned successfully", transactionCode });
    } catch (error) {
        console.error("Error returning order:", error);
        next(error);
    }
};

// Create a new order
// export const createOrder = async (req, res, next) => {
//     try {
//         const { companyId, shopId, userId } = req;
//         const { order } = req.body;

//         // Generate a new transaction code
//         const description = "SalesID"; // or another relevant description
//         const codeGen = await generateNewCodeNumber(companyId, shopId, userId, description);
//         const transactionCode = codeGen.code_number;

//         // Create the payment transaction
//         const paymentTransaction = new PaymentTransaction({
//             paymentID: "PaymentID-1", // This will be auto-generated by pre-save hook
//             companyId,
//             shopId,
//             transactionDateTime: new Date(),
//             invoiceID: order.invoiceID,
//             transactionType: "Sales",
//             transactionCode,
//             billTotal: order.billTotal,//close amount
//             cashAmount: order.cashAmount,
//             cardAmount: order.cardAmount,
//             cardDigits: order.cardDigits,
//             walletIn: order.walletIn,
//             walletOut: order.walletOut,
//             otherPayment: order.otherPayment,
//             loyaltyPoints: order.loyaltyPoints, // Not yet needed
//             transactionInOut: "In",
//             transactionStatus: "Completed",
//             customerId: order.customerId,
//             sellingTypeID: order.sellingTypeID,
//             sellingTypeCharge: order.sellingTypeCharge,
//             sellingTypeAmount: order.sellingTypeAmount,
//             createdBy: userId
//         });

//         await paymentTransaction.save();
//         // Log the successful creation
//         createLog(companyId, shopId, userId, `Order created with transaction code: ${transactionCode}`);

//         for (const orderItem of order.items) {
//             const bom = await BOM.findOne({ finishedGoodId: orderItem.productId });
//             if (!bom) {
//                 throw new Error(`BOM not found for finished good ID: ${orderItem.productId}`);
//             }

//             const usedProductDetails = [];

//             for (const bomItem of bom.items) {
//                 const inventoryItem = await Inventory.findOne({
//                     companyId,
//                     shopId,
//                     productId: bomItem.productId
//                 });

//                 if (!inventoryItem) {
//                     throw new Error(`Inventory not found for product ID: ${bomItem.productId}`);
//                 }

//                 const usedProductDetail = {
//                     productId: bomItem.productId,
//                     quantity: bomItem.qty * orderItem.quantity,
//                     currentWAC: inventoryItem.weightedAverageCost
//                 };

//                 usedProductDetails.push(usedProductDetail);

//                 // Reduce inventory stock
//                 inventoryItem.totalQuantity -= usedProductDetail.quantity;

//                 if (inventoryItem.totalQuantity < 0) {
//                     throw new Error(`Insufficient inventory for product ID: ${bomItem.productId}`);
//                 }
//                 io.emit("updateInventory", inventoryItem);
//                 await inventoryItem.save();
//             }

//             const finishedGoodTransaction = new FinishedGoodTransaction({
//                 ftId: "FTID-1", // This will be auto-generated by pre-save hook
//                 companyId,
//                 shopId,
//                 finishedgoodId: orderItem.productId, // The finished good ID
//                 usedProductDetails,
//                 transactionDateTime: new Date(),
//                 transactionType: "Sales",
//                 OrderNo: order.invoiceID,
//                 transactionCode,
//                 sellingType: order.sellingType,
//                 sellingPrice: orderItem.sellingPrice,
//                 discountAmount: orderItem.discountAmount,
//                 customerId: order.customerId,
//                 transactionInOut: "Out",
//                 finishedgoodQty: orderItem.quantity, // Quantity of finished good
//                 transactionStatus: "Completed",
//                 createdBy: userId
//             });

//             await finishedGoodTransaction.save();
//         }

//         // Call updateDailyBalance logic
//         const dailyBalanceReq = {
//             body: {
//                 companyId,
//                 shopId,
//                 createdBy: userId,
//                 closeAmount: order.billTotal, // Adjust this depending on how you calculate closeAmount
//                 remarks: `Order processed with transaction code: ${transactionCode}`
//             }
//         };
//         await updateDailyBalance(dailyBalanceReq, res, next);

//         res.status(201).json({ message: "Order and transactions created successfully", transactionCode });
//     } catch (error) {
//         console.error("Error creating order:", error);
//         next(error);
//     }
// };

// Cancel an order (Reverse the transactions)
// export const cancelOrder = async (req, res, next) => {
//     try {
//         const { companyId, shopId, userId } = req;
//         const { transactionCode } = req.params;

//         // Find the payment transaction
//         const paymentTransaction = await PaymentTransaction.findOne({ transactionCode });

//         if (!paymentTransaction) {
//             return res.status(404).json({ message: "Payment transaction not found." });
//         }

//         // Find all related finished good transactions
//         const finishedGoodTransactions = await FinishedGoodTransaction.find({ transactionCode });

//         if (!finishedGoodTransactions.length) {
//             return res.status(404).json({ message: "Finished good transactions not found." });
//         }

//         // Revert inventory stock
//         for (const transaction of finishedGoodTransactions) {
//             for (const usedProductDetail of transaction.usedProductDetails) {
//                 const inventoryItem = await Inventory.findOne({
//                     companyId,
//                     shopId,
//                     productId: usedProductDetail.productId
//                 });

//                 if (!inventoryItem) {
//                     throw new Error(`Inventory not found for product ID: ${usedProductDetail.productId}`);
//                 }

//                 inventoryItem.totalQuantity += usedProductDetail.quantity;

//                 // Ensure WAC and other fields are reverted properly
//                 io.emit("updateInventory", inventoryItem);
//                 await inventoryItem.save();
//             }
//         }

//         // Update status of payment transaction
//         paymentTransaction.transactionStatus = "Cancelled";
//         io.emit("cancelOrder", paymentTransaction);
//         await paymentTransaction.save();

//         // Update status of finished good transactions
//         for (const transaction of finishedGoodTransactions) {
//             transaction.transactionStatus = "Cancelled";
//             await transaction.save();
//         }

//         io.emit("cancelFinishedGoodTransactions", finishedGoodTransactions);

//         // Log the cancellation
//         createLog(companyId, shopId, userId, `Order cancelled with transaction code: ${transactionCode}`);

//         res.status(200).json({ message: "Order and transactions cancelled successfully", transactionCode });
//     } catch (error) {
//         console.error("Error cancelling order:", error);
//         next(error);
//     }
// };

// //////////////////////////////// - Product Return Item vise - /////////////////////////////////////////////
// // Reurn specific items in an order (Partial return)
// // According to item condition, the inventory will be updated and wastage will be created
// export const orderReturn = async (req, res, next) => {
//     try {
//         const { companyId, shopId, userId } = req;
//         const { transactionCode, itemsToReturn } = req.body; // itemsToReturn is an array of objects containing { productId, quantity, condition }

//         // Find the payment transaction
//         const paymentTransaction = await PaymentTransaction.findOne({ transactionCode });

//         if (!paymentTransaction) {
//             return res.status(404).json({ message: "Payment transaction not found." });
//         }
//         // Find all related finished good transactions
//         const finishedGoodTransactions = await FinishedGoodTransaction.find({ transactionCode });

//         if (!finishedGoodTransactions.length) {
//             return res.status(404).json({ message: "Finished good transactions not found." });
//         }

//         // Process each item specified for return
//         for (const returnItem of itemsToReturn) {
//             const { productId, quantity, condition } = returnItem;

//             // Find the corresponding finished good transaction for the product
//             const transaction = finishedGoodTransactions.find(trans =>
//                 trans.finishedgoodId === productId && trans.transactionStatus === "Completed");

//             if (!transaction) {
//                 return res.status(404).json({ message: `Transaction not found for product ID: ${productId}` });
//             }

//             // Ensure the quantity to return does not exceed the original transaction quantity
//             if (quantity > transaction.finishedgoodQty) {
//                 return res.status(400).json({ message: `Return quantity exceeds original quantity for product ID: ${productId}` });
//             }

//             // Check the condition of the product (Good, Damaged, Expired)
//             if (condition === "Good") {
//                 // Increase inventory using BOM
//                 const bom = await BOM.findOne({ finishedGoodId: productId });

//                 if (!bom) {
//                     throw new Error(`BOM not found for finished good ID: ${productId}`);
//                 }

//                 for (const bomItem of bom.items) {
//                     const inventoryItem = await Inventory.findOne({
//                         companyId,
//                         shopId,
//                         productId: bomItem.productId
//                     });

//                     if (!inventoryItem) {
//                         throw new Error(`Inventory not found for product ID: ${bomItem.productId}`);
//                     }

//                     inventoryItem.totalQuantity += bomItem.qty * quantity; // Adjust by the returned quantity
//                     io.emit("updateInventory", inventoryItem);
//                     await inventoryItem.save();
//                 }
//             } else if (condition === "Damaged" || condition === "Expired") {
//                 // Create a wastage entry
//                 const wastage = new Wastage({
//                     wastageId: 'wastageId-1',
//                     productId,
//                     quantity,
//                     uomId: "Unit", // Assuming uomId is known or can be derived
//                     reason: "Returned Order",
//                     condition,
//                     companyId,
//                     shopId,
//                     date: new Date(),
//                     userId
//                 });

//                 await wastage.save();
//             }

//             // Adjust the finished good transaction for partial return
//             transaction.finishedgoodQty -= quantity;
//             if (transaction.finishedgoodQty === 0) {
//                 transaction.transactionStatus = "Returned";
//             } else {
//                 transaction.transactionStatus = "Partially Returned";
//             }

//             await transaction.save();
//         }

//         // Optionally, update the payment transaction status based on overall return status
//         const allReturned = finishedGoodTransactions.every(trans => trans.transactionStatus === 'Returned' || trans.transactionStatus === 'Partially Returned');
//         paymentTransaction.transactionStatus = allReturned ? "Returned" : "Partially Returned";
//         io.emit("orderReturned", paymentTransaction);
//         await paymentTransaction.save();

//         // Log the return action
//         createLog(companyId, shopId, userId, `Order partially returned with transaction code: ${transactionCode}`);

//         res.status(200).json({ message: "Specified items returned successfully", transactionCode });
//     } catch (error) {
//         console.error("Error returning order:", error);
//         next(error);
//     }
// };
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////// - Order Data Retrivals - /////////////////////////////////////////////
// Get all orders
export const getAllOrders = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const orders = await PaymentTransaction.find({ companyId, shopId });
        res.status(200).json(orders);
    }
    catch (error) {
        console.error("Error getting orders:", error);
        next(error);
    }
}



// Get an order by transaction code
export const getOrder = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { transactionCode } = req.params;

        // Find the payment transaction based on companyId, shopId, and transactionCode
        const order = await PaymentTransaction.findOne({ companyId, shopId, transactionCode });
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        // Find all finished good transactions by transactionCode
        const finishedGoodTransactions = await FinishedGoodTransaction.find({ companyId, shopId, transactionCode });

        if (!finishedGoodTransactions.length) {
            return res.status(404).json({ message: "Finished good transactions not found." });
        }

        // Extract relevant data from all finished good transactions
        const finishedGoods = finishedGoodTransactions.map((transaction) => ({
            finishedgoodId: transaction.finishedgoodId,
            usedProductDetails: transaction.usedProductDetails,
            finishedgoodQty: transaction.finishedgoodQty,
            sellingPrice: transaction.sellingPrice,
            discountAmount: transaction.discountAmount,
        }));

        // Combine the payment transaction and finished goods details
        const orderDetails = {
            ...order._doc, // Spread the payment transaction data
            finishedGoods, // Add finished goods list
        };

        // Send the combined order details as response
        return res.status(200).json(orderDetails);
    } catch (error) {
        console.error("Error getting order:", error);
        next(error);
    }
};



// Get Sales details
export const getSales = async (req, res, next) => {
    try {
        const { companyId, shopId } = req;
        const { startDate, endDate } = req.params;

        // Build the query based on the provided parameters
        const query = {
            companyId,
            shopId,
            transactionDateTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            transactionType: "Sales",
            transactionStatus: "Completed"
        };

        let totalSales = 0;
        let totalProductCost = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let totalDiscounts = 0;
        const salesDetails = {};

        // Fetch finished good transactions within the date range
        const transactions = await FinishedGoodTransaction.find(query);

        if (!transactions.length) {
            return res.status(404).json({ message: "No sales transactions found." });
        }

        for (const transaction of transactions) {
            const { usedProductDetails, finishedgoodId, sellingPrice, finishedgoodQty, discountAmount } = transaction;

            const sale = sellingPrice * finishedgoodQty;
            let cost = 0;
            const unitPrice = transaction.sellingPrice;

            // Calculate the total cost from used product details
            for (const usedProduct of usedProductDetails) {
                cost += usedProduct.currentWAC * usedProduct.quantity;
            }

            const discount = discountAmount || 0;
            const profit = sale - cost - discount;

            // console.log('Used product details:', usedProductDetails);
            // console.log('Current WAC:', usedProductDetails.map(upd => upd.currentWAC));
            // console.log('Quantity:', usedProductDetails.map(upd => upd.quantity));
            // console.log('Selling Price:', sellingPrice);
            // console.log('Finished good qty:', finishedgoodQty);

            // console.log(`Sale: ${sale}, Cost: ${cost}, Discount: ${discount}, Profit: ${profit}`);

            totalSales += sale;
            totalProductCost += cost;
            totalCost += cost + discount;
            totalProfit += profit;
            totalDiscounts += discount;

            if (!salesDetails[finishedgoodId]) {
                salesDetails[finishedgoodId] = {
                    finishedGoodId: finishedgoodId,
                    finishedgoodQty: 0,
                    sale: 0,
                    cost: 0,
                    profit: 0,
                    unitPrice
                };
            }

            salesDetails[finishedgoodId].finishedgoodQty += finishedgoodQty;
            salesDetails[finishedgoodId].sale += sale;
            salesDetails[finishedgoodId].cost += cost;
            salesDetails[finishedgoodId].profit += profit;
        }

        res.status(200).json({
            message: "Sales details retrieved successfully",
            totalSales,
            totalProductCost,
            totalCost,
            totalProfit,
            totalDiscounts,
            salesDetails: Object.values(salesDetails)
        });
    } catch (error) {
        console.error("Error fetching sales data:", error);
        next(error);
    }
};
