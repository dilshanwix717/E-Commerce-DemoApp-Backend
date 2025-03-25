import express from 'express';
import { verifyAccessToken, isAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.post('/movies', verifyAccessToken, isAdmin, adminController.createMovie);
router.put('/movies/:id', verifyAccessToken, isAdmin, adminController.updateMovie);
router.delete('/movies/:id', verifyAccessToken, isAdmin, adminController.deleteMovie);
router.get('/getAllUsers', adminController.getAllUsers);
router.get('/getAllAdmins', verifyAccessToken, isAdmin, adminController.getAllAdmins);

export default router;
