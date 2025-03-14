import RawMaterialTransaction from '../models/raw_material_transaction.model.js';
import RawMaterialTransactionHeader from '../models/raw_material_transaction_header.model.js';
import InventoryStock from '../models/inventory.stock.model.js';
import Product from '../models/product.model.js';
import { generateNewCodeNumber } from '../utils/code.generator.util.js';
import { createLog } from '../utils/logger.util.js';
import Company from '../models/company.model.js';
import Shop from '../models/shop.model.js';
import Supplier from '../models/supplier.model.js';
import mongoose from 'mongoose';
import { io } from '../server.js';

// Create a new GRN (Goods Receipt Note)
export const createGRN = async (req, res, next) => {
  const { companyId, shopId, supplierId, transactionDateTime, createdBy, transactions } = req.body;

  try {
    // Validate roles
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
      return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to create GRNs." });
    }

    // Validate that all products in the transactions require GRN
    for (const item of transactions) {
      const { productId } = item;
      const product = await Product.findOne({ productId });

      if (!product) {
        return res.status(404).json({ message: `Product with ID ${productId} not found` });
      }

      // Skip validation if the product is of type 'raw' as those always need GRN
      if (!product.productType.toLowerCase().includes('raw') && !product.requiresGRN) {
        return res.status(400).json({
          message: `Product ${product.name} (${productId}) does not require GRN tracking. Please update the product settings first.`
        });
      }
    }

    // Generate transaction code
    const description = 'GRN';
    const transactionCode = (await generateNewCodeNumber(companyId, shopId, createdBy, description)).code_number;

    // Calculate total cost
    const totalCost = transactions.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);

    // Create a new Raw Material Transaction Header
    const newRMTH = new RawMaterialTransactionHeader({
      rmthId: 'RMTHID-1', // This will be updated by the pre-save hook
      transactionCode,
      companyId,
      shopId,
      supplierId,
      transactionDateTime,
      transactionType: description,
      rawMatInOut: 'In',
      transactionStatus: 'Pending',
      totalCost,
      outStandingAmount: totalCost,
      createdBy,
    });

    io.emit('newGRN', newRMTH);
    const savedRMTH = await newRMTH.save();

    // Process each transaction
    for (const item of transactions) {
      const { categoryId, productId, unitCost, quantity, remarks } = item;
      const totalCost = unitCost * quantity;

      // Create a new Raw Material Transaction
      const newRMT = new RawMaterialTransaction({
        rmtId: 'RMTID-1', // This will be updated by the pre-save hook
        companyId,
        shopId,
        supplierId,
        categoryId,
        productId,
        finishedgoodId: productId,
        transactionDateTime,
        transactionType: description,
        transactionCode,
        rawMatInOut: 'In',
        unitCost,
        quantity,
        totalCost,
        remarks,
        createdBy,
        transactionStatus: 'Pending',
      });

      io.emit('newGRNTransaction', newRMT);
      await newRMT.save();

      // Update Inventory
      const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId });
      if (inventory) {
        // Calculate new weighted average cost
        const previousQuantity = inventory.totalQuantity;
        const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
        const newTotalQuantity = previousQuantity + quantity;
        const newWeightedAverageCost = ((previousQuantity * previousWeightedAverageCost) + (quantity * unitCost)) / newTotalQuantity;

        // Update inventory record
        inventory.totalQuantity = newTotalQuantity;
        inventory.lastPurchaseCost = unitCost.toFixed(2);
        inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);

        // Update supplier list if necessary
        if (!inventory.supplierId.includes(supplierId)) {
          inventory.supplierId.push(supplierId);
        }
        io.emit('updateInventory', inventory);
        await inventory.save();
      } else {
        // Create new inventory entry
        const newInventory = new InventoryStock({
          inventoryId: 'InventoryID-1', // This will be updated by the pre-save hook
          categoryId,
          productId,
          companyId,
          shopId,
          supplierId: [supplierId],
          lastPurchaseCost: unitCost,
          totalQuantity: quantity,
          weightedAverageCost: unitCost,
          minimumQuantity: 100,
          toggle: 'enabled',
          createdBy,
        });
        io.emit('newInventory', newInventory);
        await newInventory.save();
      }
    }

    // Create a log entry
    createLog(companyId, shopId, createdBy, `GRN Created: ${transactionCode}`);
    res.status(201).send({ message: "GRN created successfully", transactionCode, rawMaterialTransactionHeader: savedRMTH });
  } catch (err) {
    next(err);
  }
};

