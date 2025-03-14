/** 
 * Author: S.A.N.M. Wijethunga
 * Last Modified: July 04, 2024
 * Description: This file contains the controller functions for the device routes
 * The controller functions are used to handle the requests from the device routes
 * The controller functions interact with the database using the Device model
 */
import Device from '../models/device.model.js';
import createError from '../utils/createError.js';

// Create a new device - used to save the details of the posSystem installed device and printers to the database
export const createDevice = async (req, res, next) => {
    try {
        // Object destructuring to get the values from the request body
        const newDevice = new Device({
            ...req.body,
            deviceId: 'DEVICE-1',
            companyId: req.companyId
        });
        // Save the new device to the database Device collection using the Device model
        await newDevice.save();
        // 201 status code indicates that a new resource has been created successfully
        res.status(201).json(newDevice);
    } catch (err) {
        next(err);
    }
};


// Get all devices - used to retrieve all the devices saved in the database
export const getDevices = async (req, res, next) => {
    try {
        const devices = await Device.find();
        // 200 status code indicates that the request is OK
        res.status(200).json(devices);
    } catch (err) {
        next(err);
    }
};

// Get a device - used to retrieve a specific device from the database using the device ID
export const getDevice = async (req, res, next) => {
    try {
        // Find the device by the device ID
        const device = await Device.findOne({ deviceId: req.params.deviceId });
        if (!device) return next(createError(404, 'Device not found'));
        // 200 status code indicates that the request is OK
        res.status(200).json(device);
    } catch (err) {
        next(err);
    }
};

// Update a device - used to update the details of a specific device in the database using the device ID
export const updateDevice = async (req, res, next) => {
    try {
        // Find the device by the device ID and update the details with the new values from the request body
        const updatedDevice = await Device.findOneAndUpdate({ deviceId: req.params.deviceId }, req.body, { new: true });
        if (!updatedDevice) return next(createError(404, 'Device not found'));
        // 200 status code indicates that the request is OK
        res.status(200).json(updatedDevice);
    } catch (err) {
        next(err);
    }
};

// Delete a device - used to delete a specific device from the database using the device ID
export const deleteDevice = async (req, res, next) => {
    try {
        // Find the device by the device ID and delete it from the database
        await Device.findOneAndDelete({ deviceId: req.params.deviceId });
        // 200 status code indicates that the request is OK
        res.status(200).json('Device deleted');
    } catch (err) {
        next(err);
    }
};
