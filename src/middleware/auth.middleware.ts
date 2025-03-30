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




import { Request, Response, NextFunction } from "express";
import { prisma } from "../config";
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  cookieConfig,
} from "../helper/generateJWT";

export interface AuthRequest extends Request {
  user?: any;
}

// Main middleware to authenticate access tokens
const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from the Authorization header or cookie
  const tokenSource = req.headers.authorization || req.cookies?.accessToken;
  const accessToken = tokenSource?.startsWith("Bearer ")
    ? tokenSource.split(" ")[1]
    : tokenSource;

  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      await validateUserSession(decoded.userId);
      return proceedWithValidToken(decoded.userId, req, res, next);
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        // ✅ Adjusted: Handle expired access token by using refresh token immediately
        return handleTokenExpiry(req, res, next);
      }
      return clearInvalidSession(res, "Invalid token");
    }
  }
  return clearInvalidSession(res, "Authentication required");
};

// Validate that the user exists and is verified
const validateUserSession = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true, refreshToken: true },
  });
  if (!user || !user.emailVerified) {
    throw new Error("Invalid or unverified account");
  }
  return user;
};

// If token is valid, attach user info and rotate token if needed
const proceedWithValidToken = async (
  userId: string,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  req.user = { userId };
  res.locals.user = { userId };

  // ✅ Adjusted: Rotate refresh token immediately on each valid request to minimize replay window.
  const tokens = await generateTokens(userId);
  setAuthCookies(res, tokens);

  next();
};

// Handle expired access token by using the refresh token
const handleTokenExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return clearInvalidSession(res, "Session expired");

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await validateUserSession(decoded.userId);

    // ✅ Adjusted: If the refresh token in DB doesn't match, reject the request
    if (user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    // ✅ Adjusted: Invalidate the old refresh token immediately to prevent replay attacks
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null },
    });

    // Generate new tokens after invalidation
    const tokens = await generateTokens(user.id);
    setAuthCookies(res, tokens);

    // Update request and response with new user info
    req.cookies.accessToken = tokens.accessToken;
    res.locals.user = { userId: user.id };

    next();
  } catch (error) {
    return clearInvalidSession(res, "Session expired - please login!");
  }
};

// Helper to clear cookies and respond with error message
const clearInvalidSession = (res: Response, message: string) => {
  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .status(401)
    .json({ error: message });
};

// Optionally, apply refreshed tokens to response (if stored in res.locals)
// Not strictly needed if setAuthCookies is always called above.
export const applyRefreshedTokens = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.locals.newAccessToken) {
    setAuthCookies(res, {
      accessToken: res.locals.newAccessToken,
      refreshToken: res.locals.newRefreshToken,
    });
  }
  next();
};

export default  authenticateJWT ;
