import express from 'express';
import multer from 'multer';
import { verifyAccessToken } from '../middleware/auth.js';
import * as movieController from '../controllers/movieController.js';

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
    { name: 'portraitImage', maxCount: 1 },
    { name: 'landscapeImage', maxCount: 1 }
]);

router.post('/', verifyAccessToken, uploadFields, movieController.createMovie);
router.put('/:movieId', uploadFields, movieController.updateMovie);
router.put('/:movieId/toggle-status', verifyAccessToken, movieController.toggleMovieStatus);
router.get('/', movieController.getAllMovies);
router.get('/active', movieController.getActiveMovies);
router.get('/:id', movieController.getMovie);
router.get('/genre/:genre', movieController.getMoviesByGenre);
router.get('/upcoming', movieController.getUpcomingMovies);
router.get('/purchase-counts', movieController.getMoviePurchaseCounts);

export default router;