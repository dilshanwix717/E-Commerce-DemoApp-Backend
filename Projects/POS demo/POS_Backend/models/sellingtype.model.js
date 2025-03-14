import mongoose from 'mongoose';
const { Schema } = mongoose;

const SellingType = new Schema({
    
    sellingTypeId: {
        type: String,
        required: false,
    },
    companyId: {
        type: String,
        required: true,
    },
    shopId: {
        type: String,
        required: true,
    },
    // Dining, Takeaway, Delivery, Online, Uber, PickMe, Other
    sellingType: {
        type: String,
        required: true,
    },
    // Selling type charge amount fixed or percentage
    sellingTypeAmount: {
        type: Number,
        required: true,
    },
    // Add, Deduct Fixed or Percentage value +100, -100, +10%, -10%
    additionDeduction: {
        type: String,
        required: false,
    },
    // To define the service delivery type Ex: Service/Delivery
    ServiceDelivery: {
        type: String,
        required: false,
    },
    // enabled, disabled
    toggle: {
        type: String,
        required: true,
    },
    // Created by user...
    createdBy: {
        type: String,
        required: true,
    },

}, {
    timestamps: true
});

SellingType.pre('save', async function(next) {
    if (this.isNew) {
        const lastSellingType = await mongoose.model('Selling_Type').findOne().sort({ createdAt: -1 });
        const lastSellingTypeID = lastSellingType ? parseInt(lastSellingType.sellingTypeId.split('-')[1]) : 0;
        this.sellingTypeId = `STID-${lastSellingTypeID + 1}`;
    }
    next();
});

export default mongoose.model("Selling_Type", SellingType);
