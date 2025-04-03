// // src/middleware/auth.middleware.ts
// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { jwtSecret } from "../config";
// import { prisma } from "../config";
// import { generateJWT, generateTokens, verifyAccessToken, verifyRefreshToken } from "../helper/generateJWT";

// export interface AuthRequest extends Request {
//   user?: any;
// }

// export const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   // Try to get token from the Authorization header or cookie
//   const authHeader = req.headers.authorization || req.cookies?.accessToken;

//   // Support both "Bearer token" and cookie value
//   const accessToken = authHeader.startsWith("Bearer ")
//     ? authHeader.split(" ")[1]
//     : authHeader;

//   if (accessToken) {
//     try {
//       const decoded = verifyAccessToken(accessToken);
//       const user = await prisma.user.findUnique({
//         where: { id: decoded.userId },
//         select: { id: true, email: true, emailVerified: true },
//       });

//       if (!user || !user.emailVerified) {
//         res.status(403).json({ error: "Invalid or unverified account" });
//         return;
//       }

//       req.user = user;
//       res.locals.user = user; // Available in response chain
//       next();
//     } catch (error: any) {
//       if (error.name === "TokenExpiredError") {
//         // Trigger refresh flow
//         return refreshAndRetry(req, res, next);
//       }
//       // Other errors
//       res
//         .status(403)
//         .clearCookie("accessToken")
//         .json({ error: "Invalid token" });
//       return;
//     }
//   }
//   // 2. No access token
//   res.status(401).json({ error: "Authentication required" });
// };

// const refreshAndRetry = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) {
//      res.status(401).json({ error: "Authentication required" });
//      return;
//   }
//   try {
//     const decoded = verifyRefreshToken(refreshToken);
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//     });

//     if (!user || user.refreshToken !== refreshToken) {
//       throw new Error("Invalid refresh token");
//     }

//     // Generate new tokens
//     const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(
//       user.id
//     );

//     // 9. Set new tokens in cookies
//     res
//       .cookie("accessToken", newAccessToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 15 * 60 * 1000,
//       })
//       .cookie("refreshToken", newRefreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//       });

//     // 10. Attach user to request
//     req.user = { id: user.id, email: user.email, role: user };
//     // Update cookies
//     res.locals.newAccessToken = newAccessToken;
//     res.locals.newRefreshToken = newRefreshToken;

//     // Retry original request
//     req.cookies.accessToken = newAccessToken;

//     next();
//   } catch (error) {
//     res
//       .clearCookie("accessToken")
//       .clearCookie("refreshToken")
//       .status(401)
//       .json({ error: "Session expired - please login!" });
//   }
// };

// // Apply refreshed tokens to response
// export const applyRefreshedTokens = (
//   _req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (res.locals.newAccessToken) {
//     res
//       .cookie("accessToken", res.locals.newAccessToken)
//       .cookie("refreshToken", res.locals.newRefreshToken);
//   }
//   next();
// };

// // src/middleware/auth.middleware.ts
// import { Request, Response, NextFunction } from "express";
// import { prisma } from "../config";
// import {
//   generateTokens,
//   verifyAccessToken,
//   verifyRefreshToken,
//   setAuthCookies,
//   cookieConfig
// } from "../helper/generateJWT";

// export interface AuthRequest extends Request {
//   user?: any;
// }

// export const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const tokenSource = req.headers.authorization || req.cookies?.accessToken;
//   const accessToken = tokenSource?.startsWith("Bearer ")
//     ? tokenSource.split(" ")[1]
//     : tokenSource;

//   if (accessToken) {
//     try {
//       const decoded = verifyAccessToken(accessToken);
//       await validateUserSession(decoded.userId);
//       return proceedWithValidToken(decoded.userId, req, res, next);
//     } catch (error: any) {
//       if (error.name === "TokenExpiredError") {
//         return handleTokenExpiry(req, res, next);
//       }
//       return clearInvalidSession(res, "Invalid token");
//     }
//   }
//   return clearInvalidSession(res, "Authentication required");
// };

// const validateUserSession = async (userId: string) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: { id: true, emailVerified: true, refreshToken: true }
//   });

