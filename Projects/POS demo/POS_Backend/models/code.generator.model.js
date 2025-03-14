import mongoose from 'mongoose';
const { Schema } = mongoose;

const Code_GeneratorSchema = new Schema({
    
    codegenId: {
        type: String,
        required: true,
        unique: true,
    },
    companyId: {
        type: String,
        required: true,
    },
    // Shop ID where the code number is generated
    shopId: {
        type: String,
        required: true,
    },
    /*
    // Default code pretext
    codepretext: {
        type: String,
        required: true,
    },
    */
    // Description of the code pretext that need to be generated
    description: {
        type: String,
        required: true,
    },
    // Generated Code number
    code_number: {
        type: String,
        required: true,
    },
    // Who generated the code number (loged in user)
    createdBy: {
        type: String,
        required: true,
    },

}, {
    timestamps: true
});

// Pre-save hook to auto-generate the deviceId
Code_GeneratorSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastCodeGen = await mongoose.model('Code_Generator').findOne().sort({ createdAt: -1 });
        const lastCodeGenID = lastCodeGen ? parseInt(lastCodeGen.codegenId.split('-')[1]) : 0;
        this.codegenId = `ID-${lastCodeGenID + 1}`;
    }
    next();
});

export default mongoose.model("Code_Generator", Code_GeneratorSchema);
