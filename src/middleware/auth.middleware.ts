// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config";
import { prisma } from "../config";
import { generateJWT, generateTokens, verifyAccessToken, verifyRefreshToken } from "../helper/generateJWT";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from the Authorization header or cookie
  const authHeader = req.headers.authorization || req.cookies?.accessToken;

  // Support both "Bearer token" and cookie value
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, emailVerified: true, role: true },
      });

      if (!user || !user.emailVerified) {
        res.status(403).json({ error: "Invalid or unverified account" });
        return;
      }

      req.user = user;
      res.locals.user = user; // Available in response chain
      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        // Trigger refresh flow
        return refreshAndRetry(req, res, next);
      }
      // Other errors
      res
        .status(403)
        .clearCookie("accessToken")
        .json({ error: "Invalid token" });
      return;
    }
  }
  // 2. No access token
  res.status(401).json({ error: "Authentication required" });
};

const refreshAndRetry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
     res.status(401).json({ error: "Authentication required" });
     return;
  }
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateTokens(
      user.id
    );

    // 9. Set new tokens in cookies
    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    // 10. Attach user to request
    req.user = { id: user.id, email: user.email, role: user.role };
    // Update cookies
    res.locals.newAccessToken = newAccessToken;
    res.locals.newRefreshToken = newRefreshToken;

    // Retry original request
    req.cookies.accessToken = newAccessToken;

    next();
  } catch (error) {
    res
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .status(401)
      .json({ error: "Session expired - please login" });
  }
};

// Apply refreshed tokens to response
export const applyRefreshedTokens = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.locals.newAccessToken) {
    res
      .cookie("accessToken", res.locals.newAccessToken)
      .cookie("refreshToken", res.locals.newRefreshToken);
  }
  next();
};