import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { discoverProducts, getAcceptedProducts, syncDiscovery, deleteAcceptedProducts } from "../controllers/discover.controller";
import { isPlug } from "../middleware/role.middleware";


const router = Router();

// Middleware to ensure user is authenticated and is a plug
const plugAuth = [authenticateJWT, isPlug];

router.use(plugAuth);



// Route to get all products
router.get("/products", discoverProducts);
router.post("/sync", syncDiscovery);
router.get("/products/accepted", getAcceptedProducts);
router.delete("/products/accepted", deleteAcceptedProducts);




export default router;