//   if (!user || !user.emailVerified) {
//     throw new Error("Invalid or unverified account");
//   }

//   return user;
// };

// const proceedWithValidToken = async (
//   userId: string,
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   req.user = { userId };
//   res.locals.user = { userId };

//   // Rotate refresh token periodically (every 24 hours)
//   const lastRefresh = res.locals.lastRefresh || 0;
//   if (Date.now() - lastRefresh > 24 * 60 * 60 * 1000) {
//     await rotateRefreshToken(userId, res);
//   }

//   next();
// };

// const rotateRefreshToken = async (userId: string, res: Response) => {
//   const { refreshToken } = await generateTokens(userId);
//   res.cookie("refreshToken", refreshToken, cookieConfig(true));
//   res.locals.lastRefresh = Date.now();
// };

// const handleTokenExpiry = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return clearInvalidSession(res, "Session expired");

//   try {
//     const decoded = verifyRefreshToken(refreshToken);
//     const user = await validateUserSession(decoded.userId);

//     if (user.refreshToken !== refreshToken) {
//       throw new Error("Invalid refresh token");
//     }

//     // Generate and set new tokens
//     const tokens = await generateTokens(user.id);
//     setAuthCookies(res, tokens);

//     // Update request with new token
//     req.cookies.accessToken = tokens.accessToken;
//     res.locals.user = { userId: user.id };

//     // Retry original request
//     next();
//   } catch (error) {
//     return clearInvalidSession(res, "Session expired - please login");
//   }
// };

// const clearInvalidSession = (res: Response, message: string) => {
//   res
//     .clearCookie("accessToken")
//     .clearCookie("refreshToken")
//     .status(401)
//     .json({ error: message });
// };

// // Apply token rotation to response
// export const applyRefreshedTokens = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (res.locals.newAccessToken) {
//     setAuthCookies(res, {
//       accessToken: res.locals.newAccessToken,
//       refreshToken: res.locals.newRefreshToken
//     });
//   }
//   next();
// };

// import { Request, Response, NextFunction } from "express";
// import { prisma } from "../config";
// import {
//   generateTokens,
//   verifyAccessToken,
//   verifyRefreshToken,
//   setAuthCookies,
//   cookieConfig,
// } from "../helper/generateJWT";

// export interface AuthRequest extends Request {
//   user?: any;
// }

// // Main middleware to authenticate access tokens
// const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   // Try to get token from the Authorization header or cookie
//   const tokenSource = req.headers.authorization || req.cookies?.accessToken;
//   const accessToken = tokenSource?.startsWith("Bearer ")
//     ? tokenSource.split(" ")[1]
//     : tokenSource;

//   if (accessToken) {
//     try {
//       const decoded = verifyAccessToken(accessToken);
//       await validateUserSession(decoded.userId);
//       return proceedWithValidToken(decoded.userId, req, res, next);
//     } catch (error: any) {
//       if (error.name === "TokenExpiredError") {
//         // ✅ Adjusted: Handle expired access token by using refresh token immediately
//         return handleTokenExpiry(req, res, next);
//       }
//       return clearInvalidSession(res, "Invalid token");
//     }
//   }
//   return clearInvalidSession(res, "Authentication required");
// };

// // Validate that the user exists and is verified
// const validateUserSession = async (userId: string) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: { id: true, emailVerified: true, refreshToken: true },
//   });
//   if (!user || !user.emailVerified) {
//     throw new Error("Invalid or unverified account");
//   }
//   return user;
// };

// // If token is valid, attach user info and rotate token if needed
// const proceedWithValidToken = async (
//   userId: string,
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   req.user = { userId };
//   res.locals.user = { userId };

//   // ✅ Adjusted: Rotate refresh token immediately on each valid request to minimize replay window.
//   const tokens = await generateTokens(userId);
//   setAuthCookies(res, tokens);

//   next();
// };

// // Handle expired access token by using the refresh token
// const handleTokenExpiry = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return clearInvalidSession(res, "Session expired");

//   try {
//     const decoded = verifyRefreshToken(refreshToken);
//     const user = await validateUserSession(decoded.userId);

