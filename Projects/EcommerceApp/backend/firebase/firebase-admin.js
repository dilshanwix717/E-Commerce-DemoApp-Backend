import dotenv from 'dotenv';
dotenv.config();
import admin from 'firebase-admin';

let serviceAccount;

try {
    // Decode the base64-encoded key and parse it into JSON
    const decodedKey = Buffer.from(process.env.FIREBASE_ADMIN_KEY, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decodedKey);
} catch (error) {
    console.error('Error decoding Firebase Admin Key:', error);
    process.exit(1); // Exit to prevent undefined behavior
}

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

console.log('Firebase Admin initialized with bucket:', process.env.FIREBASE_STORAGE_BUCKET);

export default admin;
