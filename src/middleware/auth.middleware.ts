

// import { Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { prisma } from "../config";
// import { refreshSession, setAuthCookies, verifyAccessToken } from "../helper/token";
// import { AuthRequest } from "../types";


// const authenticateJWT = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Skip middleware for auth routes
//     if (req.path.startsWith("/auth")) return next();

//     // 1. Check access token first
//     const accessToken = req.cookies.accessToken;
//     if (accessToken) {
//       try {
//         const decoded = verifyAccessToken(accessToken);
//         req.user = await validateUser(decoded.userId);
//         return next();
//       } catch (accessError) {
//         if ((accessError as jwt.JsonWebTokenError).name !== "TokenExpiredError")
//           throw accessError;
//       }
//     }

//     // 2. Attempt refresh token flow
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) throw new Error("No authentication tokens found");

//     // Verify refresh token and get new tokens
//     const { user, newTokens } = await refreshSession(refreshToken);
//     req.user = user;

//     // Set new tokens in cookies
//     setAuthCookies(res, newTokens);

//     next();
//   } catch (error) {
//     // More specific error handling
//     if (error instanceof jwt.TokenExpiredError) {
//       res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
//     } else if (error instanceof jwt.JsonWebTokenError) {
//       res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
//     } else {
//       console.error("Authentication error:", error);
//       res
//         .status(401)
//         .json({ error: "Authentication required", code: "AUTH_REQUIRED" });
//     }

//     // Clear invalid credentials
//     res.clearCookie("accessToken");
//     res.clearCookie("refreshToken");
//   }
// };



// async function validateUser(userId: string) {
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
//     },
//   });

//   if (!user) throw new Error("User not found");
//   return user;
// }

// export default authenticateJWT;



import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config";
import { refreshSession, setAuthCookies, verifyAccessToken } from "../helper/token";
import { AuthRequest } from "../types";

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
    if (!refreshToken) {
      res.status(401).json({
        error: "No authentication tokens found",
      });

      // Clear invalid credentials
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return; //
    } 

    // Get result from refresh session
    const result = await refreshSession(refreshToken);
    
    // Handle failed refresh
    if (!result.success) {
      
      res.status(401).json({
        error: "Refresh failed"
      });

      // Clear invalid credentials
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return; //
    }
    
    // At this point we have a successful refresh
    req.user = result.user;

    // Set new tokens in cookies
    setAuthCookies(res, result.newTokens!);

    next();
  } catch (error) {
    // More specific error handling
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      console.error("Authentication error:", error);
      res
        .status(401)
        .json({ error: "Authentication required"});
    }

    // Clear invalid credentials
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
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