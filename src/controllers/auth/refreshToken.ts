// import { NextFunction, Request, Response } from "express";
// import {
//   clearAuthCookies,
//   refreshSession,
//   setAuthCookies,
//   verifyRefreshToken,
// } from "../../helper/token";
// import jwt from "jsonwebtoken";
// import { prisma } from "../../config";

// export const refreshToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) {
//       res.status(401).json({
//         success: false,
//         error: "No refresh token!",
//         code: "REFRESH_TOKEN_MISSING",
//       });
//       return;
//     }

//     const result = await refreshSession(refreshToken);

//     if (!result.success) {
//       // Clear cookies on authentication failure
//       clearAuthCookies(res);
//       res.status(401).json({
//         success: false,
//         error: "Invalid refresh token!",
//         code: "INVALID_REFRESH",
//       });
//       return;
//     }

//     // Set new tokens in cookies with proper configurations
//     setAuthCookies(res, result.newTokens!);

//     // Return success response with the tokens in the response body This allows the middleware to access them directly
//     res.status(200).json({
//       success: true,
//       accessToken: result.newTokens!.accessToken,
//       refreshToken: result.newTokens!.refreshToken,
//     });
//   } catch (error) {
//     console.error("Refresh token error:", error);
//     // More specific error handling
//     if (error instanceof jwt.TokenExpiredError) {
//       // Clear cookies on authentication failure
//       clearAuthCookies(res);
//       res.status(401).json({
//         success: false,
//         error: "Refresh token expired!",
//         code: "TOKEN_EXPIRED",
//       });
//     } else if (error instanceof jwt.JsonWebTokenError) {
//       // Clear cookies on authentication failure
//       clearAuthCookies(res);
//       res.status(401).json({
//         success: false,
//         error: "Invalid refresh token!",
//         code: "INVALID_TOKEN",
//       });
//     } else {
//       next(error); // Pass other errors to the error handler
//     }
//   }
// };
// export const clearInvalidRefreshToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const refreshToken = req.cookies.refreshToken;

//   // ✅ Avoid verifying if refreshToken is missing or obviously invalid
//   if (!refreshToken || typeof refreshToken !== "string" || refreshToken.split(".").length !== 3) {
//     clearAuthCookies(res); // Clear just in case
//     return next();
//   }

//   try {
//     // Verify refresh token
//     const decoded = verifyRefreshToken(refreshToken);

//     // Get user with refresh token
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       select: {
//         refreshToken: true,
//       },
//     });

//     if (!user || user.refreshToken !== refreshToken) {
//       clearAuthCookies(res);
//     }

//     return next();
//   } catch (error) {
//     // Also clear cookies on verify failure
//     clearAuthCookies(res);
//     return next(); // Don't crash
//   }
// };

// import { NextFunction, Request, Response } from "express";
// import {
//   clearAuthCookies,
//   refreshSession,
//   setAuthCookies,
//   verifyRefreshToken,
// } from "../../helper/token";
// import jwt from "jsonwebtoken";
// import { prisma } from "../../config";

// export const refreshToken = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const refreshToken = req.cookies.refreshToken;

//   // ✅ Step 1: Check token exists and is a proper JWT
//   if (
//     !refreshToken ||
//     typeof refreshToken !== "string" ||
//     refreshToken.split(".").length !== 3
//   ) {
//     clearAuthCookies(res);
//     res.status(404).json({
//       success: false,
//       error: "No valid refresh token!",
//       code: "REFRESH_TOKEN_MISSING",
//     });
//     return;
//   }

//   try {
//     // ✅ Step 2: Verify refresh token signature & expiry
//     const decoded = verifyRefreshToken(refreshToken);

//     // ✅ Step 3: Cross-check DB to ensure this is the latest stored token
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       select: { refreshToken: true },
//     });

//     if (!user || user.refreshToken !== refreshToken) {
//       clearAuthCookies(res);

//       if (user?.refreshToken) {
//         const result = await refreshSession(user?.refreshToken);
//         if (!result.success || !result.newTokens) {
//           clearAuthCookies(res);
//           res.status(400).json({
//             success: false,
//             error: "Failed to refresh session!",
//             code: "REFRESH_FAILED",
//           });
//           return;
//         }

//         setAuthCookies(res, result.newTokens);

//         res.status(200).json({
//           success: true,
//           accessToken: result.newTokens.accessToken,
//           refreshToken: result.newTokens.refreshToken,
//         });
//         return;
//       }
//     }

//     // ✅ Step 4: Refresh session (handles rotation logic)
//     const result = await refreshSession(refreshToken);
//     if (!result.success || !result.newTokens) {
//       clearAuthCookies(res);
//       res.status(400).json({
//         success: false,
//         error: "Failed to refresh session!",
//         code: "REFRESH_FAILED",
//       });
//       return;
//     }

//     // ✅ Step 5: Set new cookies
//     setAuthCookies(res, result.newTokens);

//     // ✅ Step 6: Return tokens to client
//     res.status(200).json({
//       success: true,
//       accessToken: result.newTokens.accessToken,
//       refreshToken: result.newTokens.refreshToken,
//     });
//   } catch (error) {
//     console.error("Refresh token error:", error);

//     // ✅ Handle JWT-specific errors
//     if (error instanceof jwt.TokenExpiredError) {
//       clearAuthCookies(res);
//       res.status(500).json({
//         success: false,
//         error: "Refresh token expired!",
//         code: "TOKEN_EXPIRED",
//       });
//       return;
//     } else if (error instanceof jwt.JsonWebTokenError) {
//       clearAuthCookies(res);
//       res.status(500).json({
//         success: false,
//         error: "Invalid refresh token!",
//         code: "INVALID_TOKEN",
//       });
//       return;
//     }

//     // ✅ Catch-all
//     clearAuthCookies(res);
//     next(error);
//   }
// };



import { NextFunction, Request, Response } from "express";
import {
  clearAuthCookies,
  refreshSession,
  setAuthCookies,
} from "../../helper/token";
import jwt from "jsonwebtoken";

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Step 1: Validate cookie exists and looks like JWT
    if (!refreshToken || typeof refreshToken !== "string" || refreshToken.split(".").length !== 3) {
      clearAuthCookies(res);
       res.status(401).json({
        success: false,
        error: "No valid refresh token!",
        code: "REFRESH_TOKEN_MISSING",
      });
      return
    }

    // Step 2: Refresh session (allow DB fallback if cookie is stale)
    const result = await refreshSession(refreshToken, { allowDbTokenFallback: true });

    if (!result.success || !result.newTokens) {
      clearAuthCookies(res);
       res.status(401).json({
        success: false,
        error: result.error || "Failed to refresh session!",
        code: "REFRESH_FAILED",
      });
      return
    }

    // Step 3: Set new cookies for access & refresh tokens
    setAuthCookies(res, result.newTokens);

    // Step 4: Respond with new tokens
     res.status(200).json({
      success: true,
      accessToken: result.newTokens.accessToken,
      refreshToken: result.newTokens.refreshToken,
    });
    return;
  } catch (error: any) {
    console.error("Refresh token error:", error);

    // Step 5: Handle JWT-specific errors
    if (error instanceof jwt.TokenExpiredError) {
      clearAuthCookies(res);
       res.status(401).json({
        success: false,
        error: "Refresh token expired!",
        code: "TOKEN_EXPIRED",
      });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      clearAuthCookies(res);
       res.status(401).json({
        success: false,
        error: "Invalid refresh token!",
        code: "INVALID_TOKEN",
      });
      return;
    }

    // Step 6: Catch-all for unexpected errors
    clearAuthCookies(res);
    next(error);
  }
};
