import dotenv from 'dotenv';
dotenv.config();
import admin from '../firebase/firebase-admin.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export const verifyAccessToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // First, try JWT verification
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({ message: 'Invalid token' });
            }
            req.user = user;
            return next();
        } catch (jwtError) {
            // If JWT verification fails, try Firebase verification
            try {
                const decodedFirebaseToken = await admin.auth().verifyIdToken(token);
                const user = await User.findOne({ firebaseUid: decodedFirebaseToken.uid });
                if (!user) {
                    return res.status(401).json({ message: 'User not found' });
                }
                req.user = user;
                return next();
            } catch (firebaseError) {
                console.error('Token verification failed:', firebaseError);
                return res.status(401).json({ message: 'Authentication failed' });
            }
        }
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            message: 'Token verification error',
            error: error.message
        });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user?.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

