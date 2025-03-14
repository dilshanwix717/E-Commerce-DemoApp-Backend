// UOM - Unit of Material
// This model is used to store the UOM details of the products.
// UOM is the unit of measurement for the product.
import mongoose from 'mongoose';
const { Schema } = mongoose;

const UOMSchema = new Schema({

    uomId: {
     type: String,
     required: true,
    },
    // Kg, Ltr, Mtr, etc.
    name: {
     type: String,
     required: true,
    },
    // Description of the UOM not required
    description: {
     type: String,
     required: false,
    },
    // Toggle to enable/disable the UOM
    toggle: {
        type: String,
        required: true,
    },
    // Created by userId ?
    createdBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

UOMSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastUOM = await mongoose.model('unitofmaterials').findOne().sort({ createdAt: -1 });
        const lastUOMID = lastUOM ? parseInt(lastUOM.uomId.split('-')[1]) : 0;
        this.uomId = `UOMId-${lastUOMID + 1}`;
    }
    next();
});

export default mongoose.model("unitofmaterials", UOMSchema);
