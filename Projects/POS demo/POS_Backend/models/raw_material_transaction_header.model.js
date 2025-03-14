import mongoose from 'mongoose';
const { Schema } = mongoose;

const RMTHSchema = new Schema({
    rmthId: { type: String, required: false }, // Raw Material Transaction Header ID
    transactionCode: { type: String, required: true }, // Transaction Code (GRN-1, GIN-1, etc.)
    companyId: { type: String, required: true }, // Company ID
    shopId: { type: String, required: true }, // Shop ID
    supplierId: { type: String, required: true }, // Supplier ID
    transactionDateTime: { type: Date, required: true }, // Transaction Date & Time
    transactionType: { type: String, required: true }, // Transaction Type (GRN, GIN, etc.)
    rawMatInOut: { type: String, required: true }, // Raw Material In/Out
    transactionStatus: { type: String, enum: ['Pending', 'Cancelled', 'Completed'], required: false }, // Transaction Status
    totalCost: { type: Number, required: true }, // Total Cost
    outStandingAmount: { type: Number, required: true }, // Outstanding Amount
    createdBy: { type: String, required: true }, // Created By

}, { timestamps: true });

RMTHSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastRMTH = await mongoose.model('RawMaterialTransactionHeader').findOne().sort({ createdAt: -1 });
        this.rmthId = `RMTHID-${(lastRMTH ? parseInt(lastRMTH.rmthId.split('-')[1]) : 0) + 1}`;
    }
    next();
});

export default mongoose.model('RawMaterialTransactionHeader', RMTHSchema);





