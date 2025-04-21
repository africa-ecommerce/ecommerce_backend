// src/routes/auth.routes.ts
import { Router } from "express";
import { register } from "../controllers/auth/register";
import passport from "passport";

import {
  resendVerificationEmail,
  // resendVerificationLimiter,
  verifyEmail,
} from "../controllers/auth/verifyEmail";
import authenticateJWT from "../middleware/auth.middleware";
import { getCurrentUser } from "../controllers/auth/currentUser";
import {
  newPassword,
  sendNewPasswordMail,
} from "../controllers/auth/forgotPassword";
import { login } from "../controllers/auth/login";
import { logout } from "../controllers/auth/logout";
import {
  facebook,
  google,
  googleCallback,
  facebookCallback,
} from "../controllers/auth/oauth";

import {
  resendNewPasswordMail,
  // resendPasswordLimiter,
} from "../controllers/auth/forgotPassword";
import { refreshToken } from "../controllers/auth/refreshToken";

const router = Router();

//register route
router.post("/register", register);

// Login route
router.post("/login", login);

// logout route
router.post("/logout", authenticateJWT, logout);

// endpoint to reset password
router.post("/reset-password", newPassword);

// endpoint to send new password mail
router.post("/forgot-password", sendNewPasswordMail);

// endpoint to verify email
router.post("/verify-email", verifyEmail);

// Resend verification email route with IP-based rate limiter
router.post(
  "/resend-verification-email",
  // resendVerificationLimiter,
  resendVerificationEmail
);

// Resend password reset email route with IP-based rate limiter
router.post(
  "/resend-password-email",
  // resendPasswordLimiter,
  resendNewPasswordMail
);


// Refresh token endpoint (already handled in middleware)
router.post("/refresh", refreshToken);

router.get("/current-user", authenticateJWT, getCurrentUser);

// Google OAuth Routes
router.get("/google", google);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.APP_URL}/auth/login`,
  }),
  googleCallback
);

// Facebook OAuth Routes
router.get("/facebook", facebook);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/auth/login" }),
  facebookCallback
);

export default router;
