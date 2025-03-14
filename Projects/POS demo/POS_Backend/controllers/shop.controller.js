/** 
 * Description: Controller for Shops.
 * Created by: S.A.N.M.Wijethunga
 * Role: CeylonX Backend Developer(Intern)
 * ContactEmail: sanmwijethunga.support@gmail.com
 * Created on: 2024 July 18
 * Last edited on: 2024 July 18
*/
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { io } from '../server.js'; // For real-time updates with socket.io
import { createLogEntry } from "../utils/logger.util.js";

// Create new shop document
export const createShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to create shops." });

    } else {
        const newShop = new Shop({
            // Not using ...re.body for security, clarity, and to avoid unwanted fields
            //...req.body,
            // To know about the data that is being sent in the request body, refer to the models/shop.model.js file
            shopId: 'ShopID-1',
            userId: req.body.userId, // Put a select field and browse through the users and select the user who is responsible for the shop
            shopName: req.body.shopName,
            companyId: req.body.companyId,
            contactNo: req.body.contactNo,
            address: req.body.address,
            email: req.body.email,
            publicIPAddress: req.body.publicIPAddress,
            toggle: "disable",
            createdBy: req.userId,
        });

        try {
            const savedShop = await newShop.save();

            // Update each user's shopIds array
            await User.updateMany(
                { userId: { $in: req.body.userId } },
                { $push: { shopIds: savedShop.shopId } }
            );

            io.emit('shopCreated', savedShop);
            createLogEntry(req.body.companyId, req.userId, 'Shop Created:' + savedShop.shopId);
            res.status(201).send(savedShop);
        } catch (err) {
            next(err);
        }
    }
}

// Get all shops the shops filter the toggle data from frontend.
export const getShops = async (req, res, next) => {
    try {
        const shops = await Shop.find({});

        //res.json('shops5');
        res.json(shops);//this should give the response
        io.emit('shopsFound', shops);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get shop by shop ID
export const getShop = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ shopId: req.params.shopId });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        io.emit('shopFound', shop);
        res.json(shop);
    } catch (err) {
        next(err);
    }
};

// Enable shop by shop ID
export const enableShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to enable shops." });
    } else {
        try {
            const enabledShop = await Shop.findOneAndUpdate({ shopId: req.params.shopId }, { toggle: "enable" }, { new: true });
            if (!enabledShop) {
                return res.status(404).json({ message: "Shop not found" });
            }
            io.emit('shopEnabled', enabledShop);
            createLogEntry(enabledShop.companyId, req.userId, 'Shop Enabled:', enabledShop.shopId);
            res.json(enabledShop);
        } catch (err) {
            next(err);
        }
    }
};

// Update shop by shop ID
export const updateShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to update shops." });
    } else {
        try {
            const allowedFields = ['shopName', 'contactNo', 'address', 'email', 'createdBy', 'publicIPAddress', 'toggle'];
            /*
            // Can't proceed without assigning an admin to the shop
            if(!req.body.userId) {
                return res.status(400).json({ message: "Please Assign an Admin to the shop" });
            }
            */
            const update = {};
            // Only allow fields that are defined in the allowedFields array will be updated
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    update[field] = req.body[field];
                }
            });

            const updatedShop = await Shop.findOneAndUpdate({ shopId: req.params.shopId }, update, { new: true });
            // If the shop is not found return 404
            if (!updatedShop) {
                return res.status(404).json({ message: "Shop not found" });
            }
            io.emit('shopUpdated', updatedShop);
            createLogEntry(updatedShop.companyId, req.userId, 'Shop Updated:' + updatedShop.shopId);
            res.json(updatedShop);
        } catch (err) {
            next(err);
        }
    }
};
////////////////////// - This doesn't contain any user unassigning when shop deletes - ///////////////////////
// May not work due to cors policy update in the server.js file
// Delete shop by shop ID (Soft delete) by changing the toggle to disable
export const removeShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to Remove shops." });
    } else {
        try {
            const removedShop = await Shop.findOneAndUpdate({ shopId: req.params.shopId }, { toggle: "disable" }, { new: true });
            if (!removedShop) {
                return res.status(404).json({ message: "Shop not found" });
            }
            io.emit('shopDeleted', removedShop);
            createLogEntry(removedShop.companyId, req.userId, 'Shop Deleted/Removed:', removedShop.shopId);
            res.json(removedShop);
        } catch (err) {
            next(err);
        }
    }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Separate function to assign users to shops
export const assignUserToShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to assign users to shops." });
    }

    const { companyId, shopId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds must be a non-empty array" });
    }

    try {
        // Using $addToSet to ensure no duplicates in the userId array
        const updatedShop = await Shop.findOneAndUpdate(
            { companyId, shopId },
            { $addToSet: { userId: { $each: userIds } } },
            { new: true }
        );

        if (!updatedShop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Add the shopId to each user's shopIds array
        await User.updateMany(
            { userId: { $in: userIds } },
            { $addToSet: { shopIds: shopId } } // Use $addToSet to avoid duplicates
        );

        io.emit('userAssigned', updatedShop);
        createLogEntry(updatedShop.companyId, req.userId, 'Users Assigned to Shop:' + updatedShop.shopId);
        res.json(updatedShop);
    } catch (err) {
        next(err);
    }
};

// Separate function to unassign users from shops
export const unassignUserFromShop = async (req, res, next) => {
    if (req.role !== 'superAdmin') {
        return res.status(403).json({ message: "Only Super Admins are allowed to unassign users from shops." });
    }

    const { companyId, shopId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds must be a non-empty array" });
    }

    try {
        // Using $pull to remove specified userIds from the userId array in the shop
        const updatedShop = await Shop.findOneAndUpdate(
            { companyId, shopId },
            { $pull: { userId: { $in: userIds } } },
            { new: true }
        );

        if (!updatedShop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Remove the shopId from each user's shopIds array
        await User.updateMany(
            { userId: { $in: userIds } },
            { $pull: { shopIds: shopId } }
        );

        io.emit('userUnassigned', updatedShop);
        createLogEntry(updatedShop.companyId, req.userId, 'Users Unassigned from Shop:', updatedShop.shopId);
        res.json(updatedShop);
    } catch (err) {
        next(err);
    }
};
