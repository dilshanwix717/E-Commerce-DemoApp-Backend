import Customer from '../models/customer.model.js';
import BillOfMaterials from '../models/bom.model.js';
import { createLog } from '../utils/logger.util.js';
import { io } from '../server.js'; // For real-time updates with socket.io
import crypto from 'crypto';

// Generate a random 8-digit alphanumeric code
const generateUniqueId = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// Create and save a new Customer
export const createCustomer = async (req, res, next) => {
    try {
        // Check for duplicate contact number
        const existingCustomer = await Customer.findOne({ contactNumber: req.body.contactNumber });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Contact number already exists' });
        }

        const customer = new Customer({
            contactNumber: req.body.contactNumber,
            customerId: "CustomerID-1",
            name: req.body.name,
            shopId: req.body.shopId,
            address: req.body.address,
            email: req.body.email,
            customerType: req.body.customerType,
            wallet: {
                walletId: generateUniqueId(),
                walletAmount: 0,
            },
            loyalty: {
                loyaltyId: generateUniqueId(),
                points: 0,
                totalPoints: 0,
            },
            createdBy: req.userId,
        });

        // Save the customer
        const savedCustomer = await customer.save();

        io.emit('customerCreated', savedCustomer);
        await createLog(req.companyId, req.shopId, req.userId, `Customer Created:`, savedCustomer.customerId);
        res.status(201).send(savedCustomer);

    } catch (error) {
        next(error);
    }
};

/*
// Create and save a new Customer
export const createCustomer = async (req, res, next) => {
    try {
        // Check for duplicate contact number
        const existingCustomer = await Customer.findOne({ contactNumber: req.body.contactNumber });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Contact number  already exists' });
        }
        console.log(req.userId)
        // Create a new customer
        const customer = new Customer({
            customerId: 'CustomerID-1', // default value no need to send this from the client
            contactNumber: req.body.contactNumber,
            name: req.body.name,
            shopId: req.body.shopId,
            address: req.body.address,
            email: req.body.email,
            customerType: req.body.customerType,
            loyaltyId: req.body.loyaltyId,
            walletId: req.body.walletId,
            createdBy: req.userId,
        });
        console.log(customer);
        // Save the customer
        const savedCustomer = await customer.save();

        io.emit('customerCreated', savedCustomer);
        await createLog(req.companyId, req.shopId, req.userId, `Customer Created:`, savedCustomer.customerId);
        res.status(201).send(savedCustomer);

    } catch (error) {
        next(error);
    }
};
*/
// Get all customers 
export const getAllCustomers = async (req, res, next) => {
    try {
        const customers = await Customer.find();
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a customer details by customerID 
export const getCustomerById = async (req, res, next) => {
    try {
        // Find the customer by customerId
        const customer = await Customer.findOne({ customerId: req.params.customerId });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.status(200).json(customer);
    } catch (error) {
        console.error(error);
        next(error);
    }
};


// Create and save a new Customer
export const updateCustomer = async (req, res, next) => {
    const { customerId, contactNumber, name, shopId, address, email, customerType, loyaltyId, walletId, createdBy } = req.body;
    const companyId = req.companyId;
    console.log(companyId)
    try {
        // Find the existing daily balance entry for the current date
        const customer = await Customer.findOne({ customerId });
        if (!customer) {
            return res.status(404).json({ message: "No customer found for the customerId." });
        }
        if (!customerId || !name || !contactNumber || !shopId || !customerType || !address || !email || !createdBy) {
            return res.status(400).json({ message: "All fields are required." });
        }
        // Update the customer details
        customer.contactNumber = contactNumber;
        customer.name = name;
        customer.address = address;
        customer.email = email;
        customer.customerType = customerType;
        //customer.loyaltyId = loyaltyId;
        //customer.walletId = walletId;

        // Save the updated customer
        const updatedCustomer = await customer.save();

        // Create a log entry
        await createLog(companyId, shopId, createdBy, `Updated customer entry: ${updatedCustomer.customerId}`);

        // Return the updated entry
        res.status(200).json(updatedCustomer);
    } catch (error) {
        next(error);
    }

};