// Cancel a GRN (Reverse the changes) with transaction rollback
export const cancelGRN = async (req, res, next) => {
  const { transactionCode, companyId, shopId } = req.params;
  const { userId, role } = req;

  if (role !== 'superAdmin' && role !== 'admin' && req.role !== 'stockManager') {
    return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to cancel GRNs." });
  }

  // Start a session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rmth = await RawMaterialTransactionHeader.findOne({ transactionCode, companyId, shopId }).session(session);
    if (!rmth) {
      return res.status(404).json({ message: "GRN not found." });
    }

    rmth.transactionStatus = 'Cancelled';
    await rmth.save({ session });
    io.emit('cancelGRN', rmth);

    const transactions = await RawMaterialTransaction.find({ transactionCode, companyId, shopId }).session(session);
    await Promise.all(transactions.map(async (transaction) => {
      transaction.transactionStatus = 'Cancelled';
      transaction.rawMatInOut = 'Out';
      await transaction.save({ session });
      io.emit('cancelGRNTransaction', transaction);

      const { categoryId, productId, shopId, quantity, unitCost } = transaction;
      const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId }).session(session);

      if (inventory) {
        const previousQuantity = inventory.totalQuantity;
        const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
        let newTotalQuantity = previousQuantity - quantity;
        if (newTotalQuantity < 0) {
          throw new Error(`Cannot cancel GRN: Inventory for product ${productId} would go negative.`);
        }

        let newWeightedAverageCost;
        if (newTotalQuantity === 0) {
          newWeightedAverageCost = previousWeightedAverageCost;
        } else {
          newWeightedAverageCost = (previousQuantity * previousWeightedAverageCost - quantity * unitCost) / newTotalQuantity;
        }

        inventory.totalQuantity = newTotalQuantity;
        inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);

        await inventory.save({ session });
        io.emit('updateInventory', inventory);
      }
    }));

    createLog(companyId, shopId, userId, `GRN Canceled: ${transactionCode}`);
    await session.commitTransaction();
    session.endSession();

    res.status(200).send({ message: "GRN canceled successfully", transactionCode });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error canceling GRN:', err);
    next(err);
  }
};


// // Create a new GRN (Goods Receipt Note)
// export const createGRN = async (req, res, next) => {
//   const { companyId, shopId, supplierId, transactionDateTime, createdBy, transactions } = req.body;

//   try {
//       // Validate roles
//       if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
//           return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to create GRNs." });
//       }
//       // Generate transaction code
//       const description = 'GRN';
//       const transactionCode = (await generateNewCodeNumber(companyId, shopId, createdBy, description)).code_number;
//       // Calculate total cost
//       const totalCost = transactions.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
//       // Create a new Raw Material Transaction Header
//       const newRMTH = new RawMaterialTransactionHeader({
//           rmthId: 'RMTHID-1', // This will be updated by the pre-save hook
//           transactionCode,
//           companyId,
//           shopId,
//           supplierId,
//           transactionDateTime,
//           transactionType: description,
//           rawMatInOut: 'In',
//           transactionStatus: 'Pending',
//           totalCost,
//           outStandingAmount: totalCost,
//           createdBy,
//       });
//       io.emit('newGRN', newRMTH);
//       const savedRMTH = await newRMTH.save();
//       // Process each transaction
//       for (const item of transactions) {
//           const { categoryId, productId, unitCost, quantity, remarks } = item;
//           const totalCost = unitCost * quantity;
//           // Create a new Raw Material Transaction
//           const newRMT = new RawMaterialTransaction({
//               rmtId: 'RMTID-1', // This will be updated by the pre-save hook
//               companyId,
//               shopId,
//               supplierId,
//               categoryId,
//               productId,
//               finishedgoodId: productId,
//               transactionDateTime,
//               transactionType: description,
//               transactionCode,
//               rawMatInOut: 'In',
//               unitCost,
//               quantity,
//               totalCost,
//               remarks,
//               createdBy,
//               transactionStatus: 'Pending',
//           });
//           io.emit('newGRNTransaction', newRMT);
//           await newRMT.save();
//           // Update Inventory
//           const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId });
//           if (inventory) {  
//             // Calculate new weighted average cost
//             const previousQuantity = inventory.totalQuantity;
//             const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
//             const newTotalQuantity = previousQuantity + quantity;
//             const newWeightedAverageCost = ((previousQuantity * previousWeightedAverageCost) + (quantity * unitCost)) / newTotalQuantity;