//     // ✅ Adjusted: If the refresh token in DB doesn't match, reject the request
//     if (user.refreshToken !== refreshToken) {
//       throw new Error("Invalid refresh token");
//     }

//     // ✅ Adjusted: Invalidate the old refresh token immediately to prevent replay attacks
//     await prisma.user.update({
//       where: { id: user.id },
//       data: { refreshToken: null },
//     });

//     // Generate new tokens after invalidation
//     const tokens = await generateTokens(user.id);
//     setAuthCookies(res, tokens);

//     // Update request and response with new user info
//     req.cookies.accessToken = tokens.accessToken;
//     res.locals.user = { userId: user.id };

//     next();
//   } catch (error) {
//     return clearInvalidSession(res, "Session expired - please login!");
//   }
// };

// // Helper to clear cookies and respond with error message
// const clearInvalidSession = (res: Response, message: string) => {
//   res
//     .clearCookie("accessToken")
//     .clearCookie("refreshToken")
//     .status(401)
//     .json({ error: message });
// };

// // Optionally, apply refreshed tokens to response (if stored in res.locals)
// // Not strictly needed if setAuthCookies is always called above.
// export const applyRefreshedTokens = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (res.locals.newAccessToken) {
//     setAuthCookies(res, {
//       accessToken: res.locals.newAccessToken,
//       refreshToken: res.locals.newRefreshToken,
//     });
//   }
//   next();
// };

// export default  authenticateJWT ;

// const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     const accessToken = getAccessToken(req);
//     const refreshToken = req.cookies.refreshToken;

//     if (!accessToken && !refreshToken) {
//       return clearSession(res, "Authentication required");
//     }

//     // Valid access token present
//     if (accessToken) {
//       try {
//         const decoded = verifyAccessToken(accessToken);
//       const user = await validateUser(decoded.userId);

//         req.user = user;
//         return handleActiveSession(req, res, next, decoded.userId);
//       } catch (error: any) {
//         if (error.name !== "TokenExpiredError") throw error;
//       }
//     }

//     // Handle expired/missing access token but valid refresh token
//     if (refreshToken) {
//       const user = await handleRefreshTokenRotation(res, refreshToken);
//       req.user = user.user;
//       return handleActiveSession(req, res, next, user.user.id);
//     }

//     clearSession(res, "Session expired");
//   } catch (error) {
//     console.error("Authentication error:", error);
//     clearSession(res, "Invalid session");
//   }
// };

// const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const accessToken = getAccessToken(req);
//     const refreshToken = req.cookies.refreshToken;

//     // 1. Check for existing valid access token
//     if (accessToken) {
//       try {
//         const decoded = verifyAccessToken(accessToken);
//         const user = await validateUser(decoded.userId);
//         req.user = user;

//         // Renew tokens if needed before proceeding
//         await handleTokenRenewal(req, res, user.id);
//         return next();
//       } catch (error: any) {
//         if (error.name !== "TokenExpiredError") throw error;
//       }
//     }

//     // 2. Handle refresh token if access token is invalid/missing
//     if (refreshToken) {
//       try {
//         const { user, newTokens } = await renewSession(refreshToken);
//         req.user = user;

//         if (newTokens) {
//           setAuthCookies(res, newTokens);
//         }

//         return next();
//       } catch (error) {
//         clearSession(res, "Session expired");
//         return;
//       }
//     }

//     clearSession(res, "Authentication required");
//   } catch (error) {
//     console.error("Authentication error:", error);
//     clearSession(res, "Invalid session");
//   }
// };

// LAST CORRECT
// // auth.middleware.ts
// import { Request, Response, NextFunction } from "express";
// import { prisma } from "../config";
// import {
//   generateTokens,
//   verifyAccessToken,
//   verifyRefreshToken,
//   setAuthCookies,
//   shouldRotateRefreshToken,
// } from "../helper/generateJWT";

// export interface AuthRequest extends Request {
//   user?: any;
// }

// const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const accessToken = getAccessToken(req);
//     // Safely access refresh token with optional chaining
//     const refreshToken = req.cookies?.refreshToken;

