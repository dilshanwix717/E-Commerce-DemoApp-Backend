import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true }], // Updated to array of ObjectId
    amount: { type: Number, required: true },
    stripePaymentId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);


// import mongoose from 'mongoose';

// const paymentSchema = new mongoose.Schema({
//     paymentId: { type: String, unique: true, required: true }, // Added paymentId
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     movie: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true }], // Updated to array of ObjectId
//     amount: { type: Number, required: true },
//     stripePaymentId: { type: String, required: true },
//     status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
// }, { timestamps: true });

// // Pre-save hook to generate custom paymentId
// paymentSchema.pre('save', async function (next) {
//     if (this.isNew) {
//         const lastPayment = await mongoose.model('Payment').findOne({ paymentId: { $exists: true } }).sort({ createdAt: -1 });

//         let lastPaymentID = 0;
//         if (lastPayment && lastPayment.paymentId) {
//             lastPaymentID = parseInt(lastPayment.paymentId.split('-')[1]) || 0;
//         }

//         this.paymentId = `PID-${lastPaymentID + 1}`;
//     }
//     next();
// });


// export default mongoose.model('Payment', paymentSchema);