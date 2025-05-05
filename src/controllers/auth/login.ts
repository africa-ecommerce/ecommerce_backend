import passport from "passport";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config";
import { sendVerificationMail } from "../../helper/sendVerificationMail";
import { generateTokens, setAuthCookies } from "../../helper/token";

export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err: any, user: Express.User) => {
      try {
        // 1. Handle authentication errors
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials!" });
        }

        // 2. Check email verification status
        if (!user.emailVerified) {
          const verification = await prisma.emailVerification.findUnique({
            where: { userId: user.id },
          });

          // Regenerate token if expired
          if (!verification || verification.expires < new Date()) {
            const newToken = uuidv4();
            const newExpires = new Date(Date.now() + 3600000);

            await prisma.emailVerification.upsert({
              where: { userId: user.id },
              create: {
                token: newToken,
                expires: newExpires,
                userId: user.id,
              },
              update: {
                token: newToken,
                expires: newExpires,
              },
            });

            await sendVerificationMail(user.email, newToken);
          } else {
            await sendVerificationMail(user.email, verification.token);
          }

          return res.status(403).json({ message: "Verification email sent!" });
        }

        // 3. Generate tokens and set authentication cookies
        const tokens = await generateTokens(user.id, user.isOnboarded, user.userType);
        setAuthCookies(res, tokens);

        // 4. Re-query the user and select only the required fields (omit password)
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            isOnboarded: true,
            userType: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // 5. Return a sanitized user object
        return res.status(200).json({
          message: "Login successful!",
          user: currentUser,
        });
      } catch (error) {
        next(error);
      }
    }
  )(req, res, next);
};
