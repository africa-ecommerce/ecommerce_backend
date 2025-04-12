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
 * @desc    Add a supplier product to plug's draft products
 * @access  Private (Plug only)
 */
router.post(
  "/:productId",
  plugProductController.addProductToPlug
);

/**
 * @route   GET /api/plug/products/drafts
 * @desc    Get all draft products for a plug
 * @access  Private (Plug only)
 */
router.get("/drafts",  plugProductController.getDraftProducts);

/**
 * @route   GET /api/plug/products/published
 * @desc    Get all published products for a plug
 * @access  Private (Plug only)
 */
router.get("/published",  plugProductController.getPublishedProducts);

/**
 * @route   GET /api/plug/products/:productId
 * @desc    Get a specific plug product by ID
 * @access  Private (Plug only)
 */
router.get("/:productId",  plugProductController.getPlugProductById);

/**
 * @route   PUT /api/plug/products/:productId
 * @desc    Update a draft product
 * @access  Private (Plug only)
 */
router.put("/:productId",  plugProductController.updateDraftProduct);

/**
 * @route   POST /api/plug/products/publish
 * @desc    Publish selected draft products
 * @access  Private (Plug only)
 */
router.post("/publish",  plugProductController.publishDraftProducts);

/**
 * @route   DELETE /api/plug/products/:productId
 * @desc    Remove a product from plug's inventory
 * @access  Private (Plug only)
 */
router.delete("/:productId", plugProductController.removePlugProduct);


/**
 * @route   DELETE /api/plug/products
 * @desc    Remove all products from plug's inventory
 * @access  Private (Plug only)
 */
router.delete("/", plugProductController.removeAllPlugProducts);

export default router;
