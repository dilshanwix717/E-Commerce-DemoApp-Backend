import mongoose from "mongoose";
const { Schema } = mongoose;

// Finished Good Transaction Model
const FinishedGood_TransactionSchema = new Schema({
    ftId: { type: String, required: true, unique: true }, // Transaction ID
    companyId: { type: String, required: true }, // Company ID
    shopId: { type: String, required: true }, // Shop ID
    finishedgoodId: { type: String, required: true }, // Finished Good ID
    usedProductDetails: [{
        productId: { type: String, required: true }, // Product ID
        quantity: { type: Number, required: true, min: 0 }, // Quantity used
        currentWAC: { type: Number, required: true, min: 0 }, // Current Weighted Average Cost
    }],
    transactionDateTime: { type: Date, required: true }, // Transaction Date and Time
    transactionType: { type: String, required: true }, // Type of transaction
    OrderNo: { type: String, required: true }, // Order Number
    transactionCode: { type: String, required: true }, // Transaction Code
    sellingType: { type: String, required: true }, // Selling Type
    sellingPrice: { type: Number, required: true, min: 0 }, // Selling Price
    discountAmount: { type: Number, required: true, min: 0 }, // Discount Amount
    customerId: { type: String, required: false }, // Customer ID
    transactionInOut: { type: String, required: true, enum: ['In', 'Out'] }, // Transaction Direction
    finishedgoodQty: { type: Number, required: false, min: 0 }, // Finished Good Quantity
    transactionStatus: { type: String, required: true, enum: ["Pending", "Completed", "Cancelled", "Returned", "Partially Returned"] }, // Transaction Status
    createdBy: { type: String, required: true }, // Created by user ID
}, { timestamps: true });

// Pre-save hook to auto-generate the FTID
FinishedGood_TransactionSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastFinishGood = await mongoose.model('FinishedGood_Transaction').findOne().sort({ createdAt: -1 });
        const lastFinishGoodID = lastFinishGood ? parseInt(lastFinishGood.ftId.split('-')[1]) : 0;
        this.ftId = `FTID-${lastFinishGoodID + 1}`;
    }
    next();
});

export default mongoose.model("FinishedGood_Transaction", FinishedGood_TransactionSchema);


