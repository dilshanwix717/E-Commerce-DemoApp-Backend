import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }], // Updated to array of ObjectId
    amount: { type: Number, required: true },
    stripePaymentId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
