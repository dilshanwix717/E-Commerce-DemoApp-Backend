import express from 'express';
import multer from 'multer';
import { verifyAccessToken } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Configure multer for profile picture upload
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

// Configure fields for multiple file uploads
const uploadFields = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
]);

// Route to upload and update profile picture
router.put('/profile-picture', verifyAccessToken, uploadFields, userController.updateProfilePicture);

// Route to update user profile (First Name, Last Name, Contact, Email)
router.put('/profile', verifyAccessToken, userController.updateProfile);

// Route to change user password
router.put('/change-password', verifyAccessToken, userController.updatePassword);

// Other user-related routes
router.post('/wishlist', verifyAccessToken, userController.addToWishlist);
router.post('/wishlist/remove', verifyAccessToken, userController.removeFromWishlist);
router.get('/purchased', verifyAccessToken, userController.getPurchasedMovies);
router.post('/checkPurchased', verifyAccessToken, userController.checkAndUpdatePurchasedMovies);
router.get('/watch-history', verifyAccessToken, userController.getWatchHistory);
router.post('/watch-history', verifyAccessToken, userController.addToWatchHistory);
router.post('/cart', verifyAccessToken, userController.addToCart);
router.post('/cart/remove', verifyAccessToken, userController.removeFromCart);
// Route to deactivate user account
router.put('/:userId/toggle-status', userController.toggleUserStatus);

export default router;
