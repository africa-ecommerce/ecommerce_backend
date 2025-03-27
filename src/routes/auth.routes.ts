// src/routes/auth.routes.ts
import { Router } from "express";
import { register } from "../controllers/auth/register";
import express from "express";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationMail } from "../helper/sendVeriificationMail";
import {
  resendVerificationEmail,
  verifyEmail,
} from "../controllers/auth/verifyEmail";
import { prisma } from "../config";
import { generateJWT, generateTokens } from "../helper/generateJWT";
import { isValidCallbackUrl } from "../helper/verifyCallbackUrl";
import { authenticateJWT } from "../middleware/auth.middleware";
import jwt from "jsonwebtoken";
import { addToDenylist } from "../helper/addToDenyList";
import { getCurrentUser } from "../controllers/auth/currentUser";


const router = Router();



router.post("/register", register);


// Login route
router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, async (err:any, user:any) => {
    try {
      const { callbackUrl } = req.query;
      // 1. Handle authentication errors
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Invalid credentials!" });

      // 2. Check email verification status
      if (!user.emailVerified) {
        // Check if the token is still valid; if not, generate a new one
        let tokenToSend = user.verificationToken;
        if (
          !tokenToSend ||
          (user.tokenExpires && user.tokenExpires < new Date())
        ) {
          tokenToSend = uuidv4();
          const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              verificationToken: tokenToSend,
              tokenExpires,
            },
          });

          await sendVerificationMail(user.email, tokenToSend, "login");
          res.status(403).json({ message: "Verification email sent!" });
          return;
        }
      }

      // Determine the redirect URL: if provided and valid, use it; otherwise, use a default (e.g., /dashboard or may be onboarding)
      let redirectUrl = "/dashboard";
      if (
        callbackUrl &&
        typeof callbackUrl == "string" &&
        isValidCallbackUrl(callbackUrl)
      ) {
        redirectUrl = callbackUrl;
      }
      // Generate a JWT for the user
      generateJWT(user.id, res);

      // Redirect the user to the dashboard or another authenticated page
     return res.status(200).json({
        message: "Login successful!",
        user: { id: user.id, email: user.email, name: user.name, redirectUrl },
      });
      

      // current user implementation set up current user  ----------->;
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});
export default router;

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);






// Google OAuth Routes
router.get("/google", (req, res, next) => {
  const { callbackUrl } = req.query;
  
  // Validate and pass callback URL via state
  const state = callbackUrl && typeof callbackUrl === 'string' && isValidCallbackUrl(callbackUrl) 
    ? encodeURIComponent(callbackUrl)
    : encodeURIComponent("/dashboard");
  
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    state
  })(req, res, next);
});

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  (req, res) => {
    // Decode the state to get the original callback URL
    const redirectUrl = req.query.state 
      ? decodeURIComponent(req.query.state as string)
      : "/dashboard";

    // Redirect to the original intended URL or dashboard
    res.redirect(redirectUrl);
  }
);

// Facebook OAuth Routes
router.get("/facebook", (req, res, next) => {
  const { callbackUrl } = req.query;
  
  // Validate and pass callback URL via state
  const state = callbackUrl && typeof callbackUrl === 'string' && isValidCallbackUrl(callbackUrl) 
    ? encodeURIComponent(callbackUrl)
    : encodeURIComponent("/dashboard");
  
  passport.authenticate("facebook", { 
    scope: ["email"],
    state
  })(req, res, next);
});

router.get("/facebook/callback", 
  passport.authenticate("facebook", { failureRedirect: "/auth/login" }),
  (req, res) => {
    // Decode the state to get the original callback URL
    const redirectUrl = req.query.state 
      ? decodeURIComponent(req.query.state as string)
      : "/dashboard";

    // Redirect to the original intended URL or dashboard
    res.redirect(redirectUrl);
  }
);





// Update logout handler
router.post('/logout', authenticateJWT, async (req, res) => {
  const token = req.cookies.authToken;
  const decoded = jwt.decode(token) as { exp: number };
  
  await addToDenylist(token, decoded.exp * 1000);
  
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json({ message: "Logged out successfully" });
});

router.get("/current-user", authenticateJWT, getCurrentUser);
























// // Google OAuth Routes
// router.get("/google", 
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// router.get("/google/callback", 
//   passport.authenticate('google', { 
//     failureRedirect: '/login',
//     session: false 
//   }),
//   (req, res) => {
//     const { callbackUrl } = req.query;
//     // Generate tokens for Google OAuth login
//     const user = req.user;

//     // Determine the redirect URL: if provided and valid, use it; otherwise, use a default (e.g., /dashboard or may be onboarding)
//     let redirectUrl = "/dashboard";
//     if (
//       callbackUrl &&
//       typeof callbackUrl == "string" &&
//       isValidCallbackUrl(callbackUrl)
//     ) {
//       redirectUrl = callbackUrl;
//     }
//     generateJWT(user?.id, res, redirectUrl);
//     res.redirect("/dashboard");
//   }
// );

