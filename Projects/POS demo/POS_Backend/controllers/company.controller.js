/** 
 * Description: Controller for Company.
 * Created by: S.A.N.M.Wijethunga
 * Role: CeylonX Backend Developer(Intern)
 * ContactEmail: sanmwijethunga.support@gmail.com
 * Created on: 2024 July 18
 * Last edited on: 2024 July 18
*/
import Company from "../models/company.model.js";
import Category from "../models/category.model.js";
import { io } from '../server.js'; // For real-time updates with socket.io
import { createLogEntry } from "../utils/logger.util.js";

// Create new company document
export const createCompany = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to create companies." });
        
    } else {
        const newCompany = new Company({
            // Not using ...re.body for security, clarity, and to avoid unwanted fields
            //...req.body,
            companyId: "CompanyID-1",
            companyName: req.body.companyName,
            email: req.body.email,
            contactNo: req.body.contactNo,
            address: req.body.address,
            shopIds: req.body.shopIds,
            vatNo: req.body.vatNo,
            toggle: "disable",
            createdBy: req.userId,
        });
    
        try {
            const savedCompany = await newCompany.save();

            // Emit event for company creation
            io.emit('companyCreated', savedCompany);

            // Log the creation of the company
            createLogEntry(savedCompany.companyId, savedCompany.createdBy, savedCompany);

            // Automatically create the "Raw Material" category for the new company
            const rawMaterialCategory = new Category({
                categoryId: "CategoryID-1",
                categoryName: "Raw Material",
                companyId: savedCompany.companyId, // Associate with the created company
                createdBy: req.userId,
                toggle: "disable", // Set initial status
            });

            const savedCategory = await rawMaterialCategory.save();

            // Emit event for category creation
            io.emit('categoryCreated', savedCategory);

            // Log the creation of the "Raw Material" category
            createLogEntry(savedCompany.companyId, req.userId, "Category Created: Raw Material");

            res.status(201).json({ 
                company: savedCompany, 
                category: savedCategory 
            });
        } catch (err) {
            next(err);
        }
    }
}

// Get all companies
export const getCompanies = async (req, res, next) => {
    try {
        const companies = await Company.find({});
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get company by company ID
export const getCompany = async (req, res, next) => {
    try {
        const company = await Company.findOne({ companyId: req.params.companyId });
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }
        res.json(company);
    }
    catch (err) {
        console.error(err);
        next(err);
    }
}

// Update company by company ID
export const updateCompany = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to update companies." });
    } else {
        try {
            const allowedFields = ['companyName', 'email', 'contactNo', 'address', 'shopIds', 'vatNo', 'toggle'];
            const update = {};
            // Only allow fields that are defined in the allowedFields array will be updated
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    update[field] = req.body[field];
                }
            });

            const updatedCompany = await Company.findOneAndUpdate({ companyId: req.params.companyId }, update, { new: true });
            // If the company is not found return 404
            if (!updatedCompany) {
                return res.status(404).json({ message: "Company not found." });
            }
            // Return the updated company
            io.emit('companyUpdated', updatedCompany);
            res.status(200).json(updatedCompany);
        } catch (err) {
            console.error(err);
            next(err);
        }
    }
}

// Update company by company ID (Update the toggle field to enable) and assign a admin to the company
export const enableCompany = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to enable companies." });
    } else {
        try {
            const updatedCompany = await Company.findOneAndUpdate({ companyId: req.params.companyId }, { toggle: "enable" }, { new: true });
            // If the company is not found return 404
            if (!updatedCompany) {
                return res.status(404).json({ message: "Company not found." });
            }
            // Return the updated company
            io.emit('companyEnabled', updatedCompany);
            res.status(200).json(updatedCompany);
        }
        catch (err) {
            console.error(err);
            next(err);
        }
    }
}

// Remove company by company ID (Update the toggle field to disable)
export const removeCompany = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to remove companies." });
    } else {
        try {
            const updatedCompany = await Company.findOneAndUpdate({ companyId: req.params.companyId }, { toggle: "disable" }, { new: true });
            // If the company is not found return 404
            if (!updatedCompany) {
                return res.status(404).json({ message: "Company not found." });
            }
            // Return the updated company
            console.log("CompanyID:", updatedCompany.companyId, "is removed/Disabled.");
            io.emit('companyRemoved', updatedCompany);
            res.status(200).json(updatedCompany);
        }
        catch (err) {
            console.error(err);
            next(err);
        }
    }
}