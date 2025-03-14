// Used for creating the schema for the price collection in the database
import mongoose from 'mongoose';
const { Schema } = mongoose;

const Price = new Schema({
    // PriceID-1,... to uniquely identify the price for each product
    priceId: {
        type: String,
        required: true,
        unique: true,
    },
    // Identify the Product Category
    categoryId: {
        type: String,
        required: true,
    },
    // Identify the Product
    productId: {
        type: String,
        required: true,
    },
    companyId: {
        type: String,
        required: true,
    },
    shopId: {
        type: String,
        required: true,
    },
    // Identify the user who created the price
    createdBy: {
        type: String,
        required: true,
    },
    // prices for special customers
    customerId: {
        type: String,
        required: false,
    },
    // Discount amount or percentage
    discount: {
        type: String,
        required: false,
    },
    // Discount valid datetime range
    discountDateRange: {
        type: String,
        required: false,
    },
    // Dining, Takeaway, Delivery, Online, Uber, PickMe, Other
    // STID-1,....
    sellingTypeId: {
        type: String,
        required: false,
    },
    // Commission amount or percentage for selling type
    sellingTypeCommission: {
        type: String,
        required: false,
    },
    /*
    // Product cost as per the BOM details and calculations.
    productCost: {
        type: Number,
        required: true,
    },
    */
    // Final product selling price after all the discounts and commissions
    sellingPrice: {
        type: Number,
        required: true,
    },

}, {
    timestamps: true
});

Price.pre('save', async function(next) {
    if (this.isNew) {
        const lastPrice = await mongoose.model('Price').findOne().sort({ createdAt: -1 });
        const lastPriceID = lastPrice ? parseInt(lastPrice.priceId.split('-')[1]) : 0;
        this.priceId = `PriceID-${lastPriceID + 1}`;
    }
    next();
});

export default mongoose.model("Price", Price);
