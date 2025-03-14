import mongoose from "mongoose";
const { Schema } = mongoose;

const ItemSchema = new Schema({
  productId: { type: String, required: true, ref: 'Product' },
  qty: { type: Number, required: true, min: 0 },
  currentWAC: { type: Number, required: true, min: 0 }
});

const BillOfMaterialsSchema = new Schema({
  bomId: { type: String, required: true, unique: true },
  finishedGoodId: { type: String, required: true, ref: 'Product' },
  items: { type: [ItemSchema], validate: [v => v.length <= 100, 'Max 100 items allowed'] },
  createdBy: { type: String, required: true, ref: 'User' }
}, { timestamps: true });

BillOfMaterialsSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastBOM = await mongoose.model('BillOfMaterials').findOne().sort({ createdAt: -1 });
    this.bomId = `BOMID-${lastBOM ? parseInt(lastBOM.bomId.split('-')[1]) + 1 : 1}`;
  }
  next();
});

export default mongoose.model('BillOfMaterials', BillOfMaterialsSchema);
