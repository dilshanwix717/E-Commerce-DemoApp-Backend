import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const productSchema = new Schema({
    productId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    seoMetadata: {
        metaTitle: { type: String, max: 60 },
        metaDescription: { type: String, max: 160 },
        keywords: [{ type: String }]
    },
    categories: [{ type: String, required: true }],
    brand: { type: String },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: {
        type: Number,
        validate: {
            validator: function (v) {
                return v === undefined || v < this.price;
            },
            message: 'Discounted price must be less than original price'
        }
    },
    images: {
        portrait: { url: { type: String, required: true }, publicId: { type: String, required: true }, alt: { type: String } },
        landscape: { url: { type: String }, publicId: { type: String }, alt: { type: String } },
        gallery: [{ url: { type: String }, publicId: { type: String }, alt: { type: String } }]
    },
    inventoryTracking: {
        totalStock: { type: Number, default: 0, min: 0 },
        lowStockThreshold: { type: Number, default: 10 },
        status: {
            type: String,
            enum: ['In Stock', 'Low Stock', 'Out of Stock'],
            default: 'In Stock'
        }
    },
    isActive: { type: Boolean, default: true },
    isUpcoming: { type: Boolean, default: false },
    variants: [{
        variantId: { type: String, unique: true },
        color: { type: String, required: true },
        size: { type: String, required: true },
        sku: { type: String, required: true, unique: true },
        price: { type: Number },
        stock: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: 'Stock must be an integer'
            }
        }
    }],
    ratings: { average: { type: Number, default: 0, min: 0, max: 5 }, totalReviews: { type: Number, default: 0, min: 0 } },
    attributes: { type: Schema.Types.Mixed },
    complianceInfo: {
        warrantyPeriod: { type: Number },
        returnable: { type: Boolean, default: true },
        returnPeriod: { type: Number, default: 30 }
    }
}, { timestamps: true });

// Pre-save middleware to update inventory status
productSchema.pre('save', function (next) {
    if (this.inventoryTracking.totalStock === 0) {
        this.inventoryTracking.status = 'Out of Stock';
    } else if (this.inventoryTracking.totalStock <= this.inventoryTracking.lowStockThreshold) {
        this.inventoryTracking.status = 'Low Stock';
    } else {
        this.inventoryTracking.status = 'In Stock';
    }
    next();
});

export default mongoose.model('Product', productSchema);
