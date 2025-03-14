
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Product Model
const ProductSchema = new Schema({
  productId: { type: String, required: false }, // Product ID
  pluCode: { type: String, required: true, unique: true }, // Barcode
  companyId: { type: String, required: true }, // Company ID
  name: { type: String, required: true }, // Product Name
  productType: { type: String, required: true }, // Product Type
  uomId: { type: String, required: false }, // Unit of Material
  size: { type: String, required: false }, // Size
  activeShopIds: { type: Array, required: true }, // Active shops
  toggle: { type: String, required: true }, // Enable/Disable
  createdBy: { type: String, required: true }, // Created by user
  categoryId: { type: String, required: true }, // Category ID
  minQty: { type: Number, required: true }, // Minimum quantity
  deviceLocation: { type: String, required: false }, // Printer location
  bomId: { type: String, required: false }, // BOM ID
  
  // New fields
  requiresGRN: { type: Boolean, default: false }, // Whether product needs GRN tracking
  hasRawMaterials: { type: Boolean, default: false }, // Whether product has associated raw materials
}, { timestamps: true });

ProductSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastProduct = await mongoose.model('Product').findOne().sort({ createdAt: -1 });
    this.productId = `ProductID-${(lastProduct ? parseInt(lastProduct.productId.split('-')[1]) : 0) + 1}`;
  }
  next();
});

export default mongoose.model('Product', ProductSchema);


// const ProductSchema = new Schema({

//     productId: {
//      type: String,
//      required: false,
//     },
//     // Barcode of the product || Price Look Up Code
//     pluCode: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     companyId: {
//       type: String,
//       required: true,
//     },
//     // Name of the product
//     name: {
//      type: String,
//      required: true,
//     },
//     // WIP (work in progress)/Finished Goods/ Raw Material
//     productType: {
//      type: String,
//      required: true,
//     },
    
//     // Unit of materialId (uomId related to measurement)
//     uomId: {
//      type: String,
//      required: false,
//     },
    
//     // Small/ Medium/ Large
//     size: {
//      type: String,
//      required: false,
//     },
//     activeShopIds: {
//      type: Array,
//      required: true,
//     },
//     // Enable/ Disable the product
//     toggle: { 
//      type: String,
//      required: true,
//     },
//     // Created by the user? userId
//     createdBy: {
//      type: String,
//      required: true,
//     },
//     // category ID
//     categoryId: {
//         type: String,
//         required: true,
//     },
//     // minimum Quantity of the product
//     minQty: {
//         type: Number,
//         required: true,
//     },
//     // deviceLocation of the printer Ex: Hot Kitchen, Cold Kitchen
//     deviceLocation: {
//         type: String,
//         required: false,
//     },
//     // bomId
//     bomId: {
//         type: String,
//         required: false,
//     },
// }, {
//     timestamps: true
// });

// ProductSchema.pre('save', async function(next) {
//     if (this.isNew) {
//         const lastProduct = await mongoose.model('Product').findOne().sort({ createdAt: -1 });
//         const lastProductID = lastProduct ? parseInt(lastProduct.productId.split('-')[1]) : 0;
//         this.productId = `ProductID-${lastProductID + 1}`;
//     }
//     next();
// });

// export default mongoose.model("Product", ProductSchema);


