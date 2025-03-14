import Inventory_Stock from '../models/inventory.stock.model.js';
import { createLog } from '../utils/logger.util.js';
import { io } from '../server.js'; // For real-time updates with socket.io

// Get all inventories 
export const getAllInventories = async (req, res, next) => {
    try {
        const inventories = await Inventory_Stock.find();
        res.status(200).json(inventories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get an inventory details by inventoryID
export const getInventoryById = async (req, res, next) => {
    try {
        // Find the customer by inventoryID
        const inventory = await Inventory_Stock.findOne({ inventoryId: req.params.inventoryId });
        if (!inventory) {
            return res.status(404).json({ message: 'Inventory not found' });
        }
        res.status(200).json(inventory);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// Get inventories by companyId
export const getInventoriesByCompanyId = async (req, res, next) => {
    const companyId = req.companyId;
    try {
        // Find the inventories by companyId
        const inventories = await Inventory_Stock.find({ companyId });
        if (!inventories) {
            return res.status(404).json({ message: 'No inventories found for the specified companyId' });
        }
        res.status(200).json(inventories);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// Get inventories by companyId and ShopId
export const getInventoriesByCompanyIdAndShopId = async (req, res, next) => {
    const companyId = req.companyId;
    const shopId = req.shopId;
    try {
        // Find the inventories by companyId and shopId
        const inventories = await Inventory_Stock.find({ companyId, shopId });
        if (!inventories) {
            return res.status(404).json({ message: 'No inventories found for the specified companyId and shopId' });
        }
        res.status(200).json(inventories);
    } catch (error) {
        console.error(error);
        next(error);
    }
};