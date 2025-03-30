// import jwt from "jsonwebtoken";
// import { jwtSecret, refreshTokenSecret, prisma } from "../config";
// import { Response } from "express";



// // auth.controller.ts
// export const generateJWT = async (
//   userId: string,
//   res: Response
// ) => {
//   // Access Token (15min)
//   const accessToken = jwt.sign({ id: userId }, jwtSecret!, {
//     expiresIn: "15m",
//   });

//   // Refresh Token (7 days)
//   const refreshToken = jwt.sign({ id: userId }, refreshTokenSecret, {
//     expiresIn: "7d",
//   });

//   // Store refresh token in database
//   await prisma.user.update({
//     where: { id: userId },
//     data: { refreshToken },
//   });

//   // Set HTTP-only cookies
//   res
//     .cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 15 * 60 * 1000, // 15min
//     })
//     .cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     })
   
// };


// export const verifyAccessToken = (token: string) => {
//   return jwt.verify(token, jwtSecret) as { userId: string };
// };

// export const verifyRefreshToken = (token: string) => {
//   return jwt.verify(token, refreshTokenSecret) as { userId: string };
// }




// interface Tokens {
//   accessToken: string;
//   refreshToken: string;
// }

// export const generateTokens = async (userId: string): Promise<Tokens> => {
//   // Access Token (15 minutes)
//   const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: "15m" });

//   // Refresh Token (7 days)
//   const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
//     expiresIn: "7d",
//   });

//   // Store refresh token in database
//   await prisma.user.update({
//     where: { id: userId },
//     data: { refreshToken },
//   });


  

//   return { accessToken, refreshToken };
// };














// // src/helper/generateJWT.ts
// import jwt from "jsonwebtoken";
// import { jwtSecret, refreshTokenSecret, prisma } from "../config";
// import { Response } from "express";

// interface Tokens {
//   accessToken: string;
//   refreshToken: string;
// }

// // Token expiration times in seconds
// const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
// const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days

// export const generateTokens = async (userId: string): Promise<Tokens> => {
//   // Access Token
//   const accessToken = jwt.sign({ userId }, jwtSecret, { 
//     expiresIn: ACCESS_TOKEN_EXPIRY 
//   });

//   // Refresh Token (long-lived with rotation)
//   const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
//     expiresIn: REFRESH_TOKEN_EXPIRY
//   });

//   // Update user with new refresh token
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

// // Cookie configuration
// export const cookieConfig = (isRefreshToken = false) => ({
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax" as const,
//   domain: process.env.NODE_ENV === "development" 
//     ? "localhost" 
//     : ".yourdomain.com",
//   maxAge: isRefreshToken 
//     ? REFRESH_TOKEN_EXPIRY * 1000 
//     : ACCESS_TOKEN_EXPIRY * 1000
// });

// export const setAuthCookies = (res: Response, tokens: Tokens) => {
//   res
//     .cookie("accessToken", tokens.accessToken, cookieConfig())
//     .cookie("refreshToken", tokens.refreshToken, cookieConfig(true));
// };



import jwt from "jsonwebtoken";
import { jwtSecret, refreshTokenSecret, prisma } from "../config";
import { Response } from "express";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes (in seconds)
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days (in seconds)

// Generate new tokens and update the user's refresh token in DB
export const generateTokens = async (userId: string): Promise<Tokens> => {
  // Generate access token
  const accessToken = jwt.sign({ userId }, jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  // Generate refresh token
  const refreshToken = jwt.sign({ userId }, refreshTokenSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  // Save the new refresh token in the database
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

// Cookie configuration for tokens
export const cookieConfig = (isRefreshToken = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  domain:
    process.env.NODE_ENV === "development" ? "localhost" : ".yourdomain.com",
  maxAge: isRefreshToken
    ? REFRESH_TOKEN_EXPIRY * 1000
    : ACCESS_TOKEN_EXPIRY * 1000,
});

// Set authentication cookies with the generated tokens
export const setAuthCookies = (res: Response, tokens: Tokens) => {
  res
    .cookie("accessToken", tokens.accessToken, cookieConfig())
    .cookie("refreshToken", tokens.refreshToken, cookieConfig(true));
};
