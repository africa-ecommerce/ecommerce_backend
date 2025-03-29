import passport from "passport";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config";
import { sendVerificationMail } from "../../helper/sendVeriificationMail";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { generateJWT } from "../../helper/generateJWT";



export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err: any, user: any) => {
      try {
        const { callbackUrl } = req.query;
        // 1. Handle authentication errors
        if (err) return next(err);
        if (!user){
           res.status(401).json({ error: "Invalid credentials!" });
        return;
        }

        // 2. Check email verification status
        if (!user.emailVerified) {
          // Prepare the value to pass down.
          // If a valid callbackUrl is provided, pass that; otherwise, default to "login"
          const sourceParam =
            callbackUrl &&
            typeof callbackUrl === "string" &&
            isValidCallbackUrl(callbackUrl)
              ? callbackUrl
              : "/dashboard";
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

            await sendVerificationMail(user.email, tokenToSend, sourceParam);
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
         res.status(200).json({
          message: "Login successful!",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            redirectUrl,
          },
        });

        // current user implementation set up current user  ----------->;
      } catch (error) {
        next(error);
      }
    }
  )(req, res, next);
};