import { Request, Router } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { register } from "../controllers/auth/register";
import { login } from "../controllers/auth/login";
import {
  resendVerificationEmail,
  verifyEmail,
} from "../controllers/auth/verifyEmail";
import authenticateJWT from "../middleware/auth.middleware";
import { getCurrentUser } from "../controllers/auth/currentUser";
import {
  newPassword,
  sendNewPasswordMail,
  resendNewPasswordMail,
} from "../controllers/auth/forgotPassword";
import { logout } from "../controllers/auth/logout";
import { google, googleCallback } from "../controllers/auth/oauth";
import { refreshToken } from "../controllers/auth/refreshToken";
import { updateProfile } from "../controllers/auth/updateProfile";
import { updatePassword } from "../controllers/auth/updatePassword";
import { frontendUrl } from "../config";
import { createDualLimiter, createKeyGenerator } from "../helper/helperFunc";

const router = Router();



// ── Security endpoints ─────────────────────────────
const [securityIpLimiter, securityEmailLimiter] = createDualLimiter(
  10,
  5,
  15 * 60 * 1000,
  "sec",
  true
);

// ── Login failure (tight) ──────────────────────────
const loginFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator("login-fail-", true),
  skip: (req) => !req.body?.email,
  message: {
    error: "Too many failed login attempts. Try again in 15 minutes!",
    retryAfter: "15 minutes",
  },
});

// ── Resend flows ──────────────────────────────────
const [resendIpLimiter, resendEmailLimiter] = createDualLimiter(
  5,
  3,
  30 * 60 * 1000,
  "resend",
  false
);

// ── Password reset ─────────────────────
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: false,
  keyGenerator: createKeyGenerator("pwd-reset-", true),
  skip: (req) => !req.body?.email,
  message: {
    error: "Too many password reset attempts. Try again in 1 hour!",
    retryAfter: "1 hour",
  },
});

// ── General authenticated routes ──────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator("auth-"),
  message: {
    error: "Too many requests. Try again in 15 minutes!",
  },
});

// ── OAuth (less strict) ───────────────────────────
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  keyGenerator: createKeyGenerator("oauth-"),
  message: { error: "Too many OAuth attempts. Try again later!" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator("refresh-"),
  message: {
    error: "Too many token refresh attempts!",
  },
});

const currentUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  skipSuccessfulRequests: true,
  keyGenerator: createKeyGenerator("current-user-"),
  message: {
    error: "Too many requests. Please wait a moment!",
  },
});

// ── Routes Setup ──────────────────────────────────

router.post("/register", securityIpLimiter, securityEmailLimiter, register);

router.post(
  "/login",
  securityIpLimiter,
  securityEmailLimiter,
  loginFailureLimiter,
  login
);

router.post(
  "/forgot-password",
  securityIpLimiter,
  securityEmailLimiter,
  passwordResetLimiter,
  sendNewPasswordMail
);

router.post("/reset-password", securityIpLimiter, newPassword);

router.post(
  "/resend-verification-email",
  resendIpLimiter,
  resendEmailLimiter,
  resendVerificationEmail
);

router.post(
  "/resend-password-email",
  resendIpLimiter,
  resendEmailLimiter,
  resendNewPasswordMail
);

router.post("/verify-email", authLimiter, verifyEmail);
router.post("/refresh", refreshLimiter, refreshToken);

router.post("/logout", authLimiter, authenticateJWT, logout);
router.post("/update-password", authLimiter, authenticateJWT, updatePassword);
router.post("/update-profile", authLimiter, authenticateJWT, updateProfile);
router.get(
  "/current-user",
  currentUserLimiter,
  authenticateJWT,
  getCurrentUser
);

router.get("/google", oauthLimiter, google);
router.get(
  "/google/callback",
  oauthLimiter,
  passport.authenticate("google", {
    failureRedirect: `${frontendUrl}/auth/login`,
  }),
  googleCallback
);

export default router;
