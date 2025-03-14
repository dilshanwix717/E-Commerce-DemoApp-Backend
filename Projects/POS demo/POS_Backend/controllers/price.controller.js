import Price from '../models/price.model.js';
import { createLog } from '../utils/logger.util.js';
import Product from '../models/product.model.js';
import SellingType from '../models/sellingtype.model.js';
import Device from '../models/device.model.js';
import Inventory from '../models/inventory.stock.model.js';
import BOM from '../models/bom.model.js';

// Validate additionDeduction: should match patterns like +100, -100, +10%, -10%
function validateDiscountsAndCommision(value) {
    const regex = /^(\+|-)\d+(\.\d+)?%?$/;
    return regex.test(value);
}

// Create and save a new Price for a product by shopId
export const createPrice = async (req, res, next) => {
    const { companyId, shopId, categoryId, productId, customerId, discount, discountDateRange, sellingTypeId, /*sellingTypeCommission,*/ sellingPrice } = req.body;
    let { sellingTypeCommission } = req.body;
    //console.log('req.body:', req.body);
    // Required fields validation
    if (!companyId || !shopId || !productId || !sellingPrice) {
      return res.status(400).json({ message: "Required fields are missing." });
    }
    // assign values to the dicount and sellingTypeCommission if they are not provided
    sellingTypeCommission = sellingTypeCommission || '+0.00';
    // Validate discount and commission
    if (!validateDiscountsAndCommision(sellingTypeCommission)) {
        return res.status(400).json({ message: "Invalid discount or commission format. (Ex: +10.00, 10%, -500.00)" });
    }
    
    try {
      // Check for duplicate price
      await checkExistingPrice(companyId, shopId, categoryId, productId, sellingTypeId, customerId);
      // Create a new price
      const price = new Price({
        priceId: 'PriceID-1', // default value no need to send this from the client
        companyId,
        shopId,
        categoryId,
        productId,
        createdBy: req.userId,
        customerId,
        discount,
        discountDateRange,
        sellingTypeId,
        sellingTypeCommission,
        sellingPrice,
      });
  
      // Save the price
      const savedPrice = await price.save();
      await createLog(companyId, shopId, req.userId, 
        `Created Price entry for ProductID: ${savedPrice.productId} in ShopID: ${savedPrice.shopId} with PriceID: ${savedPrice.priceId}`);
      
      return res.status(201).json(savedPrice);
    } catch (error) {
      //console.error('Error creating Price:', error);
      //return res.status(500).json({ message: 'Error creating Price' });
      next(error);
    }
  };
  
  // Check for existing price in the same company and shop
  async function checkExistingPrice(companyId, shopId, categoryId, productId, sellingTypeId, customerId) {
    try {
      const existingPrice = await Price.findOne({ companyId, shopId, categoryId, productId, sellingTypeId, customerId });
      if (existingPrice) {
        throw new Error('Price already exists in the same company and shop.');
      }
    } catch (error) {
      throw error;
    }
  }

// Update a Price by the priceId
export const updatePrice = async (req, res, next) => {
    const { companyId, shopId, categoryId, productId, customerId, sellingTypeId } = req.body;
    let { sellingTypeCommission } = req.body;
    const priceId = req.params.priceId;
    const userId = req.userId;

    // Required fields validation
    if (!companyId || !shopId || !productId) {
        return res.status(400).json({ message: "Required fields are missing." });
    }
    // assign values to the dicount and sellingTypeCommission if they are not provided
    sellingTypeCommission = sellingTypeCommission || '+0.00';
    // Validate discount and commission
    if (!validateDiscountsAndCommision(sellingTypeCommission)) {
        return res.status(400).json({ message: "Invalid discount or commission format. (Ex: +10.00, 10%, -500.00)" });
    }
    try {
        // Combined check for potential duplicates for both shop and customer, excluding the current price being updated
        const duplicatePrice = await Price.findOne({
            companyId,
            shopId,
            categoryId,
            productId,
            sellingTypeId,
            $or: [
                { customerId }, // Check for customer-specific price
                { customerId: null } // Check for shop-specific price
            ],
            priceId: { $ne: priceId } // Exclude the current price by priceId
        });

        if (duplicatePrice) {
            return res.status(400).json({ message: "A price with the same parameters already exists." });
        }

        // Find and update the price
        const updatedPrice = await Price.findOneAndUpdate(
            { priceId: priceId },
            req.body,
            { new: true }
        );

        // If no price found to update, return an error
        if (!updatedPrice) {
            return res.status(404).json({ message: "Price not found." });
        }

        await createLog(req.body.companyId, req.body.shopId, userId, `Updated Price entry for PriceID: ${priceId}`);

        return res.status(200).json(updatedPrice);
    } catch (error) {
        console.error('Error updating Price:', error);
        return res.status(500).json({ message: 'Error updating Price' });
    }
};


