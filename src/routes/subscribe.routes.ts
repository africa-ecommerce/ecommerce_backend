import { Router } from "express";
import {
    getSubscribedSuppliers,
    getSupplierSubscribers, 
    searchSuppliers,
subscribeToSupplier,
unsubscribeFromSupplier
} from "../controllers/subscribe.controller";
import { isPlug, isSupplier } from "../middleware/role.middleware";
import authenticateJWT from "../middleware/auth.middleware";

const router = Router();

//plug subs
router.get("/plug", authenticateJWT, isPlug, getSubscribedSuppliers)
router.get("/supplier", authenticateJWT, isSupplier, getSupplierSubscribers);
router.get("/search", authenticateJWT, isPlug, searchSuppliers)
router.post("/:supplierId", authenticateJWT, isPlug, subscribeToSupplier);
router.delete("/:supplierId", authenticateJWT, isPlug, unsubscribeFromSupplier);

export default router;
