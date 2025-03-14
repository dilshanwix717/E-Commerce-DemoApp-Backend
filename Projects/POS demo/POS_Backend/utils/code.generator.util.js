import CodeGenerator from "../models/code.generator.model.js";
import { createLog } from "../utils/logger.util.js";

// Function to generate a new code number
// This function takes four parameters: companyId, shopId, createdBy, and description
async function generateNewCodeNumber(companyId, shopId, createdBy, description) {
    try {
        // Extract the prefix from the description as the prefix
        const prefix = description.split('-')[0];

        // Find the last entry with the same companyId, shopId, and description prefix
        const lastEntry = await CodeGenerator.findOne({ companyId, shopId, code_number: { $regex: `^${prefix}-` } })
                                             .sort({ createdAt: -1 })
                                             .exec();

        // Extract the numeric part from the last code number
        const lastCodeNumber = lastEntry ? parseInt(lastEntry.code_number.split('-')[1]) : 0;

        // Generate the new code number
        const newCodeNumber = `${prefix}-${lastCodeNumber + 1}`;

        // Create a new CodeGenerator document
        const newCodeGenerator = new CodeGenerator({
            codegenId: "ID-1",
            companyId,
            shopId,
            createdBy,
            code_number: newCodeNumber,
            description: description, // GRN type
        });

        // Save the new document
        const savedCodeGenerator = await newCodeGenerator.save();

        // Create a log entry
        createLog(companyId, shopId, createdBy, `New code number generated: ${newCodeNumber}`);

        // Return the saved document
        return savedCodeGenerator;
    } catch (error) {
        throw new Error(`Error generating new code number: ${error.message}`);
    }
}

// Export the function to be used in other files
export { generateNewCodeNumber };


////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
import CodeGenerator from "../models/code_generator.model.js";
import { createLog } from "../utils/logger.util.js";

// Function to generate a new code number
// This function takes five parameters: companyId, shopId, createdBy, codepretext, and description
function generateNewCodeNumber(companyId, shopId, createdBy, codepretext, description = "") {
    // Find the last entry with the same companyId, shopId, and codepretext
    CodeGenerator.findOne({ companyId, shopId, codepretext })
                    .sort({ createdAt: -1 })
                    .then((lastEntry) => {
                        // Extract the numeric part from the last code number
                        const lastCodeNumber = lastEntry ? parseInt(lastEntry.code_number.split('-')[1]) : 0;
                        // Generate the new code number
                        const newCodeNumber = `${codepretext}-${lastCodeNumber + 1}`;
                        // Create a new CodeGenerator document
                        const newCodeGenerator = new CodeGenerator({
                            companyId,
                            shopId,
                            createdBy,
                            codepretext,
                            code_number: newCodeNumber,
                            description: description || newCodeNumber, //GRN type
                        });
                        // Save the new document
                        newCodeGenerator.save()
                                        .then((savedCodeGenerator) => {
                                            // Create a log entry
                                            createLog(companyId, shopId, createdBy, `New code number generated: ${newCodeNumber}`);
                                            // Return the saved document
                                            return savedCodeGenerator;
                                        })
                                        .catch((error) => {
                                            throw new Error(`Error generating new code number: ${error.message}`);
                                        });
                    })
                    .catch((error) => {
                        throw new Error(`Error generating new code number: ${error.message}`);
                    });
}
// Export the function to be used in other files
export { generateNewCodeNumber };
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
export const generateNewCodeNumber = async (companyId, shopId, createdBy, codepretext, description = "") => {
    try {
        // Find the last entry with the same companyId, shopId, and codepretext
        const lastEntry = await CodeGenerator.findOne({ companyId, shopId, codepretext })
                                             .sort({ createdAt: -1 });

        // Extract the numeric part from the last code number
        const lastCodeNumber = lastEntry ? parseInt(lastEntry.code_number.split('-')[1]) : 0;

        // Generate the new code number
        const newCodeNumber = `${codepretext}-${lastCodeNumber + 1}`;

        // Create a new CodeGenerator document
        const newCodeGenerator = new CodeGenerator({
            companyId,
            shopId,
            createdBy,
            codepretext,
            code_number: newCodeNumber,
            description: description || newCodeNumber, //GRN type
        });

        // Save the new document
        const savedCodeGenerator = await newCodeGenerator.save();

        // Create a log entry
        await createLog(companyId, shopId, createdBy, `New code number generated: ${newCodeNumber}`);

        // Return the saved document
        return savedCodeGenerator;
    } catch (error) {
        throw new Error(`Error generating new code number: ${error.message}`);
    }
};
*/