//     // 1. Check for existing valid access token
//     if (accessToken) {
//       try {
//         const decoded = verifyAccessToken(accessToken);
//         const user = await validateUser(decoded.userId);
//         req.user = user;

//         // Renew tokens if needed before proceeding
//         await handleTokenRenewal(req, res, user.id);
//         return next();
//       } catch (error: any) {
//         if (error.name !== "TokenExpiredError") {
//           console.error("Access token validation error:", error);
//           throw error;
//         }
//       }
//     }

//     // 2. Handle refresh token if access token is invalid/missing
//     if (refreshToken) {
//       try {
//         const { user, newTokens } = await renewSession(refreshToken);
//         req.user = user;

//         if (newTokens) {
//           setAuthCookies(res, newTokens);
//         }

//         return next();
//       } catch (error) {
//         console.error("Refresh token validation error:", error);
//         clearSession(res, "Session expired");
//         return;
//       }
//     }

//     // If no valid tokens found
//     console.warn("No valid authentication tokens found");
//     clearSession(res, "Authentication required");
//   } catch (error) {
//     console.error("Authentication error:", error);
//     clearSession(res, "Invalid session");
//   }
// };

// const renewSession = async (refreshToken: string) => {
//   const decoded = verifyRefreshToken(refreshToken);
//   const user = await validateUser(decoded.userId);

//   // Verify refresh token matches database
//   if (user.refreshToken !== refreshToken) {
//     throw new Error("Invalid refresh token");
//   }

//   // Rotate refresh token if needed
//   if (shouldRotateRefreshToken(refreshToken)) {
//     const newTokens = await generateTokens(user.id);
//     return { user, newTokens };
//   }

//   return { user };
// };

// const handleTokenRenewal = async (
//   req: AuthRequest,
//   res: Response,
//   userId: string
// ) => {
//   const refreshToken = req.cookies.refreshToken;

//   if (refreshToken && shouldRotateRefreshToken(refreshToken)) {
//     const newTokens = await generateTokens(userId);
//     setAuthCookies(res, newTokens);
//     res.locals.newTokens = newTokens;
//   }
// };

// // const getAccessToken = (req: Request): string | null => {
// //   const authHeader = req.headers.authorization;
// //   return authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.cookies.accessToken;
// // };

// const getAccessToken = (req: Request): string | null => {
//   try {
//     // Safely access cookies with optional chaining
//     const cookies = req.cookies || {};
//     const authHeader = req.headers.authorization;

//     return authHeader?.startsWith("Bearer ")
//       ? authHeader.split(" ")[1]
//       : cookies.accessToken || null;
//   } catch (error) {
//     console.error("Error accessing cookies:", error);
//     return null;
//   }
// };

// const validateUser = async (userId: string) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       id: true,
//       email: true,
//       name: true,
//       refreshToken: true,
//       emailVerified: true,
//       policy: true,
//       isOnboarded: true,
//       userType: true,
//       createdAt: true,
//       updatedAt: true,
//       password: true
//     },
//   });

//   if (!user?.emailVerified) {
//     throw new Error("Unauthorized");
//   }
//   return user;
// };

// const handleActiveSession = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction,
//   userId: string
// ) => {
//   // Rotate tokens only if refresh token is nearing expiration
//   if (shouldRotateRefreshToken(req.cookies.refreshToken)) {
//     const tokens = await generateTokens(userId);
//     setAuthCookies(res, tokens);
//     res.locals.newTokens = tokens;
//   }

//   next();
// };

// const handleRefreshTokenRotation = async (res:Response, refreshToken: string) => {
//   const decoded = verifyRefreshToken(refreshToken);
//   const user = await validateUser(decoded.userId);

//   if (user.refreshToken !== refreshToken) {
//     throw new Error("Invalid refresh token");
//   }

//   // Only rotate refresh token if it's in the last 7 days of its lifespan
//   if (shouldRotateRefreshToken(refreshToken)) {
//     const tokens = await generateTokens(user.id);
//     setAuthCookies(res, tokens);
//     return { user: user, tokens };
//   }

