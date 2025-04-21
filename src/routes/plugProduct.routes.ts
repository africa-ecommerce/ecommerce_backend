// src/routes/plug-product.routes.ts
import express from "express";
import { plugProductController } from "../controllers/plugProduct.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = express.Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];


router.use(plugAuth);

/**
 * @route   POST /api/plug/products/:productId
 * @desc    Add a supplier product to plug's products
 * @access  Private (Plug only)
 */
router.post(
  "/:productId",
  plugProductController.addProductsToPlug
);


/**
 * @route   GET /api/plug/products
 * @desc    Get all  products for a plug
 * @access  Private (Plug only)
 */
router.get("/",  plugProductController.getPlugProducts);




/**
 * @route   GET /api/plug/products/:productId
 * @desc    Get a specific plug product by ID
 * @access  Private (Plug only)
 */
router.get("/:productId",  plugProductController.getPlugProductById);

/**
 * @route   PUT /api/plug/products/:productId
 * @desc    Update a plug product
 * @access  Private (Plug only)
 */
router.put("/:productId",  plugProductController.updatePlugProduct);

/**
 * @route   DELETE /api/plug/products/:productId
 * @desc    Remove a product from plug's store
 * @access  Private (Plug only)
 */
router.delete("/:productId", plugProductController.removePlugProduct);


/**
 * @route   DELETE /api/plug/products
 * @desc    Remove all products from plug's store
 * @access  Private (Plug only)
 */
router.delete("/", plugProductController.removeAllPlugProducts);

export default router;
