import mongoose from 'mongoose';
const { Schema } = mongoose;

const DeviceSchema = new Schema({

    deviceId: {
        type: String,
        required: true,
        unique: true,
    },
    // After selecting the company (or take it from the token and send it.)
    companyId: {
        type: String,
        required: true,
    },
    // After selecting the shopname
    shopId: {
        type: String,
        required: true,
    },
    // Printer or Scanner or POS
    deviceType: {
        type: String,
        required: true,
    },
    // Epson or HP or Canon
    deviceName: {
        type: String,
        required: true,
    },
    // Hot Kitchen or Cold Kitchen or Bar
    deviceLocation: {
        type: String,
        required: true,
    },
    // IP address of the device
    deviceIPaddress: {
        type: String,
        required: false,
    },
    // Port number of the device
    PORT: {
        type: String,
        required: true,
    }

}, {
    timestamps: true
});

// Pre-save hook to auto-generate the deviceId
DeviceSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastDevice = await mongoose.model('Device').findOne().sort({ createdAt: -1 });
        const lastDeviceId = lastDevice ? parseInt(lastDevice.deviceId.split('-')[1]) : 0;
        this.deviceId = `DEVICE-${lastDeviceId + 1}`;
    }
    next();
});

export default mongoose.model("Device", DeviceSchema);
