import { Request, Response } from "express";
import {prisma, redisClient } from "../../config";
import { sendVerificationMail } from "../../helper/sendVeriificationMail";
import {CustomSession} from "./register"
import { v4 as uuidv4 } from "uuid";
import { generateJWT } from "../../helper/generateJWT";


// if url is from register redirect to login, if from login give jwt and redirect to default login url e.g dashboard
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, callbackUrl } = req.query;
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
       res
        .status(401)
        .json({ error: "Token is invalid or has expired!" });
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

    let redirectUrl;
    if (callbackUrl === "register") {
      // After registration, redirect to login page
        res.status(200).json({
         message: "Email verified! Redirecting to login."
        
       });
        redirectUrl = "/login";
      
     
    } else {
      // For login flow: Generate JWT, set it in an HTTP-only cookie, and redirect to dashboard
        redirectUrl = "/dashboard"
         generateJWT(user.id, res);
        res.status(200).json({
          message: "Email verified! Redirecting to dashboard.",
          redirectUrl //------> client handle redirect
        });
       
    }

   
  } catch (error: any) {
    console.error("Email verification error:", error);
     res.status(500).json({ error: "Internal server error!" });
     return;
  }
};



// Rate limiting constants
const RATE_LIMIT_MAX = 3; // Maximum allowed requests per window
const RATE_LIMIT_WINDOW = 120; // Window duration in seconds - 2 minutes

// Resend verification email endpoint with Redis-based rate limiting  -----> use express-rate-limit
export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    // Cast session to custom session type
    const customSession = req.session as CustomSession;

    // Get the unverified email from the session
    const email = customSession.unverifiedEmail;
    if (!email) {
       res
        .status(400)
        .json({
          error: "No email found. Please register again!",
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
       res.status(409).json({ error: "Email already registered!" });
       return;
    }

    // Check if the token is still valid; if not, generate a new one
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


    // Use a Redis key to track retry attempts for this user
    const redisKey = `resend:${user.id}`;
    let _r = await redisClient.get(redisKey);
    const attempt = _r ? parseInt(_r) : 0;
    if (attempt >= RATE_LIMIT_MAX) {
       res
        .status(429)
        .json({ error: "Too many requests. Please try again later!" });
        return;
    }

    // Increment the counter. If this is the first attempt, set the expiry.
    const newCount = await redisClient.incr(redisKey);
    if (newCount === 1) {
      await redisClient.expire(redisKey, RATE_LIMIT_WINDOW);
    }

    // Resend the verification email using the existing token
    await sendVerificationMail(email, tokenToSend, "register");

     res
      .status(200)
      .json({ message: "Verification email resent!" });
  
  } catch (error: any) {
    console.error("Resend verification error:", error);
     res.status(500).json({ error: "Internal server error!" });
     return;
  }
};
