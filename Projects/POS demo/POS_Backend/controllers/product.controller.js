import Product from '../models/product.model.js';
import BillOfMaterials from '../models/bom.model.js';
import Inventory from '../models/inventory.stock.model.js';
import { createLog } from '../utils/logger.util.js';
import Shop from '../models/shop.model.js';
import { get } from 'mongoose';
import Price from '../models/price.model.js';

// Create and save a new Product
export const createProduct = async (req, res, next) => {
  try {
    // Check for duplicate pluCode
    const existingProduct = await Product.findOne({ pluCode: req.body.pluCode });
    if (existingProduct) {
      return res.status(400).json({ message: 'PLU Code already exists' });
    }
    // Check for duplicate product name with same size combination.
    const existingProductName = await Product.findOne({ name: req.body.productName, size: req.body.size });
    if (existingProductName) {
      return res.status(400).json({ message: 'Product Name, Size combination already exists' });
    }

    // Get flags for new functionality
    const requiresGRN = req.body.requiresGRN || false;
    const hasRawMaterials = req.body.hasRawMaterials || false;

    // Create a new product
    const product = new Product({
      productId: 'ProductID-1', // default value no need to send this from the client
      pluCode: req.body.pluCode,
      companyId: req.body.companyId,
      name: req.body.productName,
      productType: req.body.productType,
      size: req.body.size,
      activeShopIds: req.body.activeShopIds,
      toggle: "enable",
      createdBy: req.body.userId,
      categoryId: req.body.categoryId,
      minQty: req.body.minQty,
      uomId: req.body.uomId,
      deviceLocation: req.body.deviceLocation,
      requiresGRN: requiresGRN,
      hasRawMaterials: hasRawMaterials
    });

    // Save the product
    const savedProduct = await product.save();
    await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Created Product entry for ProductID: ${savedProduct.productId}`);

    // Only create BOM if product has raw materials
    if (hasRawMaterials) {
      // Function to create BOM
      const createBOM = async (items = []) => {
        const bom = new BillOfMaterials({
          bomId: 'BomId-1', // default value no need to send this from the client
          finishedGoodId: savedProduct.productId,
          createdBy: req.body.userId,
          items
        });
        console.log('created bom')
        // Save the BOM
        const savedBOM = await bom.save();
        await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Created BOM entry for finishedGoodId/ProductId: ${savedProduct.productId}`);
        return savedBOM.bomId;
      };

      // Handle BOM creation based on product type
      const productType = req.body.productType.toLowerCase();
      if (productType.includes('raw')) {
        const items = [{
          productId: savedProduct.productId,
          qty: req.body.minQty,
          uomId: req.body.uomId
        }];
        const bomId = await createBOM(items);
        savedProduct.bomId = bomId;
        await savedProduct.save();
      } else if (productType === 'finished good' || productType === 'wip') {
        // Only create BOM with items if items are provided
        if (req.body.items && req.body.items.length > 0) {
          const items = req.body.items.map(item => ({
            productId: item.productId,
            qty: item.qty,
            uomId: item.uomId
          }));
          const bomId = await createBOM(items);
          savedProduct.bomId = bomId;
          await savedProduct.save();
        } else {
          // Create empty BOM
          const bomId = await createBOM([]);
          savedProduct.bomId = bomId;
          await savedProduct.save();
        }
      }
    }

    res.status(201).json(savedProduct);
  } catch (error) {
    next(error);
  }
};

