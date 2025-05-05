import express from "express";
import { plugProductController } from "../controllers/plugProduct.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = express.Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);

// Routes for adding products to plug
router.post("/", plugProductController.addProductsToPlug);

// Route to get all products in plug
router.get("/", plugProductController.getPlugProducts);

// Route to get a plug product by ID
router.get("/:productId", plugProductController.getPlugProductById);

// Route to update product price in plug
router.put("/:productId", plugProductController.updatePlugProductPrice);

// Route to remove a product from plug
router.delete("/:productId", plugProductController.removePlugProduct);

// Route to delete all products from plug
router.delete("/", plugProductController.removeAllPlugProducts);

export default router;