/*
export const updatePrice = async (req, res, next) => {
    try {

        // Find and update the price
        const updatedPrice = await Price.findOneAndUpdate({ priceId: req.params.priceId }, req.body, { new: true });
        await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Updated Price entry for PriceID: ${req.params.priceId}`);
        return res.status(200).json(updatedPrice);
    } catch (error) {
        console.error('Error updating Price:', error);
        return res.status(500).json({ message: 'Error updating Price' });
    }
}
*/
// No need for this if the cors doesn't allow it.
// Delete a Price by the priceId
export const deletePrice = async (req, res, next) => {
    try {
        // Find and delete the price
        const deletedPrice = await Price.findOneAndDelete({ priceId: req.body.priceId });
        await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Deleted Price entry for PriceID: ${req.body.priceId}`);
        return res.status(200).json(deletedPrice);
    } catch (error) {
        console.error('Error deleting Price:', error);
        return res.status(500).json({ message: 'Error deleting Price' });
    }
}

// Get all Prices
export const getPrices = async (req, res, next) => {
    try {
        const prices = await Price.find();
        return res.status(200).json(prices);
    } catch (error) {
        console.error('Error getting Prices:', error);
        return res.status(500).json({ message: 'Error getting Prices' });
    }
}

// Get a Price by the priceId
export const getPrice = async (req, res, next) => {
    try {
        const price = await Price.findOne({ priceId: req.params.priceId });
        return res.status(200).json(price);
    } catch (error) {
        console.error('Error getting Price:', error);
        return res.status(500).json({ message: 'Error getting Price' });
    }
}

// Get all Prices by the shopId
export const getPricesByShop = async (req, res, next) => {
    try {
        const prices = await Price.find({ shopId: req.params.shopId });
        return res.status(200).json(prices);
    } catch (error) {
        console.error('Error getting Prices:', error);
        return res.status(500).json({ message: 'Error getting Prices' });
    }
}

///////////////////////// - With Limited Response data - /////////////////////////
///////// - Start at line 135 and end at line 286 - /////////
export const getFullPriceDetails = async (req, res, next) => {
    try {
        const { companyId, shopId, productId, sellingTypeId } = req.params;

        let errors = []; // Array to collect error messages

        // Fetch Price details
        const price = await Price.findOne({ companyId, shopId, productId, sellingTypeId }, 'priceId sellingPrice discount discountDateRange sellingTypeCommission');
        if (!price) {
            errors.push(`Price not found for ProductID: ${productId} and SellingTypeID: ${sellingTypeId}`);
        }

        // Fetch Selling Type details
        const sellingType = await SellingType.findOne({ shopId, companyId, sellingTypeId }, 'sellingTypeId sellingType sellingTypeAmount additionDeduction');
        if (!sellingType) {
            errors.push(`Selling Type not found for ProductID: ${productId} and SellingTypeID: ${sellingTypeId}`);
        }

        // Fetch Product details
        const product = await Product.findOne({ productId, companyId, activeShopIds: { $in: [shopId] } }, 'productId pluCode name productType size activeShopIds toggle categoryId bomId deviceLocation minQty');
        if (!product) {
            errors.push(`Product not found for ProductID: ${productId}`);
        }

        // Fetch device Details
        let device = null;
        if (product) {
            device = await Device.findOne({ deviceLocation: product.deviceLocation, shopId: req.shopId }, 'deviceId deviceType deviceName deviceLocation deviceIPaddress PORT');
            if (!device) {
                errors.push(`Device not found for ProductID: ${productId}`);
            }
        }

        // Fetch BOM details if the product is a finished good
        let bomDetails = null;
        let stockDetails = { productAvailability: true, numberOfProductsAvailable: 0 };
        if (product && product.bomId) {
            bomDetails = await BOM.findOne({ bomId: product.bomId }, 'items');
            if (bomDetails) {
                // Check stock availability for each item in BOM
                const bomItems = bomDetails.items;
                const stockAvailability = await Promise.all(bomItems.map(async (item) => {
                    const itemStock = await Inventory.findOne({ companyId, shopId, productId: item.productId }, 'totalQuantity');
                    const availableQty = itemStock ? itemStock.totalQuantity : 0;
                    return {
                        productId: item.productId,
                        requiredQty: item.qty,
                        availableQty,
                        isAvailable: availableQty >= item.qty
                    };
                }));

                // Check if all items in BOM are available
                const allItemsAvailable = stockAvailability.every(item => item.isAvailable);
                if (!allItemsAvailable) {
                    stockDetails.productAvailability = false;
                }

                const numberOfProductsAvailable = Math.min(...stockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                stockDetails = {
                    ...stockDetails,
                    numberOfProductsAvailable,
                    stockAvailability
                };
            }
        } else if (product) {
            const inventoryStock = await Inventory.findOne({ companyId, shopId, productId: product.productId }, 'totalQuantity');
            if (inventoryStock) {
                stockDetails.numberOfProductsAvailable = inventoryStock.totalQuantity;
            } else {
                stockDetails.productAvailability = false;
            }
        }

        // If there are any errors, return 404 with detailed messages
        if (errors.length > 0) {
            return res.status(404).json({
                message: 'Product Details fetch failed',
                errors: errors
            });
        }

        // Construct the response object if no errors
        const productDetails = {
            product,
            price,
            sellingType,
            device,
            stockDetails,
        };

        // Send the response
        res.status(200).json(productDetails);

    } catch (error) {
        next(error);
    }
};

/*###################################################################################################################*/
/*
export const getFullPriceDetails = async (req, res, next) => {
    try {
        const { companyId, shopId, productId, sellingTypeId } = req.params;
        //console.log('req.params:', req.params);

        // Fetch Price details Used the Object destructuring to get only the necessary price details
        const price = await Price.findOne({ companyId, shopId, productId, sellingTypeId }, 'priceId sellingPrice discount discountDateRange sellingTypeCommission');
        if (!price) {
            return res.status(404).json({ message: 'Price not found' });
        }

        // Fetch Selling Type details Used the Object destructuring to get only the necessary sellingType details
        const sellingType = await SellingType.findOne({ shopId, companyId, sellingTypeId }, 'sellingTypeId sellingType sellingTypeAmount additionDeduction');
        if (!sellingType) {
            return res.status(404).json({ message: 'Selling Type not found' });
        }

        // Fetch Product details, checking if shopId is in activeShopIds array, Used the Object destructuring to get only the necessary product details
        const product = await Product.findOne({ productId, companyId, activeShopIds: { $in: [shopId] } }, 'productId pluCode name productType size activeShopIds toggle categoryId bomId deviceLocation minQty');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Fetch device Details using the deviceLocation Used the Object destructuring to get only the necessary device details
        const device = await Device.findOne({ deviceLocation: product.deviceLocation, shopId: req.shopId }, 'deviceId deviceType deviceName deviceLocation deviceIPaddress PORT');
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Fetch BOM details if the product is a finished good
        let bomDetails = null;
        let stockDetails = { productAvailability: true, numberOfProductsAvailable: 0 };
        if (product.bomId) {
            bomDetails = await BOM.findOne({ bomId: product.bomId }, 'items');
            if (bomDetails) {
                // Check the stock availability for each item in the BOM
                const bomItems = bomDetails.items;
                const stockAvailability = await Promise.all(bomItems.map(async (item) => {
                    const itemStock = await Inventory.findOne({ companyId, shopId, productId: item.productId }, 'totalQuantity');
                    const availableQty = itemStock ? itemStock.totalQuantity : 0;
                    return {
                        productId: item.productId,
                        requiredQty: item.qty,
                        availableQty,
                        isAvailable: availableQty >= item.qty
                    };
                }));

                // Check if all items in BOM are available and calculate the number of products available
                const allItemsAvailable = stockAvailability.every(item => item.isAvailable);
                if (!allItemsAvailable) {
                    stockDetails.productAvailability = false;
                }

                const numberOfProductsAvailable = Math.min(...stockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                stockDetails = {
                    ...stockDetails,
                    numberOfProductsAvailable,
                    stockAvailability
                };
            }
        } else {
            const inventoryStock = await Inventory.findOne({ companyId, shopId, productId: product.productId }, 'totalQuantity');
            if (inventoryStock) {
                stockDetails.numberOfProductsAvailable = inventoryStock.totalQuantity;
            } else {
                stockDetails.productAvailability = false;
            }
        }
        /*
        // Fetch additional products with the same category ID but different sizes
        const additionalProducts = await Product.find({
            companyId,
            activeShopIds: { $in: [shopId] },
            categoryId: product.categoryId,
            productId: { $ne: product.productId }
        }, 'productId pluCode name productType size activeShopIds toggle categoryId bomId deviceLocation minQty');

        // Fetch full details for each additional product with the same sellingTypeId
        const additionalProductsDetails = await Promise.all(additionalProducts.map(async (additionalProduct) => {
            const additionalPrice = await Price.findOne({ companyId, shopId, productId: additionalProduct.productId, sellingTypeId }, 'priceId sellingPrice discount discountDateRange sellingTypeCommission');
            const additionalSellingType = await SellingType.findOne({ shopId, companyId, sellingTypeId }, 'sellingTypeId sellingType sellingTypeAmount additionDeduction');
            const additionalDevice = await Device.findOne({ deviceLocation: additionalProduct.deviceLocation, shopId }, 'deviceId deviceType deviceName deviceLocation deviceIPaddress PORT');

            if (!additionalPrice || !additionalSellingType || !additionalDevice) {
                return null;
            }

            let additionalStockDetails = { productAvailability: true, numberOfProductsAvailable: 0 };
            if (additionalProduct.bomId) {
                const additionalBomDetails = await BOM.findOne({ bomId: additionalProduct.bomId }, 'items');
                if (additionalBomDetails) {
                    const additionalBomItems = additionalBomDetails.items;
                    const additionalStockAvailability = await Promise.all(additionalBomItems.map(async (item) => {
                        const itemStock = await Inventory.findOne({ companyId, shopId, productId: item.productId }, 'totalQuantity');
                        const availableQty = itemStock ? itemStock.totalQuantity : 0;
                        return {
                            productId: item.productId,
                            requiredQty: item.qty,
                            availableQty,
                            isAvailable: availableQty >= item.qty
                        };
                    }));

                    const allAdditionalItemsAvailable = additionalStockAvailability.every(item => item.isAvailable);
                    if (!allAdditionalItemsAvailable) {
                        additionalStockDetails.productAvailability = false;
                    }

                    const numberOfAdditionalProductsAvailable = Math.min(...additionalStockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                    additionalStockDetails = {
                        ...additionalStockDetails,
                        numberOfProductsAvailable: numberOfAdditionalProductsAvailable,
                        stockAvailability: additionalStockAvailability
                    };
                }
            } else {
                const additionalInventoryStock = await Inventory.findOne({ companyId, shopId, productId: additionalProduct.productId }, 'totalQuantity');
                if (additionalInventoryStock) {
                    additionalStockDetails.numberOfProductsAvailable = additionalInventoryStock.totalQuantity;
                } else {
                    additionalStockDetails.productAvailability = false;
                }
            }

            return {
                product: additionalProduct,
                price: additionalPrice,
                sellingType: additionalSellingType,
                device: additionalDevice,
                stockDetails: additionalStockDetails
            };
        }));
        
        const filteredAdditionalProductsDetails = additionalProductsDetails.filter(detail => detail !== null);
        *//*########################################################################
        // Construct the response object
        const productDetails = {
            product,
            price,
            sellingType,
            device,
            stockDetails,
            //additionalProducts: filteredAdditionalProductsDetails
        };

        // Send the response
        res.status(200).json(productDetails);

    } catch (error) {
        next(error);
    }
};
*/
/*###################################################################################################################*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////// - With this API you can get details of the product without SellingType - ////////////////////
/////// - Start at line 293 and end at line 359 - ///////
/*
// get Price, SellingType, inventoryStock, BOM details for a product by shopId, productId, and companyId
export const getPriceDetails = async (req, res, next) => {
    try {
        const { companyId, shopId, productId } = req.params;
        // Fetch Price details
        const price = await Price.findOne({ companyId, shopId, productId });
        if (!price) {
            return res.status(404).json({ message: 'Price not found' });
        }
        
        // Fetch Selling Type details
        const sellingType = await SellingType.findOne({ shopId, companyId });
        if (!sellingType) {
            return res.status(404).json({ message: 'Selling Type not found' });
        }
        
        // Fetch Product details, checking if shopId is in activeShopIds array
        const product = await Product.findOne({ productId, companyId, activeShopIds: { $in: [shopId] } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Fetch device Details using the deviceLocation
        // This takes the deviceLocation from the product and companyID and shopID from the logged in user.
        const device = await Device.findOne({ deviceLocation: product.deviceLocation, /*companyId: req.companyId,*//* shopId: req.shopId });
//Above Line for the comment section start
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Fetch additional products with the same category ID but different sizes
        const additionalProducts = await Product.find({
            companyId,
            activeShopIds: { $in: [shopId] },
            categoryId: product.categoryId,
            productId: { $ne: product.productId }
        });
        
        // Fetch full details for each additional product
        const additionalProductsDetails = await Promise.all(additionalProducts.map(async (additionalProduct) => {
            const additionalPrice = await Price.findOne({ companyId, shopId, productId: additionalProduct.productId });
            const additionalSellingType = await SellingType.findOne({ shopId, companyId });
            const additionalDevice = await Device.findOne({ deviceLocation: additionalProduct.deviceLocation, shopId });

            return {
                product: additionalProduct,
                price: additionalPrice,
                sellingType: additionalSellingType,
                device: additionalDevice
            };
        }));
        
        // Construct the response object
        const productDetails = {
            //...product.toObject(),
            product,
            price,
            sellingType,
            device,
            additionalProducts: additionalProductsDetails
        };

        // Send the response
        res.status(200).json(productDetails);

    } catch (error) {
        next(error);
    }
};
*/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// - Without Limited Response Data Restriction - //////////////////////////////////
////// - Start at line 365 and end at line 535 - ///////
/*
export const getFullPriceDetails = async (req, res, next) => {
    try {
        const { companyId, shopId, productId, sellingTypeId } = req.params;

        // Fetch Price details
        const price = await Price.findOne({ companyId, shopId, productId, sellingTypeId });
        if (!price) {
            return res.status(404).json({ message: 'Price not found' });
        }

        // Fetch Selling Type details
        const sellingType = await SellingType.findOne({ shopId, companyId, sellingTypeId });
        if (!sellingType) {
            return res.status(404).json({ message: 'Selling Type not found' });
        }

        // Fetch Product details, checking if shopId is in activeShopIds array
        const product = await Product.findOne({ productId, companyId, activeShopIds: { $in: [shopId] } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Fetch device Details using the deviceLocation
        const device = await Device.findOne({ deviceLocation: product.deviceLocation, shopId: req.shopId });
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Fetch BOM details if the product is a finished good
        let bomDetails = null;
        let stockDetails = { productAvailability: true };
        if (product.bomId) {
            bomDetails = await BOM.findOne({ bomId: product.bomId });
            if (bomDetails) {
                // Check the stock availability for each item in the BOM
                const bomItems = bomDetails.items;
                const stockAvailability = await Promise.all(bomItems.map(async (item) => {
                    const itemStock = await Inventory.findOne({ shopId, productId: item.productId });
                    const availableQty = itemStock ? itemStock.totalQuantity : 0;
                    return {
                        productId: item.productId,
                        requiredQty: item.qty,
                        availableQty,
                        isAvailable: availableQty >= item.qty
                    };
                }));

                // Check if all items in BOM are available
                const allItemsAvailable = stockAvailability.every(item => item.isAvailable);
                if (!allItemsAvailable) {
                    stockDetails.productAvailability = false;
                } else {
                    // Calculate the number of products that can be created based on the BOM stock
                    const numberOfProductsAvailable = Math.min(...stockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                    stockDetails.numberOfProductsAvailable = numberOfProductsAvailable;
                }

                stockDetails = {
                    ...stockDetails,
                    stockAvailability
                };

                bomDetails = {
                    ...bomDetails.toObject(),
                    stockAvailability
                };
            }
        } else {
            const inventoryStock = await Inventory.findOne({ companyId, shopId, productId });
            if (inventoryStock) {
                stockDetails.availableStockItemQty = inventoryStock.totalQuantity;
            } else {
                stockDetails.productAvailability = false;
            }
        }

        // Fetch additional products with the same category ID but different sizes
        const additionalProducts = await Product.find({
            companyId,
            activeShopIds: { $in: [shopId] },
            categoryId: product.categoryId,
            productId: { $ne: product.productId }
        });

        // Fetch full details for each additional product with the same sellingTypeId
        const additionalProductsDetails = await Promise.all(additionalProducts.map(async (additionalProduct) => {
            const additionalPrice = await Price.findOne({ companyId, shopId, productId: additionalProduct.productId, sellingTypeId });
            const additionalSellingType = await SellingType.findOne({ shopId, companyId, sellingTypeId });
            const additionalDevice = await Device.findOne({ deviceLocation: additionalProduct.deviceLocation, shopId });

            if (!additionalPrice || !additionalSellingType || !additionalDevice) {
                return null;
            }

            // Fetch BOM details for additional product if it is a finished good
            let additionalBomDetails = null;
            let additionalStockDetails = { productAvailability: true };
            if (additionalProduct.bomId) {
                additionalBomDetails = await BOM.findOne({ bomId: additionalProduct.bomId });
                if (additionalBomDetails) {
                    // Check the stock availability for each item in the BOM
                    const additionalBomItems = additionalBomDetails.items;
                    const additionalStockAvailability = await Promise.all(additionalBomItems.map(async (item) => {
                        const itemStock = await Inventory.findOne({ shopId, productId: item.productId });
                        const availableQty = itemStock ? itemStock.totalQuantity : 0;
                        return {
                            productId: item.productId,
                            requiredQty: item.qty,
                            availableQty,
                            isAvailable: availableQty >= item.qty
                        };
                    }));

                    // Check if all items in BOM are available
                    const allAdditionalItemsAvailable = additionalStockAvailability.every(item => item.isAvailable);
                    if (!allAdditionalItemsAvailable) {
                        additionalStockDetails.productAvailability = false;
                    } else {
                        // Calculate the number of products that can be created based on the BOM stock
                        const numberOfAdditionalProductsAvailable = Math.min(...additionalStockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                        additionalStockDetails.numberOfProductsAvailable = numberOfAdditionalProductsAvailable;
                    }

                    additionalStockDetails = {
                        ...additionalStockDetails,
                        stockAvailability: additionalStockAvailability
                    };

                    additionalBomDetails = {
                        ...additionalBomDetails.toObject(),
                        stockAvailability: additionalStockAvailability
                    };
                }
            } else {
                const additionalInventoryStock = await Inventory.findOne({ shopId, productId: additionalProduct.productId });
                if (additionalInventoryStock) {
                    additionalStockDetails.availableStockItemQty = additionalInventoryStock.totalQuantity;
                } else {
                    additionalStockDetails.productAvailability = false;
                }
            }

            return {
                product: additionalProduct,
                price: additionalPrice,
                sellingType: additionalSellingType,
                device: additionalDevice,
                stockDetails: additionalStockDetails
            };
        }));

        // Filter out any null values that might have been returned due to missing details
        const filteredAdditionalProductsDetails = additionalProductsDetails.filter(detail => detail !== null);

        // Construct the response object
        const productDetails = {
            product,
            price,
            sellingType,
            device,
            stockDetails,
            additionalProducts: filteredAdditionalProductsDetails
        };

        // Send the response
        res.status(200).json(productDetails);

    } catch (error) {
        next(error);
    }
};
*/
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

