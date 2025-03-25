import dotenv from 'dotenv';
dotenv.config();
import admin from '../firebase/firebase-admin.js';
import { v4 as uuidv4 } from 'uuid';

class FirebaseStorageService {
    constructor() {
        this.bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    }

    async uploadImage(file, folder, filename) {
        try {
            const fileExtension = file.mimetype.split('/')[1];
            const uniqueFilename = `${filename}_${uuidv4()}.${fileExtension}`;
            const filePath = `${folder}/${uniqueFilename}`;
            const fileBuffer = file.buffer;
            const fileUpload = this.bucket.file(filePath);
            await fileUpload.save(fileBuffer, {
                metadata: {
                    contentType: file.mimetype
                }
            });

            const [url] = await fileUpload.getSignedUrl({
                action: 'read',
                expires: '01-01-2500'
            });

            return {
                url,
                path: filePath
            };
        } catch (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    async deleteImage(filePath) {
        try {
            const file = this.bucket.file(filePath);
            const [exists] = await file.exists(); // Check if the file exists
            if (exists) {
                await file.delete();
                return { success: true };
            }
            console.log(`File not found: ${filePath}`);
            return { success: false, message: 'File not found' };
        } catch (error) {
            throw new Error(`Failed to delete image: ${error.message}`);
        }
    }

}

export default new FirebaseStorageService();