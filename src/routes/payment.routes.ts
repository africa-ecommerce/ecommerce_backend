import { Router } from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { isPlug, isSupplier } from "../middleware/role.middleware";
import {
  getPlugPayment,
  getSupplierPayment,
  resolveAccountWithBank,
  resendWithdrawalVerificationToken,
  processWithdrawal
} from "../controllers/payment.controller";
import rateLimit from "express-rate-limit";
import { createDualLimiter } from "../helper/helperFunc";



const router = Router();


//RATE - LIMIT
const withdrawalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `withdraw-${req.user?.id || req.ip}`,
  message: {
    error: "Too many failed attempts. Try again in 24 hours!",
  },
});


const [resendCodeIpLimiter, resendCodeEmailLimiter] = createDualLimiter(
  5,
  3,
  30 * 60 * 1000,
  "resend-code",
  false
);

router.get("/plug/earnings", authenticateJWT, isPlug, getPlugPayment);
router.get("/supplier/earnings", authenticateJWT, isSupplier, getSupplierPayment);
router.post("/resolve-account", authenticateJWT, resolveAccountWithBank);
router.get(
  "/resend-code",
  authenticateJWT,
  resendCodeIpLimiter,
  resendCodeEmailLimiter,
  resendWithdrawalVerificationToken
);
router.post("/withdraw", authenticateJWT, withdrawalLimiter, processWithdrawal);





export default router;