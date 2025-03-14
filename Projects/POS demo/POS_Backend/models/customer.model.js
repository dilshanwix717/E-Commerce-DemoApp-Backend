import mongoose from 'mongoose';
const { Schema } = mongoose;

const WalletSchema = new Schema({
    walletId: {
        type: String,
        required: true,
        unique: true,
    },
    walletIn: {
        type: Number,
        default: 0,
    },
    walletOut: {
        type: Number,
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    walletAmount: {
        type: Number,
        default: 0,
    },
}, { _id: false }); // Avoid creating an _id field for each subdocument

const LoyaltySchema = new Schema({
    loyaltyId: {
        type: String,
        required: true,
        unique: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    points: {
        type: Number,
        default: 0,
    },
    totalPoints: {
        type: Number,
        default: 0,
    },
}, { _id: false }); // Avoid creating an _id field for each subdocument

const CustomerSchema = new Schema({
    customerId: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    shopId: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    customerType: {
        type: String,
        required: true,
    },
    wallet: WalletSchema,
    loyalty: LoyaltySchema,
    createdBy: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

// Middleware to generate customerId, walletId, and loyaltyId
CustomerSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastCustomer = await mongoose.model('Customer').findOne().sort({ createdAt: -1 });
        const lastCustomerID = lastCustomer ? parseInt(lastCustomer.customerId.split('-')[1]) : 0;
        this.customerId = `CustomerID-${lastCustomerID + 1}`;
        this.wallet.walletId = `WALLET-${Math.floor(10000000 + Math.random() * 90000000)}`; // Generate 8-digit code
        this.loyalty.loyaltyId = `LOYALTY-${Math.floor(10000000 + Math.random() * 90000000)}`; // Generate 8-digit code
    }
    next();
});

export default mongoose.model("Customer", CustomerSchema);

/*
import mongoose from 'mongoose';
const { Schema } = mongoose;

const CustomerSchema = new Schema({

    customerId: {
        type: String,
        required: true,
    },

    //Contact number
    contactNumber: {
        type: String,
        required: true,
        unique: true,
    },

    // Name of the customer
    name: {
        type: String,
        required: true,
    },

    shopId: {
        type: String,
        required: true,
    },

    address: {
        type: String,
        required: false,
    },

    email: {
        type: String,
        required: false,
    },

    // regular / walk-in
    customerType: {
        type: String,
        required: true,
    },

    loyaltyId: {
        type: String,
        required: false,
    },

    walletId: {
        type: String,
        required: false,
    },

    //not null
    createdBy: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

CustomerSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastCustomer = await mongoose.model('Customer').findOne().sort({ createdAt: -1 });
        const lastCustomerID = lastCustomer ? parseInt(lastCustomer.customerId.split('-')[1]) : 0;
        this.customerId = `CustomerID-${lastCustomerID + 1}`;
    }
    next();
});

export default mongoose.model("Customer", CustomerSchema);
*/