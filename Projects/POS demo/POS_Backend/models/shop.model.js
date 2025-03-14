import mongoose from 'mongoose';
const { Schema } = mongoose;

const ShopSchema = new Schema({
    // Shop ID no need to send from the client side, To uniquely identify the shop without long object ID
    shopId: {
      type: String,
      required: true,
      unique: true,
    },
    // Name of the shop, Ex: KFC-Kaluthara, KFC-Gampaha, McDonalds-Kandy, etc.
    shopName: {
     type: String,
     required: true,
    },
    // Company ID where the shop is created(Belongs to)
    companyId: {
        type: String,
        required: true,
    },
    // Admin ID who is responsible for the shop (Assigned adminId)
    userId: {
        type: [String],
        required: true,
    },
    // Super-Admin ID who created the shop
    createdBy: {
        type: String,
        required: true,
    },
    // Telephone number of the shop
    contactNo: {
        type: String,
        required: false,
    },
    // Address of the shop
    address: {
        type: String,
        required: false,
    },
    // Email of the shop if there is one (better to have one)
    email: {
        type: String,
        required: false,
    },
    // To enable disable the shop
    toggle: {
        type: String,
        default: true,
    },
    // IP address of the shops network (can be used to identify the shop and other features like to identify the devices that are connected to the same network)
    publicIPAddress: {
        type: String,
        required: false,
    }
}, {
    timestamps: true
});

ShopSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastShop = await mongoose.model('Shop').findOne().sort({ createdAt: -1 });
        const lastShopID = lastShop ? parseInt(lastShop.shopId.split('-')[1]) : 0;
        this.shopId = `ShopID-${lastShopID + 1}`;
    }
    next();
});

export default mongoose.model("Shop", ShopSchema);
