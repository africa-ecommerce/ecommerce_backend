import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { getAllProducts, getProductById } from "../controllers/marketplace.controller";


const router = Router();

router.use(authenticateJWT);


// Route to get all products
router.get("/products", getAllProducts);
// Get product by ID
router.get("/products/:productId", getProductById);


export default router;
