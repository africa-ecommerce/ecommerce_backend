import jwt from "jsonwebtoken";
import { jwtSecret, refreshTokenSecret, prisma } from "../config";
import { Response } from "express";
import { Tokens } from "../types";
import { UserType } from "@prisma/client";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 mins (in seconds)
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days (in seconds)
const REFRESH_TOKEN_ROTATION_WINDOW = 1 * 24 * 60 * 60; // 1 day before expiration

export const generateTokens = async (
  userId: string,
  isOnboarded: boolean,
  userType: UserType
): Promise<Tokens> => {
  // Always generate new access token
  const accessToken = jwt.sign({ userId, isOnboarded, userType }, jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY, 
  });

  // Get existing refresh token from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { refreshToken: true },
  });

  let refreshToken: string;
  let shouldUpdateDatabase = true;

  // If user has an existing refresh token, check if we should rotate it
  if (user?.refreshToken) {
    const shouldRotate = shouldRotateRefreshToken(user.refreshToken);

    if (shouldRotate) {
      // Generate new refresh token
      refreshToken = jwt.sign(
        { userId, isOnboarded, userType },
        refreshTokenSecret,
        {
          expiresIn: REFRESH_TOKEN_EXPIRY,
        }
      );
    } else {
      // Keep existing refresh token
      refreshToken = user.refreshToken;
      shouldUpdateDatabase = false; // No need to update DB
    }
  } else {
    // No existing token, generate new one (for login, registration, etc.)
    refreshToken = jwt.sign(
      { userId, isOnboarded, userType },
      refreshTokenSecret,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      }
    );
  }

  // Update database only if we generated a new refresh token
  if (shouldUpdateDatabase) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  return { accessToken, refreshToken };
};


export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, jwtSecret)  as { userId: string};
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshTokenSecret)  as { userId: string};
};


const shouldRotateRefreshToken = (token: string): boolean => {
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
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const) // Required for cross-subdomain cookies
      : ("lax" as const),
  path: "/",
  ...(process.env.NODE_ENV === "production" && { domain: process.env.DOMAIN }),
};

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
         isOnboarded: true,
         userType: true,
         createdAt: true,
         updatedAt: true,
       },
     });

     // Instead of throwing, return a result object
     if (!user || user.refreshToken !== refreshToken) {
       return { success: false, error: "Invalid refresh token!" };
     }

     // Generate new tokens
     const newTokens = await generateTokens(
       user.id,
       user.isOnboarded,
       user.userType
     );

    
     
     return {
       success: true,
       user,
       newTokens,
     };
   } catch (error: any) {
     // Handle JWT verification errors
     return { success: false, error: error.message };
   }
 };



export const setAuthCookies = (res: Response, tokens: Tokens) => {
  res
    .cookie("accessToken", tokens.accessToken, {
      ...cookieConfig,
      maxAge: ACCESS_TOKEN_EXPIRY * 1000,
    })
    .cookie("refreshToken", tokens.refreshToken, {
      ...cookieConfig,
      maxAge: REFRESH_TOKEN_EXPIRY * 1000,
      
    });
};


//  Helper method to clear auth cookies
export const clearAuthCookies = (res: Response) => {
  res
    .clearCookie("accessToken", cookieConfig)
    .clearCookie("refreshToken", cookieConfig);
};


