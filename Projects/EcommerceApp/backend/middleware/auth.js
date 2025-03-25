import admin from '../firebase/firebase-admin.js';
import User from '../models/User.js';

export const verifyAccessToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log(decodedToken)
        // Get user from MongoDB
        const user = await User.findOne({ firebaseUid: decodedToken.uid });
        console.log(user)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user?.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};