//             // Update inventory record
//             inventory.totalQuantity = newTotalQuantity;
//             inventory.lastPurchaseCost = unitCost.toFixed(2);
//             inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);

//             // Update supplier list if necessary
//             if (!inventory.supplierId.includes(supplierId)) {
//               inventory.supplierId.push(supplierId);
//             }
//               io.emit('updateInventory', inventory);
//               await inventory.save();
//           } else {
//               // Create new inventory entry
//               const newInventory = new InventoryStock({
//                   inventoryId: 'InventoryID-1', // This will be updated by the pre-save hook
//                   categoryId,
//                   productId,
//                   companyId,
//                   shopId,
//                   supplierId: [supplierId],
//                   lastPurchaseCost: unitCost,
//                   totalQuantity: quantity,
//                   weightedAverageCost: unitCost,
//                   minimumQuantity: 100,
//                   toggle: 'enabled',
//                   createdBy,
//               });
//               io.emit('newInventory', newInventory);
//               await newInventory.save();
//           }
//       }
//       // Create a log entry
//       createLog(companyId, shopId, createdBy, `GRN Created: ${transactionCode}`);
//       res.status(201).send({ message: "GRN created successfully", transactionCode, rawMaterialTransactionHeader: savedRMTH });
//   } catch (err) {
//       next(err);
//   }
// };

// // Cancel a GRN (Reverse the changes) with transaction rollback
// export const cancelGRN = async (req, res, next) => {
//   const { transactionCode, companyId, shopId } = req.params;
//   const { userId, role } = req;

//   if (role !== 'superAdmin' && role !== 'admin' && req.role !== 'stockManager') {
//       return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to cancel GRNs." });
//   }

//   // Start a session for transactions
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//       const rmth = await RawMaterialTransactionHeader.findOne({ transactionCode, companyId, shopId }).session(session);
//       if (!rmth) {
//           return res.status(404).json({ message: "GRN not found." });
//       }

//       rmth.transactionStatus = 'Cancelled';
//       await rmth.save({ session });
//       io.emit('cancelGRN', rmth);

//       const transactions = await RawMaterialTransaction.find({ transactionCode, companyId, shopId }).session(session);
//       await Promise.all(transactions.map(async (transaction) => {
//           transaction.transactionStatus = 'Cancelled';
//           transaction.rawMatInOut = 'Out';
//           await transaction.save({ session });
//           io.emit('cancelGRNTransaction', transaction);

//           const { categoryId, productId, shopId, quantity, unitCost } = transaction;
//           const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId }).session(session);

//           if (inventory) {
//               const previousQuantity = inventory.totalQuantity;
//               const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
//               let newTotalQuantity = previousQuantity - quantity;
//               //newTotalQuantity = Math.max(newTotalQuantity, 0); // Prevent negative quantity (If necessary but practicllay not needed)
//               const newWeightedAverageCost = (previousQuantity * previousWeightedAverageCost - quantity * unitCost) / newTotalQuantity;

//               inventory.totalQuantity = newTotalQuantity;
//               inventory.weightedAverageCost = newTotalQuantity === 0 
//                   ? previousWeightedAverageCost.toFixed(2) 
//                   : newWeightedAverageCost.toFixed(2);

//               await inventory.save({ session });
//               io.emit('updateInventory', inventory);
//           }
//       }));

//       createLog(companyId, shopId, userId, `GRN Canceled: ${transactionCode}`);
//       await session.commitTransaction();
//       session.endSession();

