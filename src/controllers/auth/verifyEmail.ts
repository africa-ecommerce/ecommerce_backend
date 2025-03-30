import { Request, Response } from "express";
import {prisma, redisClient } from "../../config";
import { sendVerificationMail } from "../../helper/sendVeriificationMail";
import {CustomSession} from "./register"
import { v4 as uuidv4 } from "uuid";
import { generateTokens, setAuthCookies } from "../../helper/generateJWT";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";



// if url is from register redirect to login, if from login give jwt and redirect to default login url e.g dashboard
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, source } = req.body;
    if (!token) {
      res.status(401).json({ error: "Missing token!" });
      return;
    }
    if (typeof token !== "string") {
      res.status(401).json({ error: "Invalid token!" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        tokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: "Token is invalid or has expired!" });
      return;
    }

    // Update user as verified and clear token fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpires: null,
      },
    });

    // Cast session to custom session type
    const customSession = req.session as CustomSession;

    // Clear unverified email from the session
    customSession.unverifiedEmail = null;

    // Decide what to do based on the source query parameter

    // Decide redirect based on the 'source' parameter passed down in the verification email.
    // If the source is "register", redirect to login.
    // Otherwise, if source is a valid URL, redirect there; else, default to dashboard.
    let redirectUrl: string;
    if (source === "register") {
      redirectUrl = "/login";
      res.status(200).json({
        message: "Email verified! Redirecting to login.",
        redirectUrl,
      });
    } else {
      // For login flow: Generate JWT, set it in an HTTP-only cookie, and redirect 
      // if (source && typeof source === "string" && isValidCallbackUrl(source)) {
        redirectUrl = source;
      // } else {
      //   redirectUrl = "/dashboard";
      }

      const tokens = await generateTokens(user.id);
      setAuthCookies(res, tokens);
      res.status(200).json({
        message: "Email verified! Redirecting to dashboard.",
        redirectUrl, 
      });
    
  } catch (error: any) {
    console.error("Email verification error:", error);
     res.status(500).json({ error: "Internal server error!" });
     return;
  }
};




// IP-based rate limiter for verification email requests
export const resendVerificationLimiter = rateLimit({
  store: new RedisStore({
    // Use sendCommand to execute commands with your redis client.
    sendCommand: (...args: any[]) => redisClient.sendCommand(args),
  }),
  windowMs: 120 * 1000, // 2 minutes
  max: 3, // Maximum 3 requests per IP per window
  message: { error: "Too many requests, please try again later!" },
  keyGenerator: (req) => req.ip || "unknown", // Ensure a string is always returned
});


export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    // Get the email from the request body (or session if you prefer)
    const { email } = req.body;
    if (!email) {
       res.status(400).json({
        error: "No email provided. Please register again!",
      });
      return;
    }

    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
       res.status(404).json({ error: "User not found!" });
       return;
    }
    if (user.emailVerified) {
       res.status(409).json({ error: "Email already verified!" });
       return;
    }

    // Check if the verification token is still valid; if not, generate a new one
    let tokenToSend = user.verificationToken;
    if (!tokenToSend || (user.tokenExpires && user.tokenExpires < new Date())) {
      tokenToSend = uuidv4();
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: tokenToSend,
          tokenExpires,
        },
      });
    }

    // Send the verification email (the helper builds a URL including the token)
    await sendVerificationMail(email, tokenToSend, "register");

    // Return a generic success message
    res.status(200).json({ message: "Verification email resent!" });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
};
