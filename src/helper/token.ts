// generateJWT.ts
import jwt from "jsonwebtoken";
import { jwtSecret, refreshTokenSecret, prisma } from "../config";
import { Response } from "express";
import { Tokens } from "../types";
import { UserType } from "@prisma/client";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 60; // 15 mins (in seconds)
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 30 days (in seconds)
const REFRESH_TOKEN_ROTATION_WINDOW = 1 * 24 * 60 * 60; // 3 days before expiration

export const generateTokens = async (
  userId: string,
  isOnboarded: boolean,
  userType: UserType
): Promise<Tokens> => {
  const accessToken = jwt.sign(
    { userId, isOnboarded, userType },
    jwtSecret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    }
  );

  // Generate refresh token that can be renewed
  const refreshToken = jwt.sign(
    { userId, isOnboarded, userType },
    refreshTokenSecret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );

  // Update refresh token in database with new expiration
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};



export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, jwtSecret) as { userId: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshTokenSecret) as { userId: string };
};


export const shouldRotateRefreshToken = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded?.exp) return true;
    
    const expirationDate = decoded.exp * 1000;
    const now = Date.now();
    return (expirationDate - now) < (REFRESH_TOKEN_ROTATION_WINDOW * 1000);
  } catch {
    return true;
  }
};

// Cookie configuration
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  domain:
    process.env.NODE_ENV === "development"
      ? "localhost"
      : `${process.env.DOMAIN}`,
};


// export const cookieConfig = {
//   httpOnly: true,
//   secure: true, // Always true for Vercel deployments
//   sameSite: "none" as const, // Type assertion to fix the error
//   path: "/", // Ensure cookies are available across your entire app
// };

 export const refreshSession = async (refreshToken: string) => {
   try {
     // Verify refresh token
     const decoded = verifyRefreshToken(refreshToken);

     // Get user with refresh token
     const user = await prisma.user.findUnique({
       where: { id: decoded.userId },
       select: {
         id: true,
         email: true,
         name: true,
         refreshToken: true,
         emailVerified: true,
         policy: true,
         isOnboarded: true,
         userType: true,
         createdAt: true,
         updatedAt: true,
       },
     });

     // Instead of throwing, return a result object
     if (!user || user.refreshToken !== refreshToken) {
       return { success: false, error: "Invalid refresh token" };
     }

     // Generate new tokens
     const newTokens = await generateTokens(user.id, user.isOnboarded, user.userType);

     return { success: true, user, newTokens };
   } catch (error: any) {
     // Handle JWT verification errors
     return { success: false, error: error.message };
   }
 };


// export const setAuthCookies = (res: Response, tokens: Tokens) => {
//   res
//     .cookie("accessToken", tokens.accessToken, {
//       ...cookieConfig,
//       maxAge: ACCESS_TOKEN_EXPIRY * 1000,
//     })
//     .cookie("refreshToken", tokens.refreshToken, {
//       ...cookieConfig,
//       maxAge: REFRESH_TOKEN_EXPIRY * 1000,
//       path: "/auth/refresh",
//     });
// };



export const setAuthCookies = (res: Response, tokens: Tokens) => {
  res
    .cookie("accessToken", tokens.accessToken, {
      ...cookieConfig,
      maxAge: ACCESS_TOKEN_EXPIRY * 1000,
    })
    .cookie("refreshToken", tokens.refreshToken, {
      ...cookieConfig,
      maxAge: REFRESH_TOKEN_EXPIRY * 1000,
      path: "/auth/refresh", // Keep this specific path for refresh token
    });
};


