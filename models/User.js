import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false }
}, { _id: false }); // _id: false prevents Mongoose from creating ObjectId for subdocuments

const userSchema = new Schema({
    firebaseUid: { type: String, required: true, unique: true, index: true }, // Added index
    userId: { type: String, unique: true, required: true }, // Consider if this is still needed if firebaseUid is primary key
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true, index: true }, // Added index
    contact: { type: String },
    password: { type: String, required: false }, // Keep if hybrid auth needed, else remove
    profilePicture: {
        url: { type: String },
        publicId: { type: String }
    },
    addresses: [addressSchema], // Added addresses
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variant: { type: mongoose.Schema.Types.ObjectId }, // Reference variant if applicable
        quantity: { type: Number, required: true, default: 1 }
    }], // Enhanced cart structure
    purchasedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Keep this simple list or enhance like cart

    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);