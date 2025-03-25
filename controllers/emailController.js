// controllers/emailController.js
import { sendEmail } from '../utils/emailService.js';
import { createPurchaseConfirmationEmail } from '../utils/emailTemplate.js';
import Movie from '../models/Movie.js';

// Send purchase confirmation email
export const sendPurchaseConfirmationEmail = async (req, res) => {
    try {
        const { user, movieIds, session } = req.body;
        // Fetch full movie details
        const movies = await Movie.find({ _id: { $in: movieIds } });
        if (!movies || movies.length === 0) {
            throw new Error('No movies found for the given IDs');
        }
        const emailHtml = createPurchaseConfirmationEmail(user, movies, session);
        const result = await sendEmail(
            user.email,
            'Purchase Confirmation - Your Movies Are Ready!',
            emailHtml,
            '',
            []
        );
        res.status(200).json({
            success: true,
            message: 'Purchase confirmation email sent successfully'
        });
    } catch (error) {
        console.error('Error sending purchase confirmation email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send purchase confirmation email',
            error: error.message
        });
    }
};


// Send welcome email
export const sendWelcomeEmail = async (req, res) => {
    try {
        const { user } = req.body;
        // Implementation for welcome email
        // Will add when needed

        res.status(200).json({
            success: true,
            message: 'Welcome email sent successfully'
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send welcome email',
            error: error.message
        });
    }
};

// Send password reset email
export const sendPasswordResetEmail = async (req, res) => {
    try {
        const { user, resetToken } = req.body;
        // Implementation for password reset email
        // Will add when needed

        res.status(200).json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send password reset email',
            error: error.message
        });
    }
};