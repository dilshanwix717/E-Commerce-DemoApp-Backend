// Description: Controller for Unit of Materials (UOM).
// Methods: createUOM, getUOMs, getUOMById, updateUOM, deleteUOM
// Created by: S.A.N.M.Wijethunga
// Created on: 09/07/2024
import unitofmaterials from '../models/uom.model.js';
import { createLog } from '../utils/logger.util.js';

// create and save a new UOM
export const createUOM = async (req, res, next) => {
    /*
    if (req.role !== 'superAdmin' && req.role !== 'admin') {
        return res.status(403).json({ message: "Only Super Admins and admins are allowed to create UOM." });
    } 
    */
   const { userId, companyId, shopId } = req;
    // Validate request
    if (!req.body.name || !req.body.toggle) {
        return res.status(400).json({ message: "Name and toggle fields are required." });
    }
    else {
        const uom = new unitofmaterials({
            createdBy: req.body.userId,
            uomId: "UOMId-1",
            name: req.body.name,
            description: req.body.description,
            toggle: "enable"
        });

        try {
            // Save the new UOM
            const savedUOM = await uom.save();
            // Create a log entry
            await createLog(companyId, shopId, userId, `Created UOM entry for uomId: ${savedUOM.uomId}`);
            res.status(201).send(savedUOM);
        } catch (err) {
            next(err);
        }
    }
};

// retrieve and return all UOMs from the database.
export const getUOMs = async (req, res, next) => {
    try {
        const uom = await unitofmaterials.find({});
        res.json(uom);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// find a single UOM with a uomId
export const getUOMById = async (req, res, next) => {
    try {
        const uom = await unitofmaterials.findOne({ uomId: req.params.uomId });
        if (!uom) {
            return res.status(404).json({ message: "UOM not found with id " + req.params.uomId });
        }
        res.json(uom);
    } catch (err) {
        return res.status(500).json({ message: "Error retrieving UOM with id " + req.params.uomId });
    }
};

// update a UOM identified by the uomId in the request
export const updateUOM = async (req, res, next) => {
    if (!req.body.name || !req.body.toggle) {
        return res.status(400).json({ message: "Name and toggle fields are required." });
    }
    try {
        const updatedUOM = await unitofmaterials.findOneAndUpdate({ uomId: req.params.uomId }, {
            name: req.body.name,
            description: req.body.description,
            toggle: req.body.toggle
        }, { new: true });
        if (!updatedUOM) {
            return res.status(404).json({ message: "UOM not found with id " + req.params.uomId });
        }
        // Create a log entry
        await createLog(req.companyId, req.shopId, req.userId, `Updated UOM entry for uomId: ${updatedUOM.uomId}`);
        res.json(updatedUOM);
    } catch (err) {
        return res.status(500).json({ message: "Error updating UOM with id " + req.params.uomId });
    }
};

// delete a UOM with the specified uomId in the request
export const deleteUOM = async (req, res, next) => {
    try {
        // Check if the uomId is provided in the request parameters
        if (!req.params.uomId) {
            return res.status(400).json({ message: "uomId is required." });
        }
        // Log the uomId that is being deleted
        //console.log(`Attempting to delete UOM with id: ${req.params.uomId}`);

        // Attempt to find and remove the UOM
        const deletedUOM = await unitofmaterials.findOneAndDelete({ uomId: req.params.uomId });

        // If no UOM was found to delete, respond with a 404 status
        if (!deletedUOM) {
            return res.status(404).json({ message: `UOM not found with id ${req.params.uomId}` });
        }

        // Create a log entry
        await createLog(req.companyId, req.shopId, req.userId, `Deleted UOM entry for uomId: ${deletedUOM.uomId}`);
        
        // Respond with a success message
        res.json({ message: "UOM deleted successfully!" });
    } catch (err) {
        console.error(`Error deleting UOM with id ${req.params.uomId}:`, err);
        return res.status(500).json({ message: `Could not delete UOM with id ${req.params.uomId}` });
    }
};