//       res.status(200).send({ message: "GRN canceled successfully", transactionCode });
//   } catch (err) {
//       await session.abortTransaction();
//       session.endSession();
//       console.error('Error canceling GRN:', err);
//       next(err);
//   }
// };
//////////// - GRN Cancel without transaction rollback - //////////////////////
/*
// Cancel a GRN (Reverse the changes)
export const cancelGRN = async (req, res, next) => {
  const { transactionCode, companyId, shopId } = req.params;
  const { userId } = req;
  const createdBy = userId;
  try {
      // Validate roles
      if (req.role !== 'superAdmin' && req.role !== 'admin') {
          return res.status(403).json({ message: "Only Super Admins and admins are allowed to cancel GRNs." });
      }

      // Find the raw material transaction header
      const rmth = await RawMaterialTransactionHeader.findOne({ transactionCode, companyId, shopId });
      if (!rmth) {
          return res.status(404).json({ message: "GRN not found." });
      }

      // Mark the transaction header as canceled (or remove if you prefer)
      rmth.transactionStatus = 'Cancelled';
      io.emit('cancelGRN', rmth);
      await rmth.save();

      // Find and process each related transaction
      const transactions = await RawMaterialTransaction.find({ transactionCode, companyId, shopId });
      for (const transaction of transactions) {
          // Mark the transaction as canceled (or remove if you prefer)
          transaction.transactionStatus = 'Cancelled';
          transaction.rawMatInOut = 'Out';
          io.emit('cancelGRNTransaction', transaction);
          await transaction.save();

          // Reverse inventory update
          const { categoryId, productId, shopId, quantity, unitCost } = transaction;
          const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId });
          if (inventory) {
              // Calculate new weighted average cost
              // Existing Quantity of the product in the inventory
              const previousQuantity = inventory.totalQuantity;
              const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
              // New Quantity of the product in the inventory after return
              const newTotalQuantity = previousQuantity - quantity;
              if (newTotalQuantity < 0) {
                  newTotalQuantity = 0;
              }
              const newWeightedAverageCost = (previousQuantity * previousWeightedAverageCost - quantity * unitCost) / newTotalQuantity;
              // Update inventory record totalQuantity and weightedAverageCost
              inventory.totalQuantity = newTotalQuantity;
              if(newTotalQuantity === 0) {
                inventory.weightedAverageCost = previousWeightedAverageCost.toFixed(2);
              } else {
              inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);
              }
              io.emit('updateInventory', inventory);
              await inventory.save();
          }
      }

      // Create a log entry
      createLog(companyId, shopId, createdBy, `GRN Canceled: ${transactionCode}`);
      res.status(200).send({ message: "GRN canceled successfully", transactionCode });
  } catch (err) {
      next(err);
  }
};
*/
// Settle a GRN (Mark as completed)
export const settleGRN = async (req, res, next) => {
  const { transactionCode, companyId, shopId } = req.params;
  const { userId } = req;
  const createdBy = userId;
  try {
    // Validate roles
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
      return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to settle GRNs." });
    }

    // Find the raw material transaction header
    const rmth = await RawMaterialTransactionHeader.findOne({ transactionCode, companyId, shopId });
    if (!rmth) {
      return res.status(404).json({ message: "GRN not found." });
    }

    // Mark the transaction header as completed
    rmth.transactionStatus = 'Completed';
    io.emit('settleGRN', rmth);
    await rmth.save();

    // Find and process each related transaction
    const transactions = await RawMaterialTransaction.find({ transactionCode, companyId, shopId });
    for (const transaction of transactions) {
      // Mark the transaction as completed
      transaction.transactionStatus = 'Completed';
      io.emit('settleGRNTransaction', transaction);
      await transaction.save();
    }

    // Create a log entry
    createLog(companyId, shopId, createdBy, `GRN Settled: ${transactionCode}`);
    res.status(200).send({ message: "GRN settled successfully", transactionCode });
  } catch (err) {
    next(err);
  }
};
//////////////// - GRN Update - ///////////////////////
// Update a GRN
// Update an existing GRN (Goods Receipt Note)
export const updateGRN = async (req, res, next) => {
  const { transactionCode, companyId, shopId } = req.params;
  const { supplierId, transactionDateTime, transactions } = req.body;
  const createdBy = req.userId;
  try {
    // Validate roles
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
      return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to update GRNs." });
    }

    // Find the existing GRN Header
    const existingRMTH = await RawMaterialTransactionHeader.findOne({ transactionCode, companyId, shopId });
    if (!existingRMTH) {
      return res.status(404).json({ message: "GRN not found." });
    }

    // Calculate new total cost
    const totalCost = transactions.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);

    // Update the GRN Header
    existingRMTH.supplierId = supplierId;
    existingRMTH.transactionDateTime = transactionDateTime;
    existingRMTH.totalCost = totalCost;
    existingRMTH.outStandingAmount = totalCost;
    existingRMTH.createdBy = createdBy;
    io.emit('updateGRN', existingRMTH);
    await existingRMTH.save();

    // Reverse previous transactions
    const previousTransactions = await RawMaterialTransaction.find({ transactionCode, companyId, shopId });
    for (const prevTrans of previousTransactions) {
      // Reverse inventory changes for previous transactions
      const inventory = await InventoryStock.findOne({ categoryId: prevTrans.categoryId, productId: prevTrans.productId, shopId, companyId });
      if (inventory) {
        const previousQuantity = inventory.totalQuantity;
        inventory.totalQuantity = previousQuantity - prevTrans.quantity;
        //if (inventory.totalQuantity < 0) inventory.totalQuantity = 0; // Avoid negative quantity

        // Recalculate weighted average cost
        if (inventory.totalQuantity === 0) {
          inventory.weightedAverageCost = 0;
        } else {
          const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
          const newWeightedAverageCost = (previousWeightedAverageCost * previousQuantity - prevTrans.quantity * prevTrans.unitCost) / inventory.totalQuantity;
          inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);
        }
        io.emit('reverseInventoryUpdate', inventory);
        await inventory.save();
      }
      await prevTrans.deleteOne(); // Remove the previous transaction
    }

    // Process and save new transactions
    for (const item of transactions) {
      const { categoryId, productId, unitCost, quantity, remarks } = item;
      const totalCost = unitCost * quantity;

      // Create a new Raw Material Transaction
      const newRMT = new RawMaterialTransaction({
        rmtId: 'RMTID-1', // This will be updated by the pre-save hook
        companyId,
        shopId,
        supplierId,
        categoryId,
        productId,
        finishedgoodId: productId,
        transactionDateTime,
        transactionType: 'GRN',
        transactionCode,
        rawMatInOut: 'In',
        unitCost,
        quantity,
        totalCost,
        remarks,
        createdBy,
        transactionStatus: 'Updated',
      });
      io.emit('updateGRNTransaction', newRMT);
      await newRMT.save();

      // Update Inventory
      const inventory = await InventoryStock.findOne({ categoryId, productId, shopId, companyId });
      if (inventory) {
        const previousQuantity = inventory.totalQuantity;
        const previousWeightedAverageCost = parseFloat(inventory.weightedAverageCost);
        const newTotalQuantity = previousQuantity + quantity;
        const newWeightedAverageCost = ((previousQuantity * previousWeightedAverageCost) + (quantity * unitCost)) / newTotalQuantity;

        inventory.totalQuantity = newTotalQuantity;
        inventory.lastPurchaseCost = unitCost.toFixed(2);
        inventory.weightedAverageCost = newWeightedAverageCost.toFixed(2);

        if (!inventory.supplierId.includes(supplierId)) {
          inventory.supplierId.push(supplierId);
        }
        io.emit('updateInventory', inventory);
        await inventory.save();
      } else {
        const newInventory = new InventoryStock({
          inventoryId: 'InventoryID-1',
          categoryId,
          productId,
          companyId,
          shopId,
          supplierId: [supplierId],
          lastPurchaseCost: unitCost,
          totalQuantity: quantity,
          weightedAverageCost: unitCost,
          minimumQuantity: 100,
          toggle: 'enabled',
          createdBy,
        });
        io.emit('newInventory', newInventory);
        await newInventory.save();
      }
    }

    // Create a log entry
    createLog(companyId, shopId, createdBy, `GRN Updated: ${transactionCode}`);

    res.status(200).send({ message: "GRN updated successfully", transactionCode, rawMaterialTransactionHeader: existingRMTH });
  } catch (err) {
    next(err);
  }
};

