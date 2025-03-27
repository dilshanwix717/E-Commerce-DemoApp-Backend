import express from 'express';
import multer from 'multer';
import { verifyAccessToken } from '../middleware/auth.js';
import * as productController from '../controllers/productController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Configure the fields for multiple file uploads
const uploadFields = upload.fields([
    { name: 'portrait', maxCount: 1 },
    { name: 'landscape', maxCount: 1 },
    { name: 'gallery', maxCount: 5 } // Allow multiple gallery images
]);

router.post('/', verifyAccessToken, uploadFields, productController.createProduct);
router.put('/:productId', verifyAccessToken, uploadFields, productController.updateProduct);
router.put('/:productId/toggle-status', verifyAccessToken, productController.toggleProductStatus);
router.get('/', verifyAccessToken, productController.getAllProducts);
router.get('/active', productController.getActiveProducts);
router.get('/:id', productController.getProduct);
router.get('/genre/:genre', productController.getProductsByGenre);
router.get('/upcoming', productController.getUpcomingProducts);
router.get('/purchase-counts', productController.getProductPurchaseCounts);

export default router;