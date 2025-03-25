import express from 'express';
import { verifyAccessToken } from '../middleware/auth.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();


router.post('/create-checkout-session', verifyAccessToken, paymentController.stripeCheckoutSession);

// Webhook route with raw body parsing for Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// Get all payments (Admin only)
router.get('/', paymentController.getAllPayments);

// Get payment by ID
router.get('/:id', verifyAccessToken, paymentController.getPaymentById);




export default router;
