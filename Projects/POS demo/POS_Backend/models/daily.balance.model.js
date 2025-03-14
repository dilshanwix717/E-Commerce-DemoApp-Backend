import mongoose from 'mongoose';
const { Schema } = mongoose;

const DailyBalance = new Schema({
    
    dailyId: {
        type: String,
        required: false,
        unique: true,
    },
    // Current Day
    date: {
        type: String,
        required: true,
    },
    // Day start time
    dayStart: {
        type: String,
        required: true,
    },
    //day end time
    dayEnd: {
        type: String,
        required: false,
    },
    // Opening amount in the cash
    startAmount: {
        type: String,
        required: true,
    },
    // Closing amount in the cash
    closeAmount: {
        type: String,
        required: false,
    },
    // any additional remarks/ details
    remarks: {
        type: String,
        required: false,
    },
    // Company ID
    companyId: {
        type: String,
        required: true,
    },
    // Shop ID
    shopId: {
        type: String,
        required: true,
    },
    // User who created the daily balance (logged in user)
    createdBy: {
        type: String,
        required: true,
    },

}, {
    timestamps: true
});

DailyBalance.pre('save', async function(next) {
    if (this.isNew) {
        const lastDailyBalance = await mongoose.model('daily_balance').findOne().sort({ createdAt: -1 });
        const lastDailyBalanceID = lastDailyBalance ? parseInt(lastDailyBalance.dailyId.split('-')[1]) : 0;
        this.dailyId = `Id-${lastDailyBalanceID + 1}`;
    }
    next();
});

export default mongoose.model("daily_balance", DailyBalance);
