import mongoose from 'mongoose';
const { Schema } = mongoose;

const CompanySchema = new Schema({
    // Company ID no need to send from the client side
    companyId: {
        type: String,
        required: true,
        unique: true,
    },
    // Company Name
    companyName: {
        type: String,
        required: true,
    },
    // Company Email
    email: {
        type: String,
        required: true,
    },
    // Company Contact Number
    contactNo: {
        type: String,
        required: true,
    },
    // Company Address
    address: {
        type: String,
        required: true,
    },
    // All the shop IDs that are under this company
    shopIds: {
        type: [String],
        required: true,
    },
    vatNo: {
        type: String,
        required: false,
    },
    // to enable disable the company
    toggle: {
        type: String,
        default: "enable",
    }, 
    // Created by user ID
    createdBy: {
        type: String,
        required: false,
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate the companyId
CompanySchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastCompany = await mongoose.model('Company').findOne().sort({ createdAt: -1 });
        // get the last company ID and increment it by 1 if there is no company ID then set lastCompanyID to 0 and increment it by 1
        const lastCompanyID = lastCompany ? parseInt(lastCompany.companyId.split('-')[1]) : 0;
        this.companyId = `CompanyID-${lastCompanyID + 1}`;
    }
    next();
});

export default mongoose.model("Company", CompanySchema);