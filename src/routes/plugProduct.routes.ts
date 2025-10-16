import { Router } from "express";
import { plugProductController } from "../controllers/plugProduct.controller";
import { isPlug } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);

// Routes for adding products to plug
router.post("/", plugProductController.addProductsToPlug);
// Routes for adding  a single product to plug
router.post("/single", plugProductController.addProductToPlug);

// Route to get all products in plug
router.get("/", plugProductController.getPlugProducts);

// Route to get all outdated products in plug
router.get("/outdated", plugProductController.getOutdatedPlugProducts);

// Route to get a plug product by ID
router.get("/:productId", plugProductController.getPlugProductById);

// Route to update product price in plug
router.put("/:productId", plugProductController.updatePlugProductPrice);

// Route to remove a product from plug
router.delete("/:productId", plugProductController.removePlugProduct);

// /**
//  * @dev unused route
//  */
// // Route to delete all products from plug
// router.delete("/", plugProductController.removeAllPlugProducts);

//Reviews
// Route to write a review
router.post("/review", plugProductController.reviewProduct);
// Route to delete a review
router.delete("/review/:productId", plugProductController.deleteReview);

export default router;
