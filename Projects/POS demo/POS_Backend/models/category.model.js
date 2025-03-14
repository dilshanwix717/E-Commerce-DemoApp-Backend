import mongoose from 'mongoose';
const { Schema } = mongoose;

const CategorySchema = new Schema({
    // Category ID no need to send from the client side
    categoryId: {
     type: String,
     required: true,
    },
    // Category Name Ex: Kottu would be a category name and products under this category 
    // would be cheese Kottu, Chicken Kottu, etc.
    categoryName: {
     type: String,
     required: true,
    },
    // Details about the category
    details: {
     type: String,
     required: false,
    },
    // Company ID where the category is created
    companyId: {
        type: String,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    // to enable disable the category
    toggle: {
        type: String,
        required: false,
        default: 'disable',
    }
}, {
    timestamps: true
});

// Pre-save hook to auto-generate the catergoryId
CategorySchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastCategory = await mongoose.model('Category').findOne().sort({ createdAt: -1 });
        const lastCategoryID = lastCategory ? parseInt(lastCategory.categoryId.split('-')[1]) : 0;
        this.categoryId = `CategoryID-${lastCategoryID + 1}`;
    }
    next();
});

export default mongoose.model("Category", CategorySchema);
