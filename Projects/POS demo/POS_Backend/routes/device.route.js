import express from 'express';
import { createDevice, getDevices, getDevice, updateDevice, deleteDevice } from '../controllers/device.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.post('/add-device', verifyToken, createDevice); // Create a new device
router.get('/', getDevices); // Get all devices
router.get('/:deviceId', getDevice); // Get a device by deviceId
router.put('/update-device/:deviceId', updateDevice); // Update a device by deviceId
router.delete('/delete-device/:deviceId', deleteDevice); // Delete a device by deviceId

export default router;
