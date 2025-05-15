import { Request, Response } from "express";
import { clearAuthCookies, refreshSession, setAuthCookies } from "../../helper/token";
import jwt from "jsonwebtoken";

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
       res.status(401).json({
         success: false,
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
         success: false,
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
      success: true,
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
        success: false,
        error: "Refresh token expired!",
        code: "TOKEN_EXPIRED",
      });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Clear cookies on authentication failure
      clearAuthCookies(res);

      res.status(401).json({
        success: false,
        error: "Invalid refresh token!",
        code: "INVALID_TOKEN",
      });
      return;
    } else {
      console.error("Refresh failed:", error);

       // Clear cookies on authentication failure
       clearAuthCookies(res)

       res.status(401).json({
         success: false,
         error: "Authentication refresh failed!",
         code: "REFRESH_FAILED",
       });
      return;
    }
  }
};