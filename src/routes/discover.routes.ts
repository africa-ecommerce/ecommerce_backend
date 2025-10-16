import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { discoverProducts } from "../controllers/discover.controller";


const router = Router();

router.use(authenticateJWT);


// Route to get all products
router.get("/products", discoverProducts);



export default router;
