import { Router } from "express";
import { register } from "../controllers/auth/register";
import passport from "passport";
import {
  resendVerificationEmail,
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
import { google, googleCallback } from "../controllers/auth/oauth";

import { resendNewPasswordMail } from "../controllers/auth/forgotPassword";
import { refreshToken } from "../controllers/auth/refreshToken";
import { updateProfile } from "../controllers/auth/updateProfile";
import { updatePassword } from "../controllers/auth/updatePassword";
import { frontendUrl } from "../config";

const router = Router();

//endpoint to register user
router.post("/register", register);

//endpoint to login user
router.post("/login", login);

// endpoint to logout user
router.post("/logout", authenticateJWT, logout);

// endpoint to reset password
router.post("/reset-password", newPassword);

// endpoint to update password
router.post("/update-password", authenticateJWT, updatePassword);

// endpoint to send new password mail
router.post("/forgot-password", sendNewPasswordMail);

// endpoint to update profile
router.post("/update-profile", authenticateJWT, updateProfile);

// endpoint to verify email
router.post("/verify-email", verifyEmail);

// endpoint to resend verification email
router.post("/resend-verification-email", resendVerificationEmail);

// endpoint to resend new password mail
router.post("/resend-password-email", resendNewPasswordMail);

// Refresh token endpoint (already handled in middleware)
router.post("/refresh", refreshToken);

// endpoint to get current user
router.get("/current-user", authenticateJWT, getCurrentUser);

// This route initiates the Google OAuth process
router.get("/google", google);

// This route handles the callback from Google after user authentication
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${frontendUrl}/auth/login`,
  }),
  googleCallback
);

export default router;
