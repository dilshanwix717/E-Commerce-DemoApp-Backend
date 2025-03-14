// Description: Controller for Selling Types.
// Methods: createSellingType, getSellingTypes, getSellingTypeById, updateSellingType, deleteSellingType
// Created by: S.A.N.M.Wijethunga
// Role: CeylonX Backend Developer(Intern)
// ContactEmail: sanmwijethunga.support@gmail.com
// Created on: 2024 July 12
// Last edited on: 2024 July 12

import SellingType from '../models/sellingtype.model.js';
import { createLog } from '../utils/logger.util.js';

// Validate additionDeduction: should match patterns like +100, -100, +10%, -10%
function validateAdditionDeduction(additionDeduction) {
    const regex = /^(\+|-)\d+(\.\d+)?%?$/;
    return regex.test(additionDeduction);
}

// Create and save a new Selling Type
export const createSellingType = async (req, res, next) => {
    const { role, body, userId } = req;
    const { companyId, shopId, sellingType, sellingTypeAmount, additionDeduction, ServiceDelivery } = body;

    if (role !== 'superAdmin' && role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to create SellingType." });
    }

    if (!companyId || !shopId || !sellingType || !sellingTypeAmount || !additionDeduction || !userId || !ServiceDelivery) {
        return res.status(400).json({ message: "Required fields are missing." });
    }

    if (!validateAdditionDeduction(additionDeduction)) {
        return res.status(400).json({ message: "Invalid additionDeduction format." });
    }

    try {
        await checkExistingSellingType(companyId, shopId, sellingType);

        const newSellingType = new SellingType({
            sellingTypeId: "STID-1", // This will be auto-generated in the pre-save hook
            companyId,
            shopId,
            sellingType,
            sellingTypeAmount,
            additionDeduction,
            ServiceDelivery,
            toggle: "disable",
            createdBy: userId
        });

        const savedSellingType = await newSellingType.save();
        await createLog(companyId, shopId, userId, `Created SellingType entry with ID: ${savedSellingType.sellingTypeId}`);

        res.status(201).send(savedSellingType);
    } catch (error) {
        next(error);
    }
};

// Check for existing selling type in the same company and shop
async function checkExistingSellingType(companyId, shopId, sellingType) {
    try {
        const existingSellingType = await SellingType.findOne({ companyId, shopId, sellingType });
        if (existingSellingType) {
            throw new Error('Selling Type already exists in the same company and shop.');
        }
    } catch (error) {
        throw error;
    }
}

// Retrieve and return all Selling Types from the database
export const getSellingTypes = async (req, res, next) => {
    try {
        const sellingTypes = await SellingType.find({});
        res.status(200).json(sellingTypes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Find a single Selling Type by ID
export const getSellingTypeById = async (req, res, next) => {
    try {
        const sellingType = await SellingType.findOne({ sellingTypeId: req.params.sellingTypeId });
        if (!sellingType) {
            return res.status(404).json({ message: `Selling Type not found with ID: ${req.params.sellingTypeId}` });
        }
        res.status(200).json(sellingType);
    } catch (err) {
        res.status(500).json({ message: `Error retrieving Selling Type with ID: ${req.params.sellingTypeId}` });
    }
};

// Update a Selling Type by ID
export const updateSellingType = async (req, res, next) => {
    const { role, body, userId } = req;
    const { companyId, shopId, sellingType, sellingTypeAmount, additionDeduction, ServiceDelivery } = body;
    const updates = Object.keys(body);
    const allowedUpdates = ['companyId', 'shopId', 'sellingType', 'sellingTypeAmount', 'additionDeduction', 'ServiceDelivery', 'toggle'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    // Only Super Admins and Admins are allowed to update SellingType
    if (role !== 'superAdmin' && role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to update SellingType." });
    }
    // Required fields are missing, only the allowed updates are valid
    if (!isValidOperation) {
        return res.status(400).json({ message: 'Invalid updates!' });
    }
    // Validate additionDeduction: should match patterns like +100, -100, +10%, -10%
    if (additionDeduction && !validateAdditionDeduction(additionDeduction)) {
        return res.status(400).json({ message: "Invalid additionDeduction format." });
    }

    try {
        // Check for existing selling type in the same company and shop with different sellingTypeId
        const existingSellingType = await SellingType.findOne({ sellingTypeId: req.params.sellingTypeId });
        if (!existingSellingType) {
            return res.status(404).json({ message: `Selling Type not found with ID: ${req.params.sellingTypeId}` });
        }

        // Check for existing selling type in the same company and shop with different sellingTypeId
        if (companyId && shopId && sellingType) {
            const duplicateSellingType = await SellingType.findOne({
                companyId,
                shopId,
                sellingType,
                sellingTypeId: { $ne: req.params.sellingTypeId }
            });
            if (duplicateSellingType) {
                return res.status(400).json({ message: 'Selling Type already exists in the same company and shop.' });
            }
        }

        const updatedSellingType = await SellingType.findOneAndUpdate(
            { sellingTypeId: req.params.sellingTypeId },
            body,
            { new: true, runValidators: true }
        );

        await createLog(companyId, shopId, userId, `Updated SellingType entry with ID: ${updatedSellingType.sellingTypeId}`);
        res.status(200).json(updatedSellingType);
    } catch (err) {
        next(err);
    }
};

// Enable or Disable a Selling Type by ID
export const toggleSellingType = async (req, res, next) => {
    const { role, userId } = req;

    if (role !== 'superAdmin' && role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to enable or disable selling types." });
    }

    try {
        const sellingType = await SellingType.findOne({ sellingTypeId: req.params.sellingTypeId });
        if (!sellingType) {
            return res.status(404).json({ message: `Selling Type not found with ID: ${req.params.sellingTypeId}` });
        }
        sellingType.toggle = sellingType.toggle === 'enable' ? 'disable' : 'enable';
        await sellingType.save();
        await createLog(sellingType.companyId, sellingType.shopId, userId, `Toggled SellingType entry with ID: ${sellingType.sellingTypeId}`);
        res.status(200).json(sellingType);
    } catch (err) {
        next(err);
    }
};

// This may not available in the original work if the origin doesn't allow deleting Selling Types.
// Delete a Selling Type by ID
export const deleteSellingType = async (req, res, next) => {
    const { role, userId } = req;

    if (role !== 'superAdmin' && role !== 'admin') {
        return res.status(403).json({ message: "Only Super Admins and Admins are allowed to delete selling types." });
    }

    try {
        const sellingType = await SellingType.findOneAndDelete({ sellingTypeId: req.params.sellingTypeId });
        if (!sellingType) {
            return res.status(404).json({ message: `Selling Type not found with ID: ${req.params.sellingTypeId}` });
        }
        await createLog(sellingType.companyId, sellingType.shopId, userId, `Deleted SellingType entry with ID: ${sellingType.sellingTypeId}`);
        res.status(200).json({ message: 'Selling Type deleted successfully!' });
    } catch (err) {
        next(err);
    }
};