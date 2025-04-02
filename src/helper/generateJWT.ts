// generateJWT.ts
import jwt from "jsonwebtoken";
import { jwtSecret, refreshTokenSecret, prisma } from "../config";
import { Response } from "express";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// // Token expiration times
// const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
// const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days
// const REFRESH_TOKEN_ROTATION_WINDOW = 7 * 24 * 60 * 60; // 7 days

// export const generateTokens = async (userId: string): Promise<Tokens> => {
//   const accessToken = jwt.sign({ userId }, jwtSecret, {
//     expiresIn: ACCESS_TOKEN_EXPIRY,
//   });
//   const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
//     expiresIn: REFRESH_TOKEN_EXPIRY,
//   });

//   await prisma.user.update({
//     where: { id: userId },
//     data: { refreshToken },
//   });

//   return { accessToken, refreshToken };
// };

// export const verifyAccessToken = (token: string) => {
//   return jwt.verify(token, jwtSecret) as { userId: string };
// };

// export const verifyRefreshToken = (token: string) => {
//   return jwt.verify(token, refreshTokenSecret) as { userId: string };
// };

// export const shouldRotateRefreshToken = (token: string): boolean => {
//   try {
//     const decoded = jwt.decode(token) as { exp?: number };
//     if (!decoded?.exp) return true;

//     const expirationDate = new Date(decoded.exp * 1000);
//     const rotationThreshold = new Date(
//       Date.now() + REFRESH_TOKEN_ROTATION_WINDOW * 1000
//     );
//     return expirationDate < rotationThreshold;
//   } catch {
//     return true;
//   }
// };




// Token expiration times
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes (in seconds)
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days (in seconds)
const REFRESH_TOKEN_ROTATION_WINDOW = 3 * 24 * 60 * 60; // 3 days before expiration

export const generateTokens = async (userId: string): Promise<Tokens> => {
  const accessToken = jwt.sign({ userId }, jwtSecret, { 
    expiresIn: ACCESS_TOKEN_EXPIRY 
  });
  
  // Generate refresh token that can be renewed
  const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });

  // Update refresh token in database with new expiration
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken }
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
    process.env.NODE_ENV === "development" ? "localhost" : ".yourdomain.com",
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
      path: "/auth/refresh",
    });
};