// Update a product
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check for duplicate pluCode
    if (req.body.pluCode && req.body.pluCode !== product.pluCode) {
      const existingProduct = await Product.findOne({ pluCode: req.body.pluCode });
      if (existingProduct) {
        return res.status(400).json({ message: 'PLU Code already exists' });
      }
    }

    // Get flags for new functionality
    const requiresGRN = req.body.requiresGRN !== undefined ? req.body.requiresGRN : product.requiresGRN;
    const hasRawMaterials = req.body.hasRawMaterials !== undefined ? req.body.hasRawMaterials : product.hasRawMaterials;

    // Update product fields
    Object.assign(product, {
      ...req.body,
      requiresGRN,
      hasRawMaterials
    });

    const updatedProduct = await product.save();
    await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Updated Product entry for ProductID: ${updatedProduct.productId}`);

    // Handle BOM update if product has raw materials
    if (hasRawMaterials) {
      const productType = req.body.productType ? req.body.productType.toLowerCase() : product.productType.toLowerCase();
      if (productType === 'finished good' || productType === 'wip') {
        // Only update BOM if items are provided
        if (req.body.items && req.body.items.length > 0) {
          let bom = await BillOfMaterials.findOne({ bomId: updatedProduct.bomId });
          if (!bom) {
            bom = new BillOfMaterials({
              finishedGoodId: updatedProduct.productId,
              createdBy: req.body.userId,
              items: req.body.items.map(item => ({
                productId: item.productId,
                qty: item.qty,
                uomId: item.uomId
              }))
            });
          } else {
            bom.items = req.body.items.map(item => ({
              productId: item.productId,
              qty: item.qty,
              uomId: item.uomId
            }));
          }
          const savedBOM = await bom.save();
          updatedProduct.bomId = savedBOM.bomId;
          await updatedProduct.save();
          await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Updated BOM entry for BOMID: ${savedBOM.bomId}`);
        }
      }
    } else {
      // If product no longer has raw materials, keep the BOM ID but empty the items
      if (updatedProduct.bomId) {
        const bom = await BillOfMaterials.findOne({ bomId: updatedProduct.bomId });
        if (bom) {
          bom.items = [];
          await bom.save();
          await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Cleared BOM items for BOMID: ${bom.bomId}`);
        }
      }
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

// // Create and save a new Product
// export const createProduct = async (req, res, next) => {
//   try {
//     // Check for duplicate pluCode
//     const existingProduct = await Product.findOne({ pluCode: req.body.pluCode });
//     if (existingProduct) {
//       return res.status(400).json({ message: 'PLU Code already exists' });
//     }
//     // Check for duplicate product name with same size combination.
//     const existingProductName = await Product.findOne({ name: req.body.productName, size: req.body.size });
//     if (existingProductName) {
//       return res.status(400).json({ message: 'Product Name, Size combination already exists' });
//     }
//     // Create a new product
//     const product = new Product({
//       productId: 'ProductID-1', // default value no need to send this from the client
//       pluCode: req.body.pluCode,
//       companyId: req.body.companyId,
//       name: req.body.productName,
//       productType: req.body.productType,
//       size: req.body.size,
//       activeShopIds: req.body.activeShopIds,
//       toggle: "enable",
//       createdBy: req.body.userId,
//       categoryId: req.body.categoryId,
//       minQty: req.body.minQty,
//       uomId: req.body.uomId,
//       deviceLocation: req.body.deviceLocation,
//     });
//     // Save the product
//     const savedProduct = await product.save();
//     await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Created Product entry for ProductID: ${savedProduct.productId}`);
//     // Function to create BOM
//     const createBOM = async (items = []) => {
//       const bom = new BillOfMaterials({
//         bomId: 'BomId-1', // default value no need to send this from the client
//         finishedGoodId: savedProduct.productId,
//         createdBy: req.body.userId,
//         items
//       });
//       // Save the BOM
//       const savedBOM = await bom.save();
//       await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Created BOM entry for finishedGoodId/ProductId: ${savedProduct.productId}`);
//       return savedBOM.bomId;
//     };
//     // Handle productType logic
//     const productType = req.body.productType.toLowerCase();
//     if (productType.includes('raw')) {
//       const items = [{
//         productId: savedProduct.productId,
//         qty: req.body.minQty,
//         uomId: req.body.uomId
//       }];
//       const bomId = await createBOM(items);
//       savedProduct.bomId = bomId;
//       await savedProduct.save();
//       // Create a log entry
//     } else if (productType === 'finished good' || productType === 'wip') {
//       const items = req.body.items.map(item => ({
//         productId: item.productId,
//         qty: item.qty,
//         uomId: item.uomId
//       }));
//       const bomId = await createBOM(items);
//       savedProduct.bomId = bomId;
//       await savedProduct.save();
//     }
//     res.status(201).json(savedProduct);
//   } catch (error) {
//     next(error);
//   }
// };

// // Update a product
// export const updateProduct = async (req, res, next) => {
//   // if (req.role !== 'superAdmin') {
//   //   return res.status(403).json({ message: 'Only Super Admins are allowed to update products' });
//   // }
//   try {
//     const product = await Product.findOne({ productId: req.params.productId });
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
//     // Check for duplicate pluCode
//     if (req.body.pluCode && req.body.pluCode !== product.pluCode) {
//       const existingProduct = await Product.findOne({ pluCode: req.body.pluCode });
//       if (existingProduct) {
//         return res.status(400).json({ message: 'PLU Code already exists' });
//       }
//     }
//     // Update product fields
//     Object.assign(product, req.body);
//     const updatedProduct = await product.save();
//     await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Updated Product entry for ProductID: ${updatedProduct.productId}`);
//     // Handle BOM update
//     const productType = req.body.productType ? req.body.productType.toLowerCase() : product.productType.toLowerCase();
//     if (productType === 'finished good' || productType === 'wip') {
//       let bom = await BillOfMaterials.findOne({ bomId: updatedProduct.bomId });
//       if (!bom) {
//         bom = new BillOfMaterials({
//           finishedGoodId: updatedProduct.productId,
//           createdBy: req.body.userId,
//           items: req.body.items.map(item => ({
//             productId: item.productId,
//             qty: item.qty,
//             uomId: item.uomId
//           }))
//         });
//       } else {
//         bom.items = req.body.items.map(item => ({
//           productId: item.productId,
//           qty: item.qty,
//           uomId: item.uomId
//         }));
//       }
//       const savedBOM = await bom.save();
//       updatedProduct.bomId = savedBOM.bomId;
//       await updatedProduct.save();
//       await createLog(req.body.companyId, req.body.shopId, req.body.userId, `Updated BOM entry for BOMID: ${savedBOM.bomId}`);
//     }
//     res.status(200).json(updatedProduct);
//   } catch (error) {
//     next(error);
//   }
// };


// Get all products with BOM details
export const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find().populate('bomId');
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductsWithPrices = async (req, res, next) => {
  try {
    // Fetch all products
    const products = await Product.find().populate('bomId');

    // Fetch all prices
    const prices = await Price.find();

    // Create a map for price lookup by productId
    const priceMap = prices.reduce((map, price) => {
      map[price.productId] = price; // Use productId to relate prices to products
      return map;
    }, {});

    // Combine product details with corresponding price information
    const productsWithPrices = products.map(product => {
      const priceInfo = priceMap[product.productId] || {}; // Default to empty object if no price info
      return {
        ...product.toObject(), // Convert product Mongoose document to plain object
        sellingPrice: priceInfo.sellingPrice || null,
        discount: priceInfo.discount || null,
        discountDateRange: priceInfo.discountDateRange || null,
        sellingTypeCommission: priceInfo.sellingTypeCommission || null,
      };
    });

    // Send the combined data
    res.status(200).json(productsWithPrices);
  } catch (error) {
    console.error('Error fetching products with prices:', error);
    next(error);
  }
};

// Get companyId of the logged-in shop
async function getCompanyId(shopId) {
  try {
    // Find the shop details asynchronously
    const loggedInShop = await Shop.findOne({ shopId: shopId });
    if (!loggedInShop) {
      throw new Error('Shop not found');
    }
    return loggedInShop.companyId;
  } catch (error) {
    console.error("Error fetching shop details:", error.message);
    throw error;
  }
}

// Get all products with stock details
export const getAllProductsWithStock = async (req, res, next) => {
  try {
    //const { companyId } = req;
    const companyId = await getCompanyId(req.shopId);

    // Fetch all products by companyId
    const products = await Product.find({ companyId });
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Iterate over each product to get BOM and stock details
    const productsWithStock = await Promise.all(products.map(async (product) => {
      let stockDetails = { productAvailability: true, numberOfProductsAvailable: 0 };

      if (product.bomId) {
        const bomDetails = await BillOfMaterials.findOne({ bomId: product.bomId }, 'items');
        if (bomDetails) {
          const bomItems = bomDetails.items;
          const stockAvailability = await Promise.all(bomItems.map(async (item) => {
            const itemStock = await Inventory.findOne({ companyId, productId: item.productId }, 'totalQuantity');
            const availableQty = itemStock ? itemStock.totalQuantity : 0;
            return {
              productId: item.productId,
              requiredQty: item.qty,
              availableQty,
              isAvailable: availableQty >= item.qty
            };
          }));

          const allItemsAvailable = stockAvailability.every(item => item.isAvailable);
          if (!allItemsAvailable) {
            stockDetails.productAvailability = false;
          }

          const numberOfProductsAvailable = Math.min(...stockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
          stockDetails.numberOfProductsAvailable = numberOfProductsAvailable;
        }
      } else {
        const inventoryStock = await Inventory.findOne({ companyId, productId: product.productId }, 'totalQuantity');
        if (inventoryStock) {
          stockDetails.numberOfProductsAvailable = inventoryStock.totalQuantity;
        } else {
          stockDetails.productAvailability = false;
        }
      }

      return {
        ...product.toObject(),
        stockDetails
      };
    }));

    // Return the products directly as an array, without an additional object wrapper
    res.status(200).json(productsWithStock);
  } catch (error) {
    next(error);
  }
};

/*
// Get all products with stock details
export const getAllProductsWithStock = async (req, res, next) => {
  try {
      const { companyId } = req;

      // Fetch all products by companyId
      const products = await Product.find({ companyId });
      if (products.length === 0) {
          return res.status(404).json({ message: 'No products found' });
      }
      // Iterate over each product to get BOM and stock details
      const productsWithStock = await Promise.all(products.map(async (product) => {
          let stockDetails = { productAvailability: true, numberOfProductsAvailable: 0 };

          if (product.bomId) {
              const bomDetails = await BillOfMaterials.findOne({ bomId: product.bomId }, 'items');
              if (bomDetails) {
                  const bomItems = bomDetails.items;
                  const stockAvailability = await Promise.all(bomItems.map(async (item) => {
                      const itemStock = await Inventory.findOne({ companyId, productId: item.productId }, 'totalQuantity');
                      const availableQty = itemStock ? itemStock.totalQuantity : 0;
                      return {
                          productId: item.productId,
                          requiredQty: item.qty,
                          availableQty,
                          isAvailable: availableQty >= item.qty
                      };
                  }));

                  const allItemsAvailable = stockAvailability.every(item => item.isAvailable);
                  if (!allItemsAvailable) {
                      stockDetails.productAvailability = false;
                  }

                  const numberOfProductsAvailable = Math.min(...stockAvailability.map(item => Math.floor(item.availableQty / item.requiredQty)));
                  stockDetails = {
                      ...stockDetails,
                      numberOfProductsAvailable,
                      //stockAvailability
                  };
              }
          } else {
              const inventoryStock = await Inventory.findOne({ companyId, productId: product.productId }, 'totalQuantity');
              if (inventoryStock) {
                  stockDetails.numberOfProductsAvailable = inventoryStock.totalQuantity;
              } else {
                  stockDetails.productAvailability = false;
              }
          }

          return {
              ...product.toObject(),
              stockDetails
          };
      }));

      res.status(200).json({ productsWithStock });
  } catch (error) {
      next(error);
  }
};
*/
// Get a product details by productID with BOM details
export const getProductById = async (req, res, next) => {
  try {
    // Find the product by productId
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the BOM details if bomId exists
    let bomDetails = null;
    if (product.bomId) {
      bomDetails = await BillOfMaterials.findOne({ bomId: product.bomId });
    }

    // Combine product and BOM details
    const productWithBom = {
      ...product.toObject(),
      bomDetails
    };

    res.status(200).json(productWithBom);
  } catch (error) {
    next(error);
  }
};



// May not be used in the frontend due to cors policy restrictions.
// Delete a product
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ productId: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated BOM if exists
    if (product.bomId) {
      await BillOfMaterials.findOneAndDelete({ bomId: product.bomId });
      await createLog(product.companyId, product.shopId, product.createdBy, `Deleted BOM entry for BOMID: ${product.bomId}`);
    }

    await createLog(product.companyId, product.shopId, product.createdBy, `Deleted Product entry for ProductID: ${product.productId}`);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};