////////////////// - Retrieve all GRN Records - //////////////////////////
// Retrieve all GRN records
export const getAllGRNs = async (req, res, next) => {
  try {
    const grns = await RawMaterialTransactionHeader.find({ transactionType: 'GRN' });
    io.emit('getAllGRNs', grns);
    res.status(200).json({ grns });
  } catch (error) {
    next(error);
  }
};

// Get All GRN Records for a specific company
export const getGRNsByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const grns = await RawMaterialTransactionHeader.find({ companyId, transactionType: 'GRN' });
    io.emit('getGRNsByCompany', grns);
    res.status(200).json({ grns });
  } catch (error) {
    next(error);
  }
};

// Retrieve all GRN records with all transactions for a specific transaction code
export const getGRNWithTransactions = async (req, res, next) => {
  try {
    const { companyId, shopId, transactionCode } = req.params;

    const grnHeader = await RawMaterialTransactionHeader.findOne({ transactionCode, shopId, companyId });
    if (!grnHeader) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    const grnTransactions = await RawMaterialTransaction.find({ transactionCode, shopId, companyId });
    io.emit('getGRNWithTransactions', grnHeader, grnTransactions);
    res.status(200).json({ grnHeader, grnTransactions });
  } catch (error) {
    next(error);
  }
};

