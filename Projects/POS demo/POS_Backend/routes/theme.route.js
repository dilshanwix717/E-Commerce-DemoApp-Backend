import express from 'express';
import { getTheme, createTheme, updateTheme, deleteTheme, getThemes } from '../controllers/theme.controller.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.get('/', getThemes);                                     // Get all themes
router.post('/create', verifyToken, createTheme);               // Create a new theme
router.get('/:themeId', getTheme);                              // Get theme by theme ID
router.put('/update/:themeId', verifyToken, updateTheme);       // Update theme by theme ID
router.delete('/delete/:themeId', verifyToken, deleteTheme);    // Delete theme by theme ID


export default router;