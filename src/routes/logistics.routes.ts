import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { getAddressSuggestions, getGeocode, getShippingRates, getShippingStatus, requestShipping} from "../controllers/logistics.controller";


const router = Router();

router.use(authenticateJWT);


// Example get getAddressSuggestions
router.get("/", getAddressSuggestions);



export default router;