// Retrieve all GRN records with all transactions for a specific supplier
export const getGRNsBySupplier = async (req, res, next) => {
  try {
    const { companyId, shopId, supplierId } = req.params;

    const grnHeader = await RawMaterialTransactionHeader.find({ companyId, shopId, supplierId });
    if (!grnHeader) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    res.status(200).json({ grnHeader });
    io.emit('getGRNsBySupplier', grnHeader);
  } catch (error) {
    next(error);
  }
};

// Retrieve all GRN records for a specific company/shop
export const getGRNsByShop = async (req, res, next) => {
  try {
    const { companyId, shopId } = req.params;

    const grnHeader = await RawMaterialTransactionHeader.find({ companyId, shopId });
    if (!grnHeader) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    res.status(200).json({ grnHeader });
    io.emit('getGRNsByShop', grnHeader);
  } catch (error) {
    next(error);
  }
};

// Retrieve all GRN records with all transactions and supplier, company, shop details using a specific transaction code
export const getGRNWithTransactionsAndDetails = async (req, res, next) => {
  try {
    const { companyId, shopId, transactionCode } = req.params;

    const grnHeader = await RawMaterialTransactionHeader.findOne({ transactionCode, shopId, companyId });
    if (!grnHeader) {
      return res.status(404).json({ message: 'GRN not found' });
    }
    const supplierId = grnHeader.supplierId;
    //const companyId = grnHeader.companyId;
    //const shopId = grnHeader.shopId;

    const CompanyDetails = await Company.findOne({ companyId });
    const ShopDetails = await Shop.findOne({ companyId, shopId });
    const SupplierDetails = await Supplier.findOne({ supplierId });
    const grnTransactions = await RawMaterialTransaction.find({ transactionCode, shopId, companyId });

    res.status(200).json({ grnHeader, grnTransactions, CompanyDetails, ShopDetails, SupplierDetails });
    io.emit('getGRNWithTransactionsAndDetails', grnHeader, grnTransactions, CompanyDetails, ShopDetails, SupplierDetails);
  } catch (error) {
    next(error);
  }
};

////////////////////////////////// - Future implementations if necessary. - ///////////////////////////////////////
/*
// Retrieve all GRN records with pagination
export const getGRNsWithPagination = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    };

    const grns = await RawMaterialTransactionHeader.paginate({ transactionType: 'GRN' }, options);

    res.status(200).json({ grns });
  } catch (error) {
    next(error);
  }
};
// Retrieve all GRN records with filters
export const getFilteredGRNs = async (req, res, next) => {
  try {
    const { startDate, endDate, shopId, supplierId } = req.query;

    const grns = await RawMaterialTransactionHeader.find({
      transactionType: 'GRN',
      shopId,
      supplierId,
      transactionDateTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    res.status(200).json({ grns });
  } catch (error) {
    next(error);
  }
};
*/