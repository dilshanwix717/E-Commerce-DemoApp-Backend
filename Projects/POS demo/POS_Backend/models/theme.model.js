import mongoose from "mongoose";
const { Schema } = mongoose;

const ThemeSchema = new Schema({
    
        themeId: {
            type: String,
            required: true,
        },
        // Company ID of the company that the theme belongs to
        companyID: {
            type: String,
            required: true,
        },
        // Primary color of the theme
        primaryColor: {
            type: String,
            required: true,
        },
        // Secondary color of the theme
        secondaryColor: {
            type: String,
            required: true,
        },
        // Font color of the theme
        fontColor: {
            type: String,
            required: true,
        },
        /*
        // To enable this, we need cloud storage like google drive to be set up first.
        // logo png file
        logoPath: {
            type: String,
            required: true,
        },
        */
        // Created by userId ?
        createdBy: {
            type: String,
            required: true
        }
    }, {
        timestamps: true
    });

ThemeSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastTheme = await mongoose.model('themes').findOne().sort({ createdAt: -1 });
        const lastThemeID = lastTheme ? parseInt(lastTheme.themeId.split('-')[1]) : 0;
        this.themeId = `ThemeId-${lastThemeID + 1}`;
    }
    next();
});

export default mongoose.model("themes", ThemeSchema);