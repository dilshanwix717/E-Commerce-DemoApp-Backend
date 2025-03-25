// routes/contactRoutes.js
import express from 'express';
import { createContactMessage, getAllContactMessages } from '../controllers/contactController.js';

const router = express.Router();

// Route to create a new contact message
router.post('/create', createContactMessage);

// Route to fetch all contact messages (only for admin users, for example)
router.get('/get', getAllContactMessages);

export default router;
