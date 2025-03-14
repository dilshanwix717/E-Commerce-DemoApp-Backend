import mongoose from 'mongoose';
const { Schema } = mongoose;

const LogSchema = new Schema({
    
    logId: {
        type: String,
        required: true,
        unique: true,
    },
    companyId: {
        type: String,
        required: true,
    },
    shopId: {
        type: String,
        required: false,
    },
    createdBy: {
        type: String,
        required: true,
    },
    updatedDocument: {
        type: String,
        required: true,
    },

}, {
    timestamps: true
});

// Pre-save hook to auto-generate the deviceId
LogSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastLog = await mongoose.model('Log').findOne().sort({ createdAt: -1 });
        const lastLogID = lastLog ? parseInt(lastLog.logId.split('-')[1]) : 0;
        this.logId = `logId-${lastLogID + 1}`;
    }
    next();
});

export default mongoose.model("Log", LogSchema);
