import mongoose from 'mongoose';

const { Schema } = mongoose;

const contactMessageSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.model('ContactMessage', contactMessageSchema);
