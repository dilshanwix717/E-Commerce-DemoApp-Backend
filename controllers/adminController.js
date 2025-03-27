import Product from '../models/Product.js';
import User from '../models/User.js';


export const createProduct = async (req, res) => {
    try {
        const { title, year, genres, description, language, videoLink, trailerLink, price } = req.body;
        const product = new Product({
            title,
            year,
            genres,
            description,
            language,
            videoLink,
            trailerLink,
            price
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        // Retrieve users and populate the 'purchasedProducts' with product data
        const users = await User.find()
            .select('-password') // Exclude passwords
            .populate('purchasedProducts', 'productId title'); // Populate 'productId' and 'title' of purchased products

        // Map the purchasedProducts to show productId and title instead of the whole product object
        const result = users.map((user) => {
            return {
                ...user.toObject(), // Convert the mongoose document to plain object
                purchasedProducts: user.purchasedProducts.map((product) => ({
                    productId: product.productId,
                    title: product.title
                }))
            };
        });

        res.status(200).json(result); // Send back the transformed data
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};


export const getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true }).select('-password'); // Exclude passwords
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getAllNonAdmins = async (req, res) => {
    try {
        const nonAdmins = await User.find({ isAdmin: false }).select('-password'); // Exclude passwords
        res.status(200).json(nonAdmins);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

