import Product from '../models/Product.js';
import firebaseStorage from '../utils/firebaseStorage.js';
import slugify from 'slugify';

// Helper function to generate a unique slug
const generateUniqueSlug = async (baseSlug) => {
    let slug = baseSlug;
    let counter = 1;

    while (await Product.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

// Helper function to generate a unique SKU
const generateUniqueSKU = async (color, size) => {
    let baseSKU = `${color}-${size}`.toUpperCase();
    let sku = baseSKU;
    let counter = 1;

    while (await Product.findOne({ "variants.sku": sku })) {
        sku = `${baseSKU}-${counter}`;
        counter++;
    }

    return sku;
};

export const createProduct = async (req, res) => {
    try {
        const {
            title,
            description,
            seoMetadata,
            categories,
            brand,
            price,
            discountedPrice,
            isUpcoming,
            variants,
            inventoryTracking,
            attributes,
            complianceInfo
        } = req.body;

        // Comprehensive validation
        if (!title || !description || !categories || !price) {
            return res.status(400).json({
                message: 'Required fields are missing',
                requiredFields: ['title', 'description', 'categories', 'price']
            });
        }

        // Image validation with more robust checks
        if (!req.files?.portrait || !req.files?.landscape) {
            return res.status(400).json({
                message: 'Both portrait and landscape images are required',
                imageRequirements: {
                    portrait: 'Required',
                    landscape: 'Required',
                    gallery: 'Optional'
                }
            });
        }

        // Parse and validate inputs
        const categoriesArray = Array.isArray(categories)
            ? categories
            : JSON.parse(categories);

        const variantsArray = variants
            ? (Array.isArray(variants) ? variants : JSON.parse(variants))
            : [];

        // Calculate total stock from variants
        const totalStock = variantsArray.reduce((sum, variant) => sum + (variant.stock || 0), 0);

        // Image uploads with error handling
        const uploadImage = async (file, type) => {
            try {
                return await firebaseStorage.uploadImage(
                    file,
                    'products',
                    `${Date.now()}_${type}`
                );
            } catch (error) {
                console.error(`Image upload error for ${type}:`, error);
                throw new Error(`Failed to upload ${type} image`);
            }
        };

        // Upload primary images
        const [portraitUpload, landscapeUpload] = await Promise.all([
            uploadImage(req.files.portrait[0], 'portrait'),
            uploadImage(req.files.landscape[0], 'landscape')
        ]);

        // Optional gallery uploads
        const galleryUploads = req.files.gallery
            ? await Promise.all(
                req.files.gallery.map((file, index) =>
                    uploadImage(file, `gallery_${index}`)
                )
            )
            : [];

        // Generate unique slug
        const baseSlug = slugify(title, { lower: true, strict: true });
        const slug = await generateUniqueSlug(baseSlug);

        // Find the last inserted product to generate a new productId
        const lastProduct = await Product.findOne().sort({ createdAt: -1 });
        const lastId = lastProduct && lastProduct.productId
            ? parseInt(lastProduct.productId.split('-')[1])
            : 0;
        const productId = `PROD-${lastId + 1}`;

        // Generate unique SKUs for each variant
        const updatedVariants = await Promise.all(
            variantsArray.map(async (variant) => {
                const { color, size } = variant;
                const sku = await generateUniqueSKU(color, size);
                return {
                    ...variant,
                    variantId: `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    sku
                };
            })
        );

        // Create new product with enhanced data
        const newProduct = new Product({
            productId, // Explicitly set productId
            slug, // Use the unique slug
            title,
            description,
            seoMetadata: seoMetadata ? JSON.parse(seoMetadata) : {},
            categories: categoriesArray,
            brand,
            price,
            discountedPrice,
            images: {
                portrait: {
                    url: portraitUpload.url,
                    publicId: portraitUpload.path,
                    alt: `${title} portrait image`
                },
                landscape: {
                    url: landscapeUpload.url,
                    publicId: landscapeUpload.path,
                    alt: `${title} landscape image`
                },
                gallery: galleryUploads.map(upload => ({
                    url: upload.url,
                    publicId: upload.path,
                    alt: `${title} gallery image`
                }))
            },
            inventoryTracking: {
                totalStock,
                lowStockThreshold: inventoryTracking?.lowStockThreshold || 10
            },
            isUpcoming: isUpcoming || false,
            variants: updatedVariants,
            attributes: attributes ? JSON.parse(attributes) : {},
            complianceInfo: complianceInfo ? JSON.parse(complianceInfo) : {}
        });

        // Save and respond
        await newProduct.save();
        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });
    } catch (error) {
        console.error('Product Creation Error:', error);
        res.status(500).json({
            message: 'Failed to create product',
            error: error.message || 'An unexpected error occurred',
            debugInfo: error.stack
        });
    }
};


export const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const {
            title,
            description,
            categories,
            brand,
            price,
            discountedPrice,
            isUpcoming,
            variants,
            inventoryCount,
            isActive,
            attributes
        } = req.body;

        // Find the product
        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate required fields
        if (!title || !description || !categories || !price) {
            return res.status(400).json({ message: 'Required fields are missing' });
        }

        // Parse JSON fields if they're strings
        const categoriesArray = typeof categories === 'string'
            ? JSON.parse(categories)
            : categories;

        const variantsArray = variants && typeof variants === 'string'
            ? JSON.parse(variants)
            : variants || [];

        // Handle image uploads
        if (req.files?.portrait) {
            // Delete existing portrait image if it exists
            if (product.images.portrait.publicId) {
                await firebaseStorage.deleteImage(product.images.portrait.publicId);
            }

            // Upload new portrait image
            const portraitUpload = await firebaseStorage.uploadImage(
                req.files.portrait[0],
                'products',
                `${Date.now()}_portrait`
            );

            product.images.portrait = {
                url: portraitUpload.url,
                publicId: portraitUpload.path
            };
        }

        if (req.files?.landscape) {
            // Delete existing landscape image if it exists
            if (product.images.landscape.publicId) {
                await firebaseStorage.deleteImage(product.images.landscape.publicId);
            }

            // Upload new landscape image
            const landscapeUpload = await firebaseStorage.uploadImage(
                req.files.landscape[0],
                'products',
                `${Date.now()}_landscape`
            );

            product.images.landscape = {
                url: landscapeUpload.url,
                publicId: landscapeUpload.path
            };
        }

        // Handle gallery images
        if (req.files?.gallery) {
            // Delete existing gallery images
            if (product.images.gallery && product.images.gallery.length > 0) {
                await Promise.all(
                    product.images.gallery.map(img =>
                        firebaseStorage.deleteImage(img.publicId)
                    )
                );
            }

            // Upload new gallery images
            const galleryUploads = await Promise.all(
                req.files.gallery.map(async (file, index) => {
                    const upload = await firebaseStorage.uploadImage(
                        file,
                        'products',
                        `${Date.now()}_gallery_${index}`
                    );
                    return {
                        url: upload.url,
                        publicId: upload.path
                    };
                })
            );

            product.images.gallery = galleryUploads;
        }

        // Update other product fields
        product.title = title;
        product.description = description;
        product.categories = categoriesArray;
        product.brand = brand;
        product.price = price;
        product.discountedPrice = discountedPrice;
        product.isUpcoming = isUpcoming !== undefined ? isUpcoming : product.isUpcoming;
        product.isActive = isActive !== undefined ? isActive : product.isActive;

        // Update variants
        product.variants = variantsArray.map(variant => ({
            ...variant,
            variantId: variant.variantId || `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }));

        product.inventoryCount = inventoryCount || 0;
        product.attributes = attributes ? JSON.parse(attributes) : {};

        // Save updated product
        await product.save();
        res.status(200).json(product);
    } catch (error) {
        console.error('Product Update Error:', error);
        res.status(500).json({
            message: 'Failed to update product',
            error: error.message
        });
    }
};

export const toggleProductStatus = async (req, res) => {
    const { productId } = req.params; // Extract productId from request parameters

    try {
        // Find the product by productId
        const product = await Product.findOne({ productId });

        // If product not found, return a 404 error
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Toggle the isActive status
        product.isActive = !product.isActive;

        // Save the updated product
        await product.save();

        // Return the updated product
        return res.status(200).json({ message: 'Product status updated successfully', product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};


export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getActiveProducts = async (req, res) => {
    try {
        const activeProducts = await Product.find({ isActive: true }); // Fetch products where isActive is true
        res.status(200).json(activeProducts);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};


export const getProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.id }); // Query by productId
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error('Error fetching product:', error); // Log the error for debugging
        res.status(500).json({ message: 'Something went wrong' });
    }
};


export const getProductPurchaseCounts = async (req, res) => {

    try {
        const purchaseCounts = await Payment.aggregate([
            // Unwind the product array to get individual product references
            { $unwind: "$product" },
            // Only count completed payments
            { $match: { status: "completed" } },
            // Group by product and count occurrences
            {
                $group: {
                    _id: "$product",
                    count: { $sum: 1 }
                }
            },
            // Lookup product details to get productId
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            // Unwind product details
            { $unwind: "$productDetails" },
            // Project final format
            {
                $project: {
                    _id: 0,
                    productId: "$productDetails.productId",
                    count: 1
                }
            }
        ]);

        // Convert array to object with productId as key
        const countsObject = purchaseCounts.reduce((acc, curr) => {
            acc[curr.productId] = curr.count;
            return acc;
        }, {});

        res.status(200).json(countsObject);
    } catch (error) {
        console.error('Error getting product purchase counts:', error);
        res.status(500).json({ message: 'Failed to get purchase counts' });
    }
};


export const getProductsByGenre = async (req, res) => {
    try {
        const products = await Product.find({ genres: req.params.genre });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};

export const getUpcomingProducts = async (req, res) => {
    try {
        const products = await Product.find({ isUpcoming: true });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
};


