import mongoose from 'mongoose';
const { Schema } = mongoose;

// Inventory Model
const InventorySchema = new Schema({
    inventoryId: { type: String, required: true, unique: true }, // Inventory ID
    categoryId: { type: String, required: true }, // Category of the product
    productId: { type: String, required: true }, // Related product ID
    companyId: { type: String, required: true }, // Related company ID
    shopId: { type: String, required: true }, // Related shop ID
    supplierId: { type: Array, required: false }, // Supplier IDs
    lastPurchaseCost: { type: String, required: true }, // Last purchase cost
    totalQuantity: { type: Number, required: true }, // Total quantity
    weightedAverageCost: { type: String, required: false }, // Weighted average cost
    minimumQuantity: { type: Number, required: true }, // Minimum quantity
    toggle: { type: String, required: true }, // Enable/Disable
    createdBy: { type: String, required: true }, // Created by user ID
}, { timestamps: true });

InventorySchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastInventory = await mongoose.model('Inventory_Stock').findOne().sort({ createdAt: -1 });
        const lastInventoryID = lastInventory ? parseInt(lastInventory.inventoryId.split('-')[1]) : 0;
        this.inventoryId = `InventoryID-${lastInventoryID + 1}`;
    }
    next();
});

export default mongoose.model("Inventory_Stock", InventorySchema);
