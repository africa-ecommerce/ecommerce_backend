// import { Request, Response } from "express";
// import { refreshSession, setAuthCookies } from "../../helper/token";
// import jwt from "jsonwebtoken";
// export const refreshToken = async (req: Request, res: Response) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;

//     if (!refreshToken) {
//       res.status(401).json({
//         error: "No refresh token!",
//         code: "REFRESH_TOKEN_MISSING",
//       });
//       return;
//     }

//     const result = await refreshSession(refreshToken);

//     if (!result.success) {
//       res.status(401).json({
//         error: result.error,
//         code: "INVALID_REFRESH",
//       });

//       // Clear cookies on authentication failure
//       res.clearCookie("accessToken");
//       res.clearCookie("refreshToken");
//       return;
//     }

//     // Set new tokens in cookies
//     setAuthCookies(res, result.newTokens!);

//     res.status(200).json({ success: true });
//   } catch (error) {
//     // More specific error handling
//     if (error instanceof jwt.TokenExpiredError) {
//       res
//         .status(401)
//         .json({ error: "Refresh token expired!", code: "TOKEN_EXPIRED" });
//     } else if (error instanceof jwt.JsonWebTokenError) {
//       res
//         .status(401)
//         .json({ error: "Invalid refresh token!", code: "INVALID_TOKEN" });
//     } else {
//       console.error("Refresh failed:", error);
//       res.status(401).json({
//         error: "Authentication refresh failed!",
//         code: "REFRESH_FAILED",
//       });
//     }

//     // Clear invalid credentials
//     res.clearCookie("accessToken");
//     res.clearCookie("refreshToken");
//   }
// };




import { Request, Response } from "express";
import { clearAuthCookies, refreshSession, setAuthCookies } from "../../helper/token";
import jwt from "jsonwebtoken";

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
       res.status(401).json({
        error: "No refresh token!",
        code: "REFRESH_TOKEN_MISSING",
      });

      return;
    }

    const result = await refreshSession(refreshToken);

    if (!result.success) {
      // Clear cookies on authentication failure
      clearAuthCookies(res)

       res.status(401).json({
        error: result.error || "Invalid refresh token!",
        code: "INVALID_REFRESH",
      });

      return;
    }

    // Set new tokens in cookies with proper configurations
    setAuthCookies(res, result.newTokens!);

    // Return success response with the tokens in the response body
    // This allows the middleware to access them directly rather than relying on forwarding Set-Cookie headers
     res.status(200).json({
      accessToken: result.newTokens!.accessToken,
      refreshToken: result.newTokens!.refreshToken,
    });

    return
  } catch (error) {
    // More specific error handling
    if (error instanceof jwt.TokenExpiredError) {
      // Clear cookies on authentication failure
      clearAuthCookies(res);

      res.status(401).json({
        error: "Refresh token expired!",
        code: "TOKEN_EXPIRED",
      });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Clear cookies on authentication failure
      clearAuthCookies(res);

      res.status(401).json({
        error: "Invalid refresh token!",
        code: "INVALID_TOKEN",
      });
      return;
    } else {
      console.error("Refresh failed:", error);

       // Clear cookies on authentication failure
       clearAuthCookies(res)

       res.status(401).json({
        error: "Authentication refresh failed!",
        code: "REFRESH_FAILED",
      });
      return;
    }
  }
};