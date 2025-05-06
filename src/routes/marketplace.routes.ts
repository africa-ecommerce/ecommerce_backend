import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { getAllProducts} from "../controllers/marketplace.controller";


const router = Router();

router.use(authenticateJWT);


// Route to get all products
router.get("/products", getAllProducts);



export default router;
