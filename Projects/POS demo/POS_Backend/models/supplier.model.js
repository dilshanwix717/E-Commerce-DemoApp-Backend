import mongoose from 'mongoose';
const { Schema } = mongoose;

const SupplierSchema = new Schema({
    // Supplier ID no need to send from the client side
    supplierId: {
     type: String,
     required: true,
     unique: true,
    },
    // Supplier Name Ex: ABC Suppliers
    supplierName: {
     type: String,
     required: true,
    },
    // Details about the supplier any remarks or details
    details: {
     type: String,
     required: false,
    },
    // Address of the supplier
    address: {
        type: String,
        required: true,
    },
    // Contact number of the supplier
    contactNo: {
        type: String,
        required: true,
    },
    // Email of the supplier
    email: {
        type: String,
        required: true,
    },
    // Credit period of the supplier (Withing this period any payment should be completed) Ex: 30 days, 20 days
    creditPeriod: {
        type: String,
        required: true,
    },
    // Company ID where the supplier is created
    companyId: {
        type: String,
        required: true,
    },
    // User ID who created the supplier (Super Admin)
    createdBy: {
        type: String,
        required: true,
    },
    // to enable disable the supplier
    toggle: {
        type: String,
        required: false,
        default: 'disable',
        enum: ['enable', 'disable'],
    },
    // Shop IDs where the supplier is assigned
    shopIds: {
        type: [String], // Array of shop IDs assigned to the supplier which are Strings. Ex: ['ShopID-1', 'ShopID-2']
        required: false,
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate the supplierId
SupplierSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastSupplier = await mongoose.model('Supplier').findOne().sort({ createdAt: -1 });
        const lastSupplierID = lastSupplier ? parseInt(lastSupplier.supplierId.split('-')[1]) : 0;
        this.supplierId = `SupplierID-${lastSupplierID + 1}`;
    }
    next();
});

export default mongoose.model("Supplier", SupplierSchema);