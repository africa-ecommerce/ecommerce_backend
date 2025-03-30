import passport from "passport";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config";
import { sendVerificationMail } from "../../helper/sendVerificationMail";
import { isValidCallbackUrl } from "../../helper/verifyCallbackUrl";
import { generateTokens, setAuthCookies } from "../../helper/generateJWT";

export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err: any, user: any) => {
      try {
        const { callbackUrl } = req.query;
        // 1. Handle authentication errors
        if (err) return next(err);
        if (!user) {
          res.status(401).json({ error: "Invalid credentials!" });
          return;
        }

        // Prepare the value to pass down.
        // If a valid callbackUrl is provided, pass that; otherwise, default to "login"
        const redirectUrl =
          callbackUrl &&
          typeof callbackUrl === "string" &&
          isValidCallbackUrl(callbackUrl)
            ? callbackUrl
            : "/dashboard";

             const decodedCallback = decodeURIComponent(redirectUrl);


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
          }

          await sendVerificationMail(user.email, tokenToSend);
          res.status(403).json({ message: "Verification email sent!" });
          return;
        }

        // Generate a JWT for the user
        const tokens = await generateTokens(user.id);
        setAuthCookies(res, tokens);

        // Redirect the user to the dashboard or another authenticated page
        res.status(200).json({
          message: "Login successful!",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          redirectUrl: decodedCallback,
        });

        // current user implementation set up current user  ----------->;
      } catch (error) {
        next(error);
      }
    }
  )(req, res, next);
};
