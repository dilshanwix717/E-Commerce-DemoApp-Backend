import mongoose from 'mongoose';
const { Schema } = mongoose;

const RMTSchema = new Schema({
    rmtId: { type: String, required: false }, // Raw Material Transaction ID
    companyId: { type: String, required: true }, // Company ID
    shopId: { type: String, required: true }, // Shop ID
    supplierId: { type: String, required: true }, // Supplier ID
    categoryId: { type: String, required: true }, // Category ID
    productId: { type: String, required: true }, // Product ID
    finishedGoodId: { type: String, required: false }, // Finished Good ID (Optional)
    transactionDateTime: { type: Date, required: true }, // Transaction Date & Time
    transactionType: { type: String, required: true }, // Transaction Type (GRN, GIN, etc.)
    transactionCode: { type: String, required: true }, // Transaction Code (GRN-1, GIN-1, etc.)
    rawMatInOut: { type: String, required: true }, // Raw Material In/Out
    unitCost: { type: Number, required: true }, // Unit Cost
    quantity: { type: Number, required: true }, // Quantity
    totalCost: { type: Number, required: true }, // Total Cost (unitCost * quantity)
    remarks: { type: String, required: false }, // Remarks (Optional)
    createdBy: { type: String, required: true }, // Created By
    transactionStatus: { type: String, required: true }, // Transaction Status (Pending, Approved, etc.)
}, { timestamps: true });

RMTSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastRMT = await mongoose.model('RawMaterialTransaction').findOne().sort({ createdAt: -1 });
        this.rmtId = `RMTID-${(lastRMT ? parseInt(lastRMT.rmtId.split('-')[1]) : 0) + 1}`;
    }
    next();
});

export default mongoose.model('RawMaterialTransaction', RMTSchema);