//   // Return existing valid refresh token
//   return { user: user };
// };

// // Update clearSession to handle missing cookies
// const clearSession = (res: Response, message: string) => {
//   try {
//     res
//       .clearCookie("accessToken")
//       .clearCookie("refreshToken")
//       .status(401)
//       .json({ error: message });
//   } catch (clearError) {
//     console.error("Error clearing cookies:", clearError);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export default authenticateJWT;

// backend/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config";
import { refreshSession, verifyAccessToken } from "../helper/token";

export interface AuthRequest extends Request {
  user?: any;
}

const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip middleware for auth routes
    if (req.path.startsWith("/auth")) return next();

    // 1. Check access token first
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        req.user = await validateUser(decoded.userId);
        return next();
      } catch (accessError) {
        if ((accessError as jwt.JsonWebTokenError).name !== "TokenExpiredError")
          throw accessError;
      }
    }

    // 2. Attempt refresh token flow
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new Error("No authentication tokens found");

    // Verify refresh token and get new tokens
    const { user, newTokens } = await refreshSession(refreshToken);
    req.user = user;

    // Set new tokens in cookies
    res.cookie("accessToken", newTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    next();
  } catch (error) {
    // Clear invalid credentials
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(401).json({ error: "Authentication required" });
  }
};

async function validateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) throw new Error("User not found");
  return user;
}

export default authenticateJWT;

// server/middleware/auth.ts

// import { Request, Response, NextFunction } from "express";
// import { prisma } from "../config";
// import {
//   handleTokenRenewal,
//   clearSession,
//   getAccessToken,
//   renewSession,
//   updateUserLastActivity,
//   setAuthCookies,
//   verifyAccessToken,
// } from "../helper/generateJWT";

// // Extended Request interface with user property
// export interface AuthRequest extends Request {
//   user?: any;
// }

// /**
//  * Main authentication middleware
//  */
// const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const accessToken = getAccessToken(req);
//     const refreshToken = req.cookies?.refreshToken;

//     // 1. Check for existing valid access token
//     if (accessToken) {
//       try {
//         const decoded = verifyAccessToken(accessToken);
//         const user = await validateUser(decoded.userId);
//         req.user = user;

//         // Extend the session by updating the last activity timestamp
//         await updateUserLastActivity(user.id);

//         // Handle token renewal if needed before proceeding
//         await handleTokenRenewal(req, res, user.id);
//         return next();
//       } catch (error: any) {
//         if (error.name !== "TokenExpiredError") {
//           console.error("Access token validation error:", error);
//           throw error;
//         }
//         // Access token expired, will try refresh token
//       }
//     }

//     // 2. Handle refresh token if access token is invalid/missing
//     if (refreshToken) {
//       try {
//         const { user, newTokens } = await renewSession(refreshToken);
//         req.user = user;

//         if (newTokens) {
//           setAuthCookies(res, newTokens);
//         }

//         return next();
//       } catch (error: any) {
//         if (error.message === "Session expired due to inactivity") {
//           clearSession(
//             res,
//             "Your session expired due to inactivity. Please log in again."
//           );
//         } else {
//           console.error("Refresh token validation error:", error);
//           clearSession(res, "Session expired");
//         }
//         return;
//       }
//     }

//     // If no valid tokens found
//     console.warn("No valid authentication tokens found");
//     clearSession(res, "Authentication required");
//   } catch (error) {
//     console.error("Authentication error:", error);
//     clearSession(res, "Invalid session");
//   }
// };

// /**
//  * Validate user from database
//  */
// export const validateUser = async (userId: string) => {
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       id: true,
//       email: true,
//       name: true,
//       refreshToken: true,
//       emailVerified: true,
//       policy: true,
//       isOnboarded: true,
//       userType: true,
//       createdAt: true,
//       updatedAt: true,
//       lastActivity: true,
//     },
//   });

//   if (!user) {
//     throw new Error("User not found");
//   }

//   if (!user.emailVerified) {
//     throw new Error("Unauthorized");
//   }

//   return user;
// };

// export default authenticateJWT;
