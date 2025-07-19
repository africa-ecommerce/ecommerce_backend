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
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: "Invalid refresh token!",
        code: "INVALID_REFRESH",
      });
      return;
    }

    // Set new tokens in cookies with proper configurations
    setAuthCookies(res, result.newTokens!);

    // Return success response with the tokens in the response body This allows the middleware to access them directly
    res.status(200).json({
      success: true,
      accessToken: result.newTokens!.accessToken,
      refreshToken: result.newTokens!.refreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    // More specific error handling
    if (error instanceof jwt.TokenExpiredError) {
      // Clear cookies on authentication failure
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: "Refresh token expired!",
        code: "TOKEN_EXPIRED",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Clear cookies on authentication failure
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: "Invalid refresh token!",
        code: "INVALID_TOKEN",
      });
    } else {
      next(error); // Pass other errors to the error handler
    }
  }
};
