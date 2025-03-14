import Log from "../models/log.model.js";
import { io } from '../server.js'; // For real-time updates with socket.io

// Create new log entry which is used to track the changes made by the Admins and Cashiers
export const createLog = async (companyId, shopId, createdBy, updatedDocument) => {
    try {
        /*
        // Find the last log entry
        const lastLog = await Log.findOne().sort({ createdAt: -1 });

        // Generate the new logId
        const lastLogID = lastLog ? parseInt(lastLog.logId.split('-')[1]) : 0;
        const newLogId = `logId-${lastLogID + 1}`;
        */
        // Create a new log entry
        const newLog = new Log({
            logId: "logId-1", // create a new logId using the presave hook in the model
            companyId: companyId,
            shopId: shopId,
            createdBy: createdBy,
            updatedDocument: updatedDocument,
        });

        // Save the new log entry
        await newLog.save();
        io.emit('logCreated', newLog);
    } catch (error) {
        console.error(`Error creating log entry: ${error.message}`);
        console.log("Error creating log entry: ", error);

    }
};

// create a new log entry which is used to track the changes made by the super admin
export const createLogEntry = async (companyId, createdBy, updatedDocument) => {
    try {
        // Find the last log entry
        const lastLog = await Log.findOne().sort({ createdAt: -1 });

        // Generate the new logId
        const lastLogID = lastLog ? parseInt(lastLog.logId.split('-')[1]) : 0;
        const newLogId = `logId-${lastLogID + 1}`;

        // Create a new log entry
        const newLog = new Log({
            logId: newLogId,
            companyId: companyId,
            createdBy: createdBy,
            updatedDocument: updatedDocument,
        });

        // Save the new log entry
        await newLog.save();
        io.emit('logCreated', newLog);
    } catch (error) {
        console.error(`Error creating log entry: ${error.message}`);
    }
};