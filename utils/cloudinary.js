import dotenv from 'dotenv';
dotenv.config();
import cloudinary from 'cloudinary';
import { Readable } from 'stream';


class CloudinaryService {
    constructor() {
        this.cloudinary = cloudinary.v2;
        this.cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }

    async uploadImage(file, folder, filename) {
        try {
            const stream = Readable.from(file.buffer);
            return new Promise((resolve, reject) => {
                const uploadStream = this.cloudinary.uploader.upload_stream(
                    {
                        folder,
                        public_id: filename,
                        resource_type: 'auto',
                        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                        transformation: {
                            quality: 'auto',
                            fetch_format: 'auto'
                        }
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.pipe(uploadStream);
            });
        } catch (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    async deleteImage(publicId) {
        try {
            const result = await this.cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error(`Failed to delete image: ${error.message}`);
        }
    }
}

export default new CloudinaryService();