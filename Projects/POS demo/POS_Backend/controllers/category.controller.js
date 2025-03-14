/** 
 * Description: Controller for Category.
 * Created by: S.A.N.M.Wijethunga
 * Role: CeylonX Backend Developer(Intern)
 * ContactEmail: sanmwijethunga.support@gmail.com
 * Created on: 2024 July 18
 * Last edited on: 2024 July 18
*/
import Category from "../models/category.model.js";
import { io } from '../server.js'; // For real-time updates with socket.io
import { createLogEntry } from "../utils/logger.util.js";

// Create new category document
export const createCategory = async (req, res, next) => {
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins and admins are allowed to create categories." });
        
    } else {
        // Create a new category document with the below details
        const newCategory = new Category({
            categoryId: "CategoryID-1",
            createdBy: req.userId,
            categoryName: req.body.categoryName,
            companyId: req.body.companyId,
            details: req.body.details,
            toggle: "disable",
        });
    
        try {
            const savedCategory = await newCategory.save();
            io.emit('categoryCreated', savedCategory);
            createLogEntry(req.body.companyId, req.userId, "Category Created: " + savedCategory.categoryId);
            res.status(201).send(savedCategory);
        } catch (err) {
            next(err);
        }
    }
}
// Get all categories
export const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// get all categories which are enabled
export const getEnabledCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({ toggle: "enable" });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// get category by category ID
export const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findOne({ categoryId: req.params.categoryId });
        res.json(category);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Enable category by category ID
export const enableCategory = async (req, res, next) => {
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins and Admins and Stock Managers are allowed to enable categories." });
    } else {
        try {
            const updatedCategory = await Category.findOneAndUpdate({ categoryId: req.params.categoryId }, { toggle: "enable" }, { new: true });
            // If the category is not found return 404
            if (!updatedCategory) {
                return res.status(404).json({ message: "Category not found." });
            }
            // Return the updated category
            io.emit('categoryEnabled', updatedCategory);
            createLogEntry(req.companyId, req.userId, "Category Enabled: " + updatedCategory.categoryId);

            res.json(updatedCategory);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
// Update category by category ID
export const updateCategory = async (req, res, next) => {
    console.log(req.role);
    if (req.role !== 'superAdmin' && req.role !== 'admin' && req.role !== 'stockManager') {
        return res.status(403).json({ message: "Only Super Admins, Admins and Stock Managers are allowed to update categories." });
    } else {
        try {
            // Define the allowed fields
            const allowedFields = ['categoryName', 'details', 'toggle', 'companyId'];
            // Create an object with only the allowed fields
            const updateData = {};
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            const updatedCategory = await Category.findOneAndUpdate({ categoryId: req.params.categoryId }, updateData,
                { new: true } // Return the updated document
            );
            // If the category is not found return 404
            if (!updatedCategory) {
                return res.status(404).json({ message: "Category not found." });
            }
            // Return the updated category
            io.emit('categoryUpdated', updatedCategory);
            createLogEntry(req.companyId, req.userId, "Category Updated: " + updatedCategory.categoryId);
            res.json(updatedCategory);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}

// Delete category by category ID this is just a update to the category to disable it
export const removeCategory = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins and admins are allowed to remove categories." });
    } else {
        try {
            const updatedCategory = await Category.findOneAndUpdate({ categoryId: req.params.categoryId }, { toggle: "disable" }, { new: true });
            // If the category is not found return 404
            if (!updatedCategory) {
                return res.status(404).json({ message: "Category not found." });
            }
            // Return the updated category
            io.emit('categoryRemoved', updatedCategory);
            createLogEntry(req.companyId, req.userId, "Category Removed: " + updatedCategory.categoryId);
            res.json(updatedCategory);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}