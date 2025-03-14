// Don't do this yet. This is just a sample code for the future.


import Product from "../models/product.model.js";
import BOM from "../models/bom.model.js";
import Inventory from "../models/inventory.stock.model.js";
import SellingType from "../models/selling.type.model.js";

import Log from "../models/log.model.js";

// Get the product inventory stock function
function getProductInventoryStock(shopId, productId) {
  return new Promise(async (resolve, reject) => {
    try {
      const product = await Product.findOne({ productId: productId });
        if (!product) {
            return reject('Product not found');
            }
        const bom = await BOM.findOne({ bomId: product.bomId });
        if (!bom) {
            return reject('BOM not found');
            }
        const inventoryStock = await Inventory.findOne({ shopId: shopId, productId: productId });
        if (!inventoryStock) {
            return reject('Inventory Stock not found');
            }
        const productInventoryStock = {
            ...product.toObject(),
            bom,
            inventoryStock
            };
        resolve(productInventoryStock);
        }
        catch (error) {
            reject(error);
        }
    }
    );
}
// Get the product sellingType details function
function getProductSellingTypeDetails(shopId, productId) {
  return new Promise(async (resolve, reject) => {
    try {
      const sellingType = await SellingType.findOne({ shopId: shopId, productId: productId });
        if (!sellingType) {
            return reject('Selling Type not found');
            }
        resolve(sellingType);
        }
        catch (error) {
            reject(error);
        }
    }
    );
}




export const getProductInventoryStock = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const productId = req.params.productId;
    const product = await Product.findOne({ productId: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const bom = await BOM.findOne({ bomId: product.bomId });
    if (!bom) {
      return res.status(404).json({ message: 'BOM not found' });
    }
    const inventoryStock = await Inventory
        .findOne({ shopId: shopId, productId: productId });
    if (!inventoryStock) {
        return res.status(404).json({ message: 'Inventory Stock not found' });
        }
    const productInventoryStock = {
        ...product.toObject(),
        bom,
        inventoryStock
        };
    res.status(200).json(productInventoryStock);
    }
    catch (error) {
        next(error);
    }
}