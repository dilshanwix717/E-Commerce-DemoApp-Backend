import express from 'express';
import { verifyAccessToken, isAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.post('/products', verifyAccessToken, isAdmin, adminController.createProduct);
router.put('/products/:id', verifyAccessToken, isAdmin, adminController.updateProduct);
router.delete('/products/:id', verifyAccessToken, isAdmin, adminController.deleteProduct);
router.get('/getAllUsers', adminController.getAllUsers);
router.get('/getAllAdmins', verifyAccessToken, isAdmin, adminController.getAllAdmins);